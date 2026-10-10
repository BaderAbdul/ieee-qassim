import { ApiError } from './errors';
import { publicProfile } from './profiles';
import { queueNotification } from './notifications';
import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export function documentId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) {
    throw new ApiError('invalid-argument', `Invalid ${label}.`);
  }
  return value;
}

export const reserved = (status: string) => ['pending', 'approved', 'attended'].includes(status);
export const hasCapacity = (event: FirebaseFirestore.DocumentData, count: number) =>
  event.isUnlimitedCapacity === true || count < Math.max(0, Number(event.capacity) || 0);

/** The event document serializes registration, cancellation, and FIFO promotion. */
export async function changeRegistration(uid: string, eventId: string, action: 'register' | 'cancel' | 'approve' | 'reject', actorUid = uid) {
  const db = getFirestore();
  const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
  const regRef = db.collection('registrations').doc(`${eventId}_${documentId(uid, 'userId')}`);
  const notificationKey = randomUUID();
  return db.runTransaction(async tx => {
    // Always acquire the common event document before user-specific documents.
    const eventSnap = await tx.get(eventRef);
    const [regSnap, userSnap] = await Promise.all([
      tx.get(regRef), tx.get(db.collection('users').doc(uid)),
    ]);
    if (!eventSnap.exists) throw new ApiError('not-found', 'Event not found.');
    const event = eventSnap.data()!;
    const user = userSnap.data();
    const before = regSnap.data()?.status;
    let count = Math.max(0, event.registeredCount || 0);
    const initialCount = count;
    let status: string;
    if (action === 'register') {
      if (!user || user.isRestricted || (user.role !== 'super_admin' && user.profileCompleted !== true)) {
        throw new ApiError('failed-precondition', 'Complete your profile before registering.');
      }
      if (event.state !== 'Registration Open') throw new ApiError('failed-precondition', 'Registration is closed.');
      if (regSnap.exists && before !== 'cancelled') throw new ApiError('already-exists', 'Already registered.');
      let queueHasPriority = false;
      if (hasCapacity(event, count) && event.isUnlimitedCapacity !== true) {
        const waiting = await tx.get(db.collection('registrations').where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp').limit(1));
        queueHasPriority = !waiting.empty;
      }
      status = hasCapacity(event, count) && !queueHasPriority ? (event.registrationMode === 'Manual' ? 'pending' : 'approved') : 'waitlisted';
    } else {
      if (!regSnap.exists) throw new ApiError('not-found', 'Registration not found.');
      if (before === 'attended') throw new ApiError('failed-precondition', 'Attendance cannot be reversed through registration.');
      if (action === 'cancel') {
        if (before === 'cancelled') return { status: before, attendeeCount: count };
        status = 'cancelled';
      } else if (action === 'approve') {
        if (!['pending', 'waitlisted', 'approved'].includes(before)) throw new ApiError('failed-precondition', 'Registration is not awaiting approval.');
        if (!reserved(before) && !hasCapacity(event, count)) throw new ApiError('resource-exhausted', 'Event is full.');
        status = 'approved';
      } else {
        status = 'rejected';
      }
    }
    count += (reserved(status) ? 1 : 0) - (reserved(before) ? 1 : 0);
    let candidate: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    let candidateEmail: unknown;
    if (reserved(before) && !reserved(status) && event.state === 'Registration Open' && hasCapacity(event, count)) {
      const waiting = await tx.get(db.collection('registrations').where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp').limit(1));
      candidate = waiting.docs[0];
      if (candidate) {
        const candidateUser = await tx.get(db.collection('users').doc(documentId(candidate.data().userId, 'userId')));
        candidateEmail = candidateUser.data()?.email;
        count++;
      }
    }
    // All reads precede writes.
    if (action === 'register') {
      tx.set(regRef, {
        eventId, userId: uid, status, timestamp: FieldValue.serverTimestamp(),
        userName: user?.arabicFullName || user?.displayName || 'Student',
        userEmail: user?.email || '', ...(user?.universityId ? { universityId: user.universityId } : {}),
      });
    } else {
      tx.update(regRef, { status, updatedBy: actorUid, ...(status === 'cancelled' ? { cancelledAt: FieldValue.serverTimestamp() } : {}) });
    }
    if (candidate) tx.update(candidate.ref, { status: event.registrationMode === 'Manual' ? 'pending' : 'approved', promotedAt: FieldValue.serverTimestamp() });
    if (before !== status) queueNotification(tx, notificationKey, user?.email, `حالة التسجيل: ${status} / Registration status: ${status}`, event.title);
    if (candidate) queueNotification(tx, `${notificationKey}_promotion`, candidateEmail, 'توفر لك مقعد؛ راجع حالة تسجيلك. / A seat became available; check your registration.', event.title);
    if (count !== initialCount) tx.update(eventRef, { registeredCount: Math.max(0, count) });
    return { status, attendeeCount: Math.max(0, count) };
  }, { maxAttempts: 10 });
}
export interface AttendanceInput {
  eventId: string;
  userId: string;
  actorUid: string;
  admin: boolean;
  token?: string;
  feedback?: { rating?: number; answers?: Record<string, string> };
}

export async function recordAttendance(input: AttendanceInput) {
  const { eventId, userId, actorUid } = input;
  const db = getFirestore();
  const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
  const regRef = db.collection('registrations').doc(`${eventId}_${documentId(userId, 'userId')}`);
  const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
  const pointRef = db.collection('point_transactions').doc(`attendance_${eventId}_${userId}`);
  return db.runTransaction(async tx => {
    const eventSnap = await tx.get(eventRef);
    const [regSnap, logSnap, pointSnap, userSnap, secretSnap, pastAttendance] = await Promise.all([
      tx.get(regRef), tx.get(logRef), tx.get(pointRef), tx.get(db.collection('users').doc(userId)),
      tx.get(db.collection('event_secrets').doc(eventId)),
      tx.get(db.collection('attendance_logs').where('userId', '==', userId).limit(4)),
    ]);
    const event = eventSnap.data();
    if (!event) throw new ApiError('not-found', 'Event not found.');
    if (!userSnap.exists || userSnap.data()?.isRestricted) throw new ApiError('permission-denied', 'Student account is unavailable.');
    if (!input.admin && event.state !== 'Ongoing') throw new ApiError('failed-precondition', 'Event is not accepting attendance.');
    if (input.admin && !['Ongoing', 'Completed'].includes(event.state)) throw new ApiError('failed-precondition', 'Start the event before recording attendance.');
    const secret = secretSnap.data();
    if (!input.admin && (!input.token || secret?.token !== input.token || !secret.expiresAt || secret.expiresAt.toMillis() <= Date.now())) throw new ApiError('permission-denied', 'Invalid or expired check-in token.');
    if (!regSnap.exists || !['approved', 'attended'].includes(regSnap.data()?.status)) throw new ApiError('failed-precondition', 'An approved registration is required.');
    if (logSnap.exists) return { status: 'already_checked_in', userId, awardedPoints: 0 };

    const feedback = input.feedback;
    if (feedback) {
      if (!Number.isFinite(feedback.rating) || feedback.rating! < 1 || feedback.rating! > 5) throw new ApiError('invalid-argument', 'Invalid rating.');
      for (const [key, value] of Object.entries(feedback.answers || {})) {
        if (key.length > 128 || typeof value !== 'string' || value.length > 3000) throw new ApiError('invalid-argument', 'Invalid feedback.');
      }
      for (const question of event.feedbackQuestions || []) {
        if (question.required && !feedback.answers?.[question.id]?.trim()) throw new ApiError('invalid-argument', 'Answer the required feedback questions.');
      }
    }
    const points = Number.isSafeInteger(event.points) && event.points > 0 ? event.points : 0;
    const badges = ['ieee_starter'];
    if (pastAttendance.size + 1 >= 3) badges.push('active_engineer');
    if (pastAttendance.size + 1 >= 5) badges.push('tech_pioneer');
    const userData = userSnap.data()!;
    const awardedPoints = points > 0 && !pointSnap.exists ? points : 0;
    const totalPoints = Math.max(0, (Number(userData.totalPoints) || 0) + awardedPoints);
    const nextBadges = [...new Set([...(userData.badges || []), ...badges,
      ...(totalPoints >= 100 ? ['century_club'] : []),
      ...(totalPoints >= 250 ? ['engineering_leader'] : [])])];
    tx.update(userSnap.ref, { totalPoints, badges: nextBadges });
    tx.set(db.collection('public_profiles').doc(userId), publicProfile({ ...userData, totalPoints, badges: nextBadges }));
    tx.create(logRef, { eventId, userId, timestamp: FieldValue.serverTimestamp(), verifiedByAdmin: input.admin ? actorUid : false });
    tx.update(regRef, { status: 'attended', attended: true, attendedAt: FieldValue.serverTimestamp() });
    tx.update(eventRef, { attendanceCount: FieldValue.increment(1) });
    if (feedback) tx.set(db.collection('event_feedback').doc(`${eventId}_${userId}`), { eventId, userId, userEmail: userSnap.data()?.email || '', rating: feedback.rating, answers: feedback.answers || {}, createdAt: FieldValue.serverTimestamp() });
    if (points > 0 && !pointSnap.exists) tx.create(pointRef, { userId, amount: points, source: 'attendance', reason: `Attendance: ${event.title || eventId}`, sourceEventId: eventId, createdBy: input.admin ? actorUid : 'system', createdAt: FieldValue.serverTimestamp(), aggregatedAt: FieldValue.serverTimestamp() });
    queueNotification(tx, `attendance_${eventId}_${userId}`, userData.email, `تم تأكيد حضورك، النقاط: ${awardedPoints}. / Attendance confirmed, points: ${awardedPoints}.`, event.title);
    return { status: 'success', userId, awardedPoints };
  }, { maxAttempts: 10 });
}
