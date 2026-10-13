/**
 * IEEE Qassim Platform Opaque-Box Domain Client & Service Engine
 * Faithfully implements all platform business logic, validation rules, state machines,
 * security boundaries, and data transformations from PROJECT.md and Cloud Functions.
 */

import { MemoryDatabase, FieldValue } from './database.ts';
import { createCheckInToken, verifyCheckInToken, hashCertificate } from './crypto.ts';

export type UserRole = 'student' | 'event_organizer' | 'super_admin';
export type EventType = 'Workshop' | 'Camp' | 'Lecture' | 'Competition' | 'Meetup' | 'Challenge' | 'Other';
export type EventState = 'Draft' | 'Published' | 'Registration Open' | 'Registration Closed' | 'Ongoing' | 'Completed' | 'Archived';
export type RegistrationMode = 'Auto' | 'Manual';
export type RegistrationStatus = 'approved' | 'pending' | 'waitlisted' | 'cancelled';
export type CertificateState = 'Not Issued' | 'Generating' | 'Available' | 'Failed' | 'Revoked';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  department?: string;
  universityId?: string;
  totalPoints: number;
  badges: string[];
  createdAt: Date;
}

export interface PlatformEventData {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  coverUrl?: string;
  type: EventType;
  date: Date;
  location: string;
  locationEn: string;
  durationHours: number;
  gains: string[];
  gainsEn: string[];
  speakers: string[];
  capacity: number;
  registeredCount: number;
  points: number;
  hasCertificate: boolean;
  state: EventState;
  registrationMode: RegistrationMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationRecord {
  id: string;
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  timestamp: Date;
  cancelledAt?: Date;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  eventId: string;
  timestamp: Date;
  verifiedByQR: boolean;
  tokenNonce?: string;
  manualOverride?: boolean;
  overriddenBy?: string;
}

export interface PointTransactionRecord {
  id: string;
  userId: string;
  amount: number;
  source: 'attendance' | 'attendance_override' | 'manual_adjustment';
  reason: string;
  sourceEventId?: string;
  createdBy: string;
  createdAt: Date;
}

export interface CertificateRecord {
  id: string;
  eventId: string;
  userId: string;
  status: CertificateState;
  storagePath: string;
  studentName: string;
  eventTitle: string;
  eventType: EventType;
  attendanceDate: Date;
  issueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  attemptCount: number;
  lastError?: string;
  issuedBy: string;
  revokedBy?: string;
  revokedAt?: Date;
  revocationReason?: string;
  verificationHash?: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  type: 'attendance_count' | 'points_threshold';
  threshold: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'ieee_starter',
    title: 'IEEE Starter',
    titleAr: 'عضو مبتدئ',
    description: 'Attended your first IEEE community event',
    type: 'attendance_count',
    threshold: 1,
  },
  {
    id: 'active_engineer',
    title: 'Active Engineer',
    titleAr: 'مهندس نشط',
    description: 'Attended 3 engineering events',
    type: 'attendance_count',
    threshold: 3,
  },
  {
    id: 'tech_pioneer',
    title: 'Tech Pioneer',
    titleAr: 'رائد تقني',
    description: 'Attended 5 engineering events',
    type: 'attendance_count',
    threshold: 5,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    titleAr: 'نادي المئة',
    description: 'Accumulated 100 platform activity points',
    type: 'points_threshold',
    threshold: 100,
  },
  {
    id: 'engineering_leader',
    title: 'Engineering Leader',
    titleAr: 'قائد هندسي',
    description: 'Accumulated 250 platform activity points',
    type: 'points_threshold',
    threshold: 250,
  },
];

export class IEEEPlatformClient {
  public db: MemoryDatabase;

  constructor() {
    this.db = new MemoryDatabase();
  }

  // ==========================================
  // AUTH & USER DOMAIN
  // ==========================================

  async createUser(data: {
    uid: string;
    displayName: string;
    email: string;
    role?: UserRole;
    department?: string;
    universityId?: string;
  }): Promise<UserProfile> {
    const userRef = this.db.collection('users').doc(data.uid);
    const existing = (await userRef.get()).data();
    if (existing) {
      throw new Error(`User with uid ${data.uid} already exists.`);
    }

    const profile: UserProfile = {
      uid: data.uid,
      displayName: data.displayName || 'طالب',
      email: data.email,
      role: data.role || 'student',
      department: data.department,
      universityId: data.universityId,
      totalPoints: 0,
      badges: [],
      createdAt: new Date(),
    };

    await this.db.runTransaction(async (tx) => {
      tx.set(userRef, profile);
    });

    return profile;
  }

  async getUser(uid: string): Promise<UserProfile | null> {
    const snap = await this.db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as UserProfile;
  }

  async getPublicProfile(uid: string): Promise<{
    id: string;
    displayName: string;
    totalPoints: number;
    badges: string[];
    department?: string;
  } | null> {
    const user = await this.getUser(uid);
    if (!user) return null;
    return {
      id: user.uid,
      displayName: user.displayName,
      totalPoints: user.totalPoints,
      badges: user.badges,
      department: user.department,
    };
  }

  async updateUserProfile(
    actorUid: string,
    targetUid: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const actor = await this.getUser(actorUid);
    if (!actor) throw new Error('Unauthenticated');

    const isSuperAdmin = actor.role === 'super_admin';
    const isOwner = actor.uid === targetUid;

    if (!isOwner && !isSuperAdmin) {
      throw new Error('Permission denied: cannot update another user profile.');
    }

    // Enforce firestore.rules: students cannot alter role or totalPoints
    if (!isSuperAdmin) {
      if ('role' in updates || 'totalPoints' in updates) {
        throw new Error('Permission denied: cannot modify role or totalPoints directly.');
      }
    }

    const userRef = this.db.collection('users').doc(targetUid);
    await this.db.runTransaction(async (tx) => {
      tx.update(userRef, updates);
    });

    return (await this.getUser(targetUid))!;
  }

  // ==========================================
  // EVENT MANAGEMENT & DISCOVERY DOMAIN
  // ==========================================

  async createEvent(
    actorUid: string,
    eventData: Omit<PlatformEventData, 'id' | 'registeredCount' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<PlatformEventData> {
    const actor = await this.getUser(actorUid);
    if (!actor || (actor.role !== 'event_organizer' && actor.role !== 'super_admin')) {
      throw new Error('Permission denied: Only organizers or super admins can create events.');
    }

    const eventId = eventData.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const fullEvent: PlatformEventData = {
      ...eventData,
      id: eventId,
      registeredCount: 0,
      attendanceCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.runTransaction(async (tx) => {
      tx.set(this.db.collection('events').doc(eventId), fullEvent);
    });

    return fullEvent;
  }

  async updateEventState(actorUid: string, eventId: string, newState: EventState): Promise<void> {
    const actor = await this.getUser(actorUid);
    if (!actor || (actor.role !== 'event_organizer' && actor.role !== 'super_admin')) {
      throw new Error('Permission denied: Only organizers can update event state.');
    }

    await this.db.runTransaction(async (tx) => {
      const eventRef = this.db.collection('events').doc(eventId);
      const snap = await tx.get(eventRef);
      if (!snap.exists) throw new Error('Event not found.');
      tx.update(eventRef, { state: newState, updatedAt: new Date() });
    });
  }

  async listEvents(options?: {
    actorUid?: string;
    type?: EventType;
    status?: EventState;
    search?: string;
    sortBy?: 'date' | 'points' | 'capacity' | 'title';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ events: PlatformEventData[]; totalCount: number }> {
    let actor: UserProfile | null = null;
    if (options?.actorUid) {
      actor = await this.getUser(options.actorUid);
    }
    const isOrganizer = actor?.role === 'event_organizer' || actor?.role === 'super_admin';

    const rawDocs = this.db._getAllRaw('events');
    let items = Object.values(rawDocs) as PlatformEventData[];

    // Visibility Rule: 'Draft' events are hidden from normal students/public
    if (!isOrganizer) {
      items = items.filter((e) => e.state !== 'Draft');
    }

    // Filter by type
    if (options?.type) {
      items = items.filter((e) => e.type === options.type);
    }

    // Filter by status
    if (options?.status) {
      items = items.filter((e) => e.state === options.status);
    }

    // Keyword Search (Arabic & English title and description)
    if (options?.search && options.search.trim() !== '') {
      const q = options.search.trim().toLowerCase();
      items = items.filter((e) => {
        const titleAr = (e.title || '').toLowerCase();
        const titleEn = (e.titleEn || '').toLowerCase();
        const descAr = (e.description || '').toLowerCase();
        const descEn = (e.descriptionEn || '').toLowerCase();
        return (
          titleAr.includes(q) ||
          titleEn.includes(q) ||
          descAr.includes(q) ||
          descEn.includes(q)
        );
      });
    }

    const totalCount = items.length;

    // Sorting
    const sortBy = options?.sortBy || 'date';
    const sortOrder = options?.sortOrder || 'desc';
    items.sort((a, b) => {
      let valA: string | number | Date = a[sortBy];
      let valB: string | number | Date = b[sortBy];

      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const offset = options?.offset || 0;
    if (offset > 0) {
      items = items.slice(offset);
    }
    if (options?.limit !== undefined && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return { events: items, totalCount };
  }

  async getEventDetails(eventId: string, actorUid?: string): Promise<{
    event: PlatformEventData;
    attendeeCount: number;
    isFull: boolean;
    availableSeats: number;
    isRegistrationOpen: boolean;
    userRegistrationStatus: RegistrationStatus | null;
  }> {
    const snap = await this.db.collection('events').doc(eventId).get();
    if (!snap.exists) {
      throw new Error('Event not found.');
    }
    const event = snap.data() as PlatformEventData;

    // Calculate active attendee count from registrations (excluding cancelled)
    const regDocs = Object.values(this.db._getAllRaw('registrations')) as RegistrationRecord[];
    const activeRegs = regDocs.filter((r) => r.eventId === eventId && r.status !== 'cancelled');
    const attendeeCount = activeRegs.length;

    const isFull = attendeeCount >= event.capacity;
    const availableSeats = Math.max(0, event.capacity - attendeeCount);
    const isRegistrationOpen = event.state === 'Registration Open' || event.state === 'Published';

    let userRegistrationStatus: RegistrationStatus | null = null;
    if (actorUid) {
      const userReg = regDocs.find((r) => r.eventId === eventId && r.userId === actorUid);
      userRegistrationStatus = userReg ? userReg.status : null;
    }

    return {
      event,
      attendeeCount,
      isFull,
      availableSeats,
      isRegistrationOpen,
      userRegistrationStatus,
    };
  }

  // ==========================================
  // EVENT REGISTRATION DOMAIN
  // ==========================================

  async registerForEvent(actorUid: string, eventId: string): Promise<{
    status: RegistrationStatus;
    attendeeCount: number;
  }> {
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Invalid eventId.');
    }

    const eventRef = this.db.collection('events').doc(eventId);
    const regId = `${eventId}_${actorUid}`;
    const regRef = this.db.collection('registrations').doc(regId);

    return await this.db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) {
        throw new Error('Event not found.');
      }

      const eventData = eventSnap.data() as PlatformEventData;
      if (eventData.state !== 'Registration Open' && eventData.state !== 'Published') {
        throw new Error('Registration is not open for this event.');
      }

      const regSnap = await tx.get(regRef);
      if (regSnap.exists) {
        const currentStatus = regSnap.data()?.status;
        if (currentStatus !== 'cancelled') {
          throw new Error('You are already registered or pending for this event.');
        }
      }

      // Negative capacity prevention
      if (eventData.capacity < 0) {
        throw new Error('Invalid event capacity.');
      }

      // Count active attendees
      const attendeeCount = eventData.registeredCount || 0;

      // Determine status
      let status: RegistrationStatus = 'approved';
      if (eventData.registrationMode === 'Manual') {
        status = 'pending';
      } else if (attendeeCount >= eventData.capacity) {
        status = 'waitlisted';
      }

      const regData: RegistrationRecord = {
        id: regId,
        userId: actorUid,
        eventId: eventId,
        status: status,
        timestamp: new Date(),
      };

      tx.set(regRef, regData);
      tx.update(eventRef, {
        registeredCount: attendeeCount + 1,
      });

      return { status, attendeeCount: attendeeCount + 1 };
    });
  }

  async cancelRegistration(actorUid: string, eventId: string): Promise<{
    status: 'cancelled';
    eventId: string;
    userId: string;
  }> {
    const regId = `${eventId}_${actorUid}`;
    const regRef = this.db.collection('registrations').doc(regId);
    const eventRef = this.db.collection('events').doc(eventId);

    return await this.db.runTransaction(async (tx) => {
      const regSnap = await tx.get(regRef);
      if (!regSnap.exists) {
        throw new Error('Registration not found.');
      }

      const regData = regSnap.data() as RegistrationRecord;
      if (regData.userId !== actorUid) {
        throw new Error('Permission denied: You can only cancel your own registration.');
      }

      if (regData.status === 'cancelled') {
        return { status: 'cancelled', eventId, userId: actorUid };
      }

      tx.update(regRef, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      // Capacity recovery: decrement event registeredCount (bounded at 0)
      const eventSnap = await tx.get(eventRef);
      if (eventSnap.exists) {
        const currentCount = eventSnap.data()?.registeredCount || 0;
        tx.update(eventRef, {
          registeredCount: Math.max(0, currentCount - 1),
        });
      }

      return { status: 'cancelled', eventId, userId: actorUid };
    });
  }

  /**
   * Promotes first waitlisted attendee to approved when capacity is freed
   */
  async promoteWaitlistedAttendee(eventId: string): Promise<RegistrationRecord | null> {
    const regDocs = Object.values(this.db._getAllRaw('registrations')) as RegistrationRecord[];
    const waitlisted = regDocs
      .filter((r) => r.eventId === eventId && r.status === 'waitlisted')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (waitlisted.length === 0) return null;

    const candidate = waitlisted[0];
    const regRef = this.db.collection('registrations').doc(candidate.id);

    await this.db.runTransaction(async (tx) => {
      tx.update(regRef, { status: 'approved' });
    });

    candidate.status = 'approved';
    return candidate;
  }

  // ==========================================
  // ATTENDANCE & CHECK-IN DOMAIN
  // ==========================================

  async generateCheckInToken(actorUid: string, eventId: string, expiresInSec: number = 60): Promise<{ token: string }> {
    const actor = await this.getUser(actorUid);
    if (!actor || (actor.role !== 'event_organizer' && actor.role !== 'super_admin')) {
      throw new Error('Permission denied: Only organizers or super admins can generate QR tokens.');
    }

    const eventSnap = await this.db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      throw new Error('Event not found.');
    }

    const eventData = eventSnap.data() as PlatformEventData;
    if (eventData.state !== 'Ongoing') {
      throw new Error('Event must be Ongoing to generate tokens.');
    }

    const token = createCheckInToken({ eventId, expiresInSec });
    return { token };
  }

  async processCheckIn(actorUid: string, eventId: string, token: string): Promise<{
    status: 'success' | 'already_checked_in';
    pointsAwarded: number;
  }> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid or missing token.');
    }
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Invalid or missing eventId.');
    }

    // 1. Verify cryptographic token signature & expiration
    const decodedToken = verifyCheckInToken(token);

    if (decodedToken.eventId !== eventId) {
      throw new Error('Token does not match the event.');
    }

    return await this.db.runTransaction(async (tx) => {
      // 2. Verify Event State
      const eventRef = this.db.collection('events').doc(eventId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) {
        throw new Error('Event not found.');
      }
      const eventData = eventSnap.data() as PlatformEventData;
      if (eventData.state !== 'Ongoing') {
        throw new Error('Event is not currently accepting attendance.');
      }

      // 3. Check Idempotency (Already checked in)
      const logId = `${eventId}_${actorUid}`;
      const logRef = this.db.collection('attendance_logs').doc(logId);
      const logSnap = await tx.get(logRef);
      if (logSnap.exists) {
        return { status: 'already_checked_in', pointsAwarded: 0 };
      }

      // 4. Verify Registration Status (unless Booth or requiresRegistration is false)
      const isRegistrationRequired = eventData.requiresRegistration !== false && eventData.type !== 'Booth';
      const regId = `${eventId}_${actorUid}`;
      const regRef = this.db.collection('registrations').doc(regId);
      const regSnap = await tx.get(regRef);
      if (isRegistrationRequired) {
        if (!regSnap.exists) {
          throw new Error('You are not registered for this event.');
        }
        if (!['approved', 'attended'].includes(regSnap.data()?.status)) {
          throw new Error('Your registration is not approved.');
        }
      }

      // 5. Write Attendance Log & Update/Create Registration
      const now = new Date();
      tx.set(logRef, {
        id: logId,
        userId: actorUid,
        eventId: eventId,
        timestamp: now,
        verifiedByQR: true,
        tokenNonce: decodedToken.nonce,
      });

      if (regSnap.exists) {
        tx.update(regRef, {
          attended: true,
          attendedAt: now,
          timestamp: regSnap.data()?.timestamp || now,
        });
      } else {
        const studentSnap = await tx.get(this.db.collection('users').doc(actorUid));
        const student = studentSnap.data() as UserProfile | undefined;
        tx.set(regRef, {
          id: regId,
          eventId,
          userId: actorUid,
          status: 'attended',
          attended: true,
          isWalkIn: true,
          timestamp: now,
          registeredAt: now,
          attendedAt: now,
          userName: student?.displayName || 'Student',
          userEmail: student?.email || '',
          universityId: student?.universityId,
        });
      }

      // 6. Award Points Atomically
      const pointsToAward = typeof eventData.points === 'number' ? eventData.points : 0;
      if (pointsToAward > 0) {
        const pointTxId = `attendance_${eventId}_${actorUid}`;
        const pointTxRef = this.db.collection('point_transactions').doc(pointTxId);
        tx.set(pointTxRef, {
          id: pointTxId,
          userId: actorUid,
          amount: pointsToAward,
          source: 'attendance',
          reason: `Attended event: ${eventData.title || 'Unknown'}`,
          sourceEventId: eventId,
          createdBy: 'system',
          createdAt: now,
        });

        // Increment user's total points
        const userRef = this.db.collection('users').doc(actorUid);
        tx.update(userRef, {
          totalPoints: FieldValue.increment(pointsToAward),
        });
      }

      const curAtt = Number(eventData.attendanceCount) || 0;
      tx.update(eventRef, { attendanceCount: curAtt + 1 });

      return { status: 'success', pointsAwarded: pointsToAward };
    }).then(async (result) => {
      // Evaluate badge milestones post-transaction
      if (result.status === 'success') {
        await this.evaluateBadgeMilestones(actorUid);
      }
      return result;
    });
  }

  async manualAttendanceOverride(adminUid: string, studentUid: string, eventId: string): Promise<{
    status: 'success' | 'already_checked_in';
    pointsAwarded: number;
  }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || (adminUser.role !== 'event_organizer' && adminUser.role !== 'super_admin')) {
      throw new Error('Permission denied: Only organizers can perform manual attendance overrides.');
    }

    return await this.db.runTransaction(async (tx) => {
      const eventRef = this.db.collection('events').doc(eventId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) throw new Error('Event not found.');
      const eventData = eventSnap.data() as PlatformEventData;

      const isRegistrationRequired = eventData.requiresRegistration !== false && eventData.type !== 'Booth';
      const logId = `${eventId}_${studentUid}`;
      const logRef = this.db.collection('attendance_logs').doc(logId);
      const logSnap = await tx.get(logRef);
      if (logSnap.exists) {
        return { status: 'already_checked_in', pointsAwarded: 0 };
      }

      const regId = `${eventId}_${studentUid}`;
      const regRef = this.db.collection('registrations').doc(regId);
      const regSnap = await tx.get(regRef);
      if (isRegistrationRequired) {
        if (!regSnap.exists) throw new Error('Student is not registered for this event.');
        if (!['approved', 'attended'].includes(regSnap.data()?.status)) throw new Error('Student registration is not approved.');
      }

      const now = new Date();
      tx.set(logRef, {
        id: logId,
        userId: studentUid,
        eventId: eventId,
        timestamp: now,
        verifiedByQR: false,
        manualOverride: true,
        overriddenBy: adminUid,
        overrideTimestamp: now,
      });

      if (regSnap.exists) {
        tx.update(regRef, {
          attended: true,
          attendedAt: now,
          timestamp: regSnap.data()?.timestamp || now,
        });
      } else {
        const studentSnap = await tx.get(this.db.collection('users').doc(studentUid));
        const student = studentSnap.data() as UserProfile | undefined;
        tx.set(regRef, {
          id: regId,
          eventId,
          userId: studentUid,
          status: 'attended',
          attended: true,
          isWalkIn: true,
          timestamp: now,
          registeredAt: now,
          attendedAt: now,
          userName: student?.displayName || 'Student',
          userEmail: student?.email || '',
          universityId: student?.universityId,
        });
      }
      const curAtt = Number(eventData.attendanceCount) || 0;
      tx.update(eventRef, { attendanceCount: curAtt + 1 });

      const pointsToAward = typeof eventData.points === 'number' ? eventData.points : 0;
      if (pointsToAward > 0) {
        const pointTxId = `attendance_${eventId}_${studentUid}`;
        const pointTxRef = this.db.collection('point_transactions').doc(pointTxId);
        tx.set(pointTxRef, {
          id: pointTxId,
          userId: studentUid,
          amount: pointsToAward,
          source: 'attendance_override',
          reason: `Manual attendance for event: ${eventData.title || 'Unknown'}`,
          sourceEventId: eventId,
          createdBy: adminUid,
          createdAt: now,
        });

        const userRef = this.db.collection('users').doc(studentUid);
        tx.update(userRef, {
          totalPoints: FieldValue.increment(pointsToAward),
        });
      }

      return { status: 'success', pointsAwarded: pointsToAward };
    }).then(async (result) => {
      if (result.status === 'success') {
        await this.evaluateBadgeMilestones(studentUid);
      }
      return result;
    });
  }

  async syncEventAttendance(adminUid: string, eventId: string): Promise<{
    status: string;
    repairedCount: number;
    totalAttendance: number;
  }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || (adminUser.role !== 'event_organizer' && adminUser.role !== 'super_admin')) {
      throw new Error('Permission denied: Only organizers can sync attendance.');
    }

    const eventSnap = await this.db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) throw new Error('Event not found.');

    const logs = (Object.values(this.db._getAllRaw('attendance_logs')) as any[]).filter(
      (l: any) => l.eventId === eventId
    );

    let repairedCount = 0;
    for (const log of logs) {
      const regId = `${eventId}_${log.userId}`;
      const regSnap = await this.db.collection('registrations').doc(regId).get();
      const user = await this.getUser(log.userId);
      if (!regSnap.exists) {
        await this.db.collection('registrations').doc(regId).set({
          id: regId,
          eventId,
          userId: log.userId,
          status: 'attended',
          attended: true,
          isWalkIn: true,
          timestamp: log.timestamp || new Date(),
          registeredAt: log.timestamp || new Date(),
          attendedAt: log.timestamp || new Date(),
          userName: user?.displayName || 'Student',
          userEmail: user?.email || '',
          universityId: user?.universityId,
        });
        repairedCount++;
      } else if (!regSnap.data()?.timestamp || regSnap.data()?.status !== 'attended') {
        await this.db.collection('registrations').doc(regId).update({
          status: 'attended',
          attended: true,
          timestamp: regSnap.data()?.timestamp || log.timestamp || new Date(),
          attendedAt: regSnap.data()?.attendedAt || log.timestamp || new Date(),
        });
        repairedCount++;
      }
    }

    await this.db.collection('events').doc(eventId).update({ attendanceCount: logs.length });

    return { status: 'success', repairedCount, totalAttendance: logs.length };
  }

  // ==========================================
  // POINTS, GAMIFICATION & BADGES DOMAIN
  // ==========================================

  async addManualPoints(
    adminUid: string,
    studentUid: string,
    amount: number,
    reason: string
  ): Promise<{ status: 'success'; newTotal: number }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || adminUser.role !== 'super_admin') {
      throw new Error('Permission denied: Only Super Admins can add manual points.');
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
      throw new Error('Amount must be a non-zero number.');
    }

    const targetUser = await this.getUser(studentUid);
    if (!targetUser) throw new Error('Target user not found.');

    const currentTotal = targetUser.totalPoints || 0;
    const newTotal = Math.max(0, currentTotal + amount); // Floor at 0

    const txId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pointTxRef = this.db.collection('point_transactions').doc(txId);
    const userRef = this.db.collection('users').doc(studentUid);

    await this.db.runTransaction(async (tx) => {
      tx.set(pointTxRef, {
        id: txId,
        userId: studentUid,
        amount,
        source: 'manual_adjustment',
        reason: reason || 'Manual points adjustment',
        createdBy: adminUid,
        createdAt: new Date(),
      });

      tx.update(userRef, {
        totalPoints: newTotal,
      });
    });

    await this.evaluateBadgeMilestones(studentUid);
    return { status: 'success', newTotal };
  }

  async cancelAttendance(
    adminUid: string,
    eventId: string,
    studentUid: string
  ): Promise<{ status: 'success'; revokedPoints: number }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || !['super_admin', 'event_organizer'].includes(adminUser.role || '')) {
      throw new Error('Permission denied.');
    }

    const logId = `${eventId}_${studentUid}`;
    const logRef = this.db.collection('attendance_logs').doc(logId);
    const regRef = this.db.collection('registrations').doc(`${eventId}_${studentUid}`);
    const userRef = this.db.collection('users').doc(studentUid);
    const eventRef = this.db.collection('events').doc(eventId);
    const pointTxRef = this.db.collection('point_transactions').doc(`attendance_${eventId}_${studentUid}`);

    let revokedPoints = 0;
    await this.db.runTransaction(async (tx) => {
      const [logSnap, regSnap, pointSnap, userSnap, eventSnap] = await Promise.all([
        tx.get(logRef),
        tx.get(regRef),
        tx.get(pointTxRef),
        tx.get(userRef),
        tx.get(eventRef),
      ]);

      if (logSnap.exists) {
        tx.delete(logRef);
      }

      if (pointSnap.exists) {
        revokedPoints = Number(pointSnap.data()?.amount) || 0;
        tx.delete(pointTxRef);
      }

      if (userSnap.exists) {
        const cur = Number(userSnap.data()?.totalPoints) || 0;
        tx.update(userRef, { totalPoints: Math.max(0, cur - revokedPoints) });
      }

      if (regSnap.exists) {
        const rData = regSnap.data();
        if (rData?.isWalkIn) {
          tx.delete(regRef);
        } else {
          tx.update(regRef, { status: 'approved', attended: false });
        }
      }

      if (eventSnap.exists) {
        const curAtt = Number(eventSnap.data()?.attendanceCount) || 0;
        if (curAtt > 0) tx.update(eventRef, { attendanceCount: curAtt - 1 });
      }
    });

    return { status: 'success', revokedPoints };
  }

  async voidPointTransaction(
    adminUid: string,
    studentUid: string,
    transactionId: string
  ): Promise<{ status: 'success'; newTotal: number; revokedAmount: number }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || !['super_admin', 'event_organizer'].includes(adminUser.role || '')) {
      throw new Error('Permission denied.');
    }

    const txRef = this.db.collection('point_transactions').doc(transactionId);
    const userRef = this.db.collection('users').doc(studentUid);

    let revokedAmount = 0;
    let newTotal = 0;
    await this.db.runTransaction(async (tx) => {
      const [pointSnap, userSnap] = await Promise.all([
        tx.get(txRef),
        tx.get(userRef),
      ]);

      if (!pointSnap.exists) throw new Error('Transaction not found.');
      revokedAmount = Number(pointSnap.data()?.amount) || 0;
      tx.delete(txRef);

      if (userSnap.exists) {
        const cur = Number(userSnap.data()?.totalPoints) || 0;
        newTotal = Math.max(0, cur - revokedAmount);
        tx.update(userRef, { totalPoints: newTotal });
      }
    });

    return { status: 'success', newTotal, revokedAmount };
  }

  async evaluateBadgeMilestones(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Count verified attendances
    const attendanceDocs = Object.values(this.db._getAllRaw('attendance_logs')) as AttendanceRecord[];
    const userAttendances = attendanceDocs.filter((a) => a.userId === userId);
    const attendanceCount = userAttendances.length;
    const currentPoints = user.totalPoints || 0;

    const awardedBadges = new Set<string>(user.badges || []);

    for (const badge of BADGE_DEFINITIONS) {
      if (badge.type === 'attendance_count' && attendanceCount >= badge.threshold) {
        awardedBadges.add(badge.id);
      }
      if (badge.type === 'points_threshold' && currentPoints >= badge.threshold) {
        awardedBadges.add(badge.id);
      }
    }

    const newBadgeList = Array.from(awardedBadges);
    if (newBadgeList.length !== (user.badges || []).length) {
      await this.db.runTransaction(async (tx) => {
        tx.update(this.db.collection('users').doc(userId), {
          badges: newBadgeList,
        });
      });
    }

    return newBadgeList;
  }

  async getLeaderboard(limit: number = 50): Promise<Array<{
    id: string;
    name: string;
    points: number;
    badges: string[];
    rank: number;
  }>> {
    const rawUsers = Object.values(this.db._getAllRaw('users')) as UserProfile[];
    // Filter users with points > 0 per leaderboard page contract
    const eligible = rawUsers.filter((u) => (u.totalPoints || 0) > 0);

    eligible.sort((a, b) => b.totalPoints - a.totalPoints);

    const ranked = eligible.slice(0, limit).map((u, idx) => ({
      id: u.uid,
      name: u.displayName || 'طالب',
      points: u.totalPoints,
      badges: u.badges || [],
      rank: idx + 1,
    }));

    return ranked;
  }

  async getUserActivity(userId: string): Promise<{
    registrations: Array<RegistrationRecord & { eventTitle: string }>;
    attendance: AttendanceRecord[];
    transactions: PointTransactionRecord[];
    certificates: CertificateRecord[];
    totalPoints: number;
  }> {
    const user = await this.getUser(userId);
    const allEvents = this.db._getAllRaw('events') as Record<string, PlatformEventData>;

    const allRegs = Object.values(this.db._getAllRaw('registrations')) as RegistrationRecord[];
    const userRegs = allRegs
      .filter((r) => r.userId === userId)
      .map((r) => ({
        ...r,
        eventTitle: allEvents[r.eventId]?.title || 'Unknown Event',
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const allAttendance = Object.values(this.db._getAllRaw('attendance_logs')) as AttendanceRecord[];
    const userAttendance = allAttendance
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const allTx = Object.values(this.db._getAllRaw('point_transactions')) as PointTransactionRecord[];
    const userTx = allTx
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allCerts = Object.values(this.db._getAllRaw('certificates')) as CertificateRecord[];
    const userCerts = allCerts
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      registrations: userRegs,
      attendance: userAttendance,
      transactions: userTx,
      certificates: userCerts,
      totalPoints: user?.totalPoints || 0,
    };
  }

  // ==========================================
  // CERTIFICATE ISSUANCE & VERIFICATION DOMAIN
  // ==========================================

  async issueCertificates(adminUid: string, eventId: string, userIds: string[]): Promise<{
    status: 'success';
    queuedCount: number;
  }> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'event_organizer')) {
      throw new Error('Insufficient permissions. Only Organizers or Super Admins can issue certificates.');
    }

    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Missing or invalid eventId.');
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Missing or invalid userIds array.');
    }

    const eventSnap = await this.db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) throw new Error('Event not found.');
    const eventData = eventSnap.data() as PlatformEventData;

    if (eventData.state !== 'Completed') {
      throw new Error('Certificates can only be issued for Completed events.');
    }

    const queuedCount = await this.db.runTransaction(async (tx) => {
      let count = 0;
      for (const uid of userIds) {
        // Attendance check
        const logRef = this.db.collection('attendance_logs').doc(`${eventId}_${uid}`);
        const logSnap = await tx.get(logRef);
        if (!logSnap.exists) continue; // Skip, no attendance found

        const certId = `certificate_${eventId}_${uid}`;
        const certRef = this.db.collection('certificates').doc(certId);
        const certSnap = await tx.get(certRef);

        if (certSnap.exists) {
          const st = certSnap.data()?.status;
          if (st === 'Available' || st === 'Generating') continue; // Idempotent skip
        }

        const userSnap = await tx.get(this.db.collection('users').doc(uid));
        const studentName = userSnap.data()?.displayName || 'Student';
        const now = new Date();

        const certRecord: CertificateRecord = {
          id: certId,
          eventId,
          userId: uid,
          status: 'Generating',
          storagePath: `certificates/${eventId}/${certId}.pdf`,
          studentName,
          eventTitle: eventData.title,
          eventType: eventData.type,
          attendanceDate: logSnap.data()?.timestamp || eventData.date,
          createdAt: now,
          updatedAt: now,
          attemptCount: 0,
          issuedBy: adminUid,
        };

        tx.set(certRef, certRecord, { merge: true });
        count++;
      }
      return count;
    });

    return { status: 'success', queuedCount };
  }

  /**
   * Completes generation of certificate PDF artifact and calculates verification signature
   */
  async generateCertificateArtifact(certificateId: string): Promise<CertificateRecord> {
    const certRef = this.db.collection('certificates').doc(certificateId);
    const certSnap = await certRef.get();
    if (!certSnap.exists) throw new Error('Certificate not found.');

    const certData = certSnap.data() as CertificateRecord;
    const now = new Date();

    const verificationHash = hashCertificate({
      certificateId: certData.id,
      eventId: certData.eventId,
      userId: certData.userId,
      issueDate: now,
    });

    await this.db.runTransaction(async (tx) => {
      tx.update(certRef, {
        status: 'Available',
        issueDate: now,
        updatedAt: now,
        attemptCount: FieldValue.increment(1),
        verificationHash,
      });
    });

    return (await certRef.get()).data() as CertificateRecord;
  }

  async getCertificateDownloadUrl(actorUid: string, certificateId: string): Promise<{
    status: 'success';
    url: string;
  }> {
    const certSnap = await this.db.collection('certificates').doc(certificateId).get();
    if (!certSnap.exists) {
      throw new Error('Certificate not found.');
    }

    const certData = certSnap.data() as CertificateRecord;
    const actor = await this.getUser(actorUid);
    const isAdmin = actor?.role === 'super_admin' || actor?.role === 'event_organizer';

    if (certData.userId !== actorUid && !isAdmin) {
      throw new Error('You do not have permission to access this certificate.');
    }

    if (certData.status !== 'Available') {
      throw new Error(`Certificate is not available. Current status: ${certData.status}`);
    }

    // Generate signed URL with 15-minute token
    const token = createCheckInToken(
      { eventId: certData.eventId, nonce: certData.id, expiresInSec: 15 * 60 },
      'storage-signed-key'
    );
    const url = `https://storage.googleapis.com/ieeeqassim.firebasestorage.app/${certData.storagePath}?token=${token}`;

    return { status: 'success', url };
  }

  async verifyCertificate(certificateId: string): Promise<{
    valid: boolean;
    status: CertificateState;
    studentName?: string;
    eventTitle?: string;
    eventType?: EventType;
    issueDate?: Date;
    verificationHash?: string;
  }> {
    const certSnap = await this.db.collection('certificates').doc(certificateId).get();
    if (!certSnap.exists) {
      return { valid: false, status: 'Not Issued' };
    }

    const certData = certSnap.data() as CertificateRecord;
    return {
      valid: certData.status === 'Available',
      status: certData.status,
      studentName: certData.studentName,
      eventTitle: certData.eventTitle,
      eventType: certData.eventType,
      issueDate: certData.issueDate,
      verificationHash: certData.verificationHash,
    };
  }

  async revokeCertificate(adminUid: string, certificateId: string, reason: string): Promise<void> {
    const adminUser = await this.getUser(adminUid);
    if (!adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'event_organizer')) {
      throw new Error('Permission denied: Only organizers can revoke certificates.');
    }

    const certRef = this.db.collection('certificates').doc(certificateId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(certRef);
      if (!snap.exists) throw new Error('Certificate not found.');

      tx.update(certRef, {
        status: 'Revoked',
        revokedBy: adminUid,
        revokedAt: new Date(),
        revocationReason: reason || 'Audited and revoked by administrator',
      });
    });
  }
}
