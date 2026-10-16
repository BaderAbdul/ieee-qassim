import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from './errors';
import { publicProfile, normalizeUniversityId } from './profiles';
import { queueNotification } from './notifications';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { audit } from './audit';

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
export async function changeRegistration(uid: string, eventId: string, action: 'register' | 'cancel' | 'approve' | 'reject' | 'waitlist', actorUid = uid) {
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
        if (!user || user.isRestricted || user.archivedAt) throw new ApiError('failed-precondition', 'Student account is unavailable.');
        if (!['pending', 'waitlisted', 'approved'].includes(before)) throw new ApiError('failed-precondition', 'Registration is not awaiting approval.');
        if (!reserved(before) && !hasCapacity(event, count)) throw new ApiError('resource-exhausted', 'Event is full.');
        status = 'approved';
      } else if (action === 'waitlist') {
        if (!['pending', 'approved', 'waitlisted'].includes(before)) throw new ApiError('failed-precondition', 'Only active requests can be waitlisted.');
        status = 'waitlisted';
      } else {
        status = 'rejected';
      }
    }
    count += (reserved(status) ? 1 : 0) - (reserved(before) ? 1 : 0);
    let candidate: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    let candidateEmail: unknown;
    const unavailableCandidates: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (reserved(before) && !reserved(status) && event.state === 'Registration Open' && hasCapacity(event, count)) {
      const waiting = await tx.get(db.collection('registrations').where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp').limit(20));
      for (const waitingRegistration of waiting.docs) {
        if (waitingRegistration.id === regRef.id) continue;
        const candidateUser = await tx.get(db.collection('users').doc(documentId(waitingRegistration.data().userId, 'userId')));
        if (!candidateUser.exists || candidateUser.data()?.isRestricted || candidateUser.data()?.archivedAt) {
          unavailableCandidates.push(waitingRegistration);
          continue;
        }
        candidate = waitingRegistration;
        candidateEmail = candidateUser.data()?.email;
        count++; break;
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
    for (const unavailable of unavailableCandidates) tx.update(unavailable.ref, { status: 'cancelled', cancellationReason: 'account_unavailable', cancelledAt: FieldValue.serverTimestamp() });
    if (before !== status) audit(tx, `registration.${action}`, actorUid, regRef.id, { eventId, before: before || null, after: status });
    if (candidate) audit(tx, 'registration.promote', actorUid, candidate.id, { eventId, after: event.registrationMode === 'Manual' ? 'pending' : 'approved' });
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

export function validateFeedback(event: FirebaseFirestore.DocumentData, feedback: AttendanceInput['feedback']) {
  if (!feedback || !Number.isInteger(feedback.rating) || feedback.rating! < 1 || feedback.rating! > 5) throw new ApiError('invalid-argument', 'Select a rating from 1 to 5.');
  if (feedback.answers !== undefined && (!feedback.answers || typeof feedback.answers !== 'object' || Array.isArray(feedback.answers))) throw new ApiError('invalid-argument', 'Invalid feedback answers.');
  for (const [key, value] of Object.entries(feedback.answers || {})) {
    if (key.length > 128 || typeof value !== 'string' || value.length > 3000) throw new ApiError('invalid-argument', 'Invalid feedback.');
  }
  for (const question of event.feedbackQuestions || []) {
    const answer = feedback.answers?.[question.id];
    if (question.required && !answer?.trim()) throw new ApiError('invalid-argument', 'Answer the required feedback questions.');
    if (answer && question.type === 'choice' && !question.options?.includes(answer)) throw new ApiError('invalid-argument', 'Select an available answer.');
  }
}

/** Editing feedback never calls attendance awarding and never changes point totals. */
export async function submitEventFeedback(uid: string, eventId: string, feedback: AttendanceInput['feedback']) {
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const [event, attendance, previous] = await Promise.all([
      tx.get(db.collection('events').doc(eventId)), tx.get(db.collection('attendance_logs').doc(`${eventId}_${uid}`)),
      tx.get(db.collection('event_feedback').doc(`${eventId}_${uid}`)),
    ]);
    if (!event.exists || !attendance.exists) throw new ApiError('failed-precondition', 'Verified attendance is required to leave feedback.');
    validateFeedback(event.data()!, feedback);
    tx.set(db.collection('pending_checkins').doc(`${eventId}_${uid}`), { eventId, userId: uid, status: 'completed', completedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(db.collection('event_feedback').doc(`${eventId}_${uid}`), { eventId, userId: uid, rating: feedback!.rating, answers: feedback!.answers || {}, createdAt: previous.data()?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { status: 'success' };
  });
}

export async function resolveStudentUid(identifier: string): Promise<string> {
  const raw = String(identifier || '').replace(/^ieee-qu-user:/, '').trim();
  if (!raw) throw new ApiError('invalid-argument', 'Invalid student identifier.');
  
  let cleanId = raw;
  if (cleanId.includes('/pass/')) {
    cleanId = cleanId.split('/pass/')[1].split('/')[0].split('?')[0];
  }

  const db = getFirestore();
  // 1. Direct doc lookup by UID
  if (!cleanId.includes('/') && cleanId.length <= 128) {
    const directSnap = await db.collection('users').doc(cleanId).get();
    if (directSnap.exists) return directSnap.id;
  }

  // 2. Lookup by universityId
  const uniClean = cleanId.replace(/\s+/g, '');
  const uniSnap = await db.collection('users').where('universityId', '==', uniClean).limit(1).get();
  if (!uniSnap.empty) return uniSnap.docs[0].id;

  const uniMappingSnap = await db.collection('university_ids').doc(uniClean).get();
  if (uniMappingSnap.exists && uniMappingSnap.data()?.userId) {
    return uniMappingSnap.data()!.userId;
  }

  // 3. Lookup by email
  const emailSnap = await db.collection('users').where('email', '==', cleanId.toLowerCase()).limit(1).get();
  if (!emailSnap.empty) return emailSnap.docs[0].id;

  // 4. Normalized university ID (handling Arabic/Persian numerals)
  const normalizedUni = normalizeUniversityId(cleanId);
  if (normalizedUni && normalizedUni !== uniClean) {
    const normSnap = await db.collection('users').where('universityId', '==', normalizedUni).limit(1).get();
    if (!normSnap.empty) return normSnap.docs[0].id;
  }

  return cleanId;
}

export async function initiatePendingCheckIn({ eventId, targetUserId, actorUid }: { eventId: string; targetUserId: string; actorUid: string }) {
  // Compatibility name: scans now commit attendance immediately.
  const result = await recordAttendance({ eventId, userId: targetUserId, actorUid, admin: true });
  return { ...result, eventId, targetUserId: result.userId };
}

export async function recordAttendance(input: AttendanceInput) {
  const { eventId, actorUid } = input;
  const userId = input.admin ? await resolveStudentUid(input.userId) : input.userId;
  const db = getFirestore();
  const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
  const regRef = db.collection('registrations').doc(`${eventId}_${documentId(userId, 'userId')}`);
  const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
  const pointRef = db.collection('point_transactions').doc(`attendance_${eventId}_${userId}`);
  const pendingRef = db.collection('pending_checkins').doc(`${eventId}_${userId}`);
  const notificationId = randomUUID();
  // Badge history is advisory; keep range-query locks out of the admission transaction.
  const pastAttendance = await db.collection('attendance_logs').where('userId', '==', userId).limit(4).get();
  return db.runTransaction(async tx => {
    const [eventSnap, regSnap, logSnap, pointSnap, userSnap, secretSnap, pendingSnap, feedbackSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(regRef), tx.get(logRef), tx.get(pointRef), tx.get(db.collection('users').doc(userId)),
      tx.get(db.collection('event_secrets').doc(eventId)),
      tx.get(pendingRef), tx.get(db.collection('event_feedback').doc(`${eventId}_${userId}`)),
    ]);
    const event = eventSnap.data();
    if (!event) throw new ApiError('not-found', 'Event not found.');
    if (!userSnap.exists || userSnap.data()?.isRestricted) throw new ApiError('permission-denied', 'Student account is unavailable.');
    // A retry may arrive after token expiry or event closure. Attendance remains confirmed.
    if (logSnap.exists) {
      if (!feedbackSnap.exists && pendingSnap.data()?.status !== 'pending') {
        tx.set(pendingRef, {
          eventId, userId, eventTitle: event.title, eventTitleEn: event.titleEn || null,
          points: event.points || 0, feedbackQuestions: event.feedbackQuestions || [],
          status: 'pending', attendanceRecorded: true, scannedAt: FieldValue.serverTimestamp(),
        });
      }
      return { status: 'already_checked_in', userId, awardedPoints: 0 };
    }

    if (!input.admin && event.state !== 'Ongoing') throw new ApiError('failed-precondition', 'Event is not accepting attendance.');
    if (input.admin && !['Ongoing', 'Completed'].includes(event.state)) throw new ApiError('failed-precondition', 'Start the event before recording attendance.');
    const secret = secretSnap.data();
    const isPendingVerified = pendingSnap.exists && pendingSnap.data()?.status === 'pending' && pendingSnap.data()?.expiresAt?.toMillis?.() > Date.now();
    const isTokenVerified = input.token && secret?.token === input.token && secret?.expiresAt && secret.expiresAt.toMillis() > Date.now();
    if (!input.admin && !isPendingVerified && !isTokenVerified) {
      throw new ApiError('permission-denied', 'Invalid or expired check-in verification.');
    }
    const isRegistrationRequired = event.requiresRegistration !== false && event.type !== 'Booth';
    if (isRegistrationRequired && (!regSnap.exists || !['approved', 'attended'].includes(regSnap.data()?.status))) {
      throw new ApiError('failed-precondition', 'An approved registration is required.');
    }

    const feedback = input.admin ? undefined : input.feedback;
    if (feedback) validateFeedback(event, feedback);
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
    if (regSnap.exists) {
      const regData = regSnap.data() || {};
      tx.update(regRef, {
        status: 'attended',
        attended: true,
        attendedAt: FieldValue.serverTimestamp(),
        ...(!regData.timestamp ? { timestamp: regData.registeredAt || FieldValue.serverTimestamp() } : {}),
        ...(!regData.userName ? { userName: userData.arabicFullName || userData.displayName || 'Student' } : {}),
        ...(!regData.userEmail ? { userEmail: userData.email || '' } : {}),
        ...(userData.universityId && !regData.universityId ? { universityId: userData.universityId } : {}),
      });
    } else {
      tx.set(regRef, {
        eventId,
        userId,
        status: 'attended',
        attended: true,
        isWalkIn: true,
        timestamp: FieldValue.serverTimestamp(),
        registeredAt: FieldValue.serverTimestamp(),
        attendedAt: FieldValue.serverTimestamp(),
        userName: userData.arabicFullName || userData.displayName || 'Student',
        userEmail: userData.email || '',
        ...(userData.universityId ? { universityId: userData.universityId } : {}),
      });
    }
    // Independent shards avoid serializing every attendee on one event write.
    tx.set(eventRef.collection('attendance_shards').doc(attendanceShard(userId)), { count: FieldValue.increment(1) }, { merge: true });
    if (feedback) tx.set(db.collection('event_feedback').doc(`${eventId}_${userId}`), { eventId, userId, userEmail: userSnap.data()?.email || '', rating: feedback.rating, answers: feedback.answers || {}, createdAt: FieldValue.serverTimestamp() });
    tx.set(pendingRef, {
      eventId, userId, eventTitle: event.title, eventTitleEn: event.titleEn || null,
      points, feedbackQuestions: event.feedbackQuestions || [],
      status: feedback ? 'completed' : 'pending',
      attendanceRecorded: true, scannedBy: actorUid, scannedAt: FieldValue.serverTimestamp(),
      ...(feedback ? { completedAt: FieldValue.serverTimestamp() } : {}),
    });
    if (points > 0 && !pointSnap.exists) tx.create(pointRef, { userId, amount: points, source: 'attendance', reason: `Attendance: ${event.title || eventId}`, sourceEventId: eventId, createdBy: input.admin ? actorUid : 'system', createdAt: FieldValue.serverTimestamp(), aggregatedAt: FieldValue.serverTimestamp() });
    queueNotification(tx, `attendance_${eventId}_${userId}_${notificationId}`, userData.email, `تم تأكيد حضورك، النقاط: ${awardedPoints}. / Attendance confirmed, points: ${awardedPoints}.`, event.title);
    audit(tx, input.admin ? 'attendance.manual' : 'attendance.checkin', actorUid, logRef.id, { eventId, awardedPoints });
    return { status: 'success', userId, awardedPoints };
  }, { maxAttempts: 10 });
}

export async function syncEventAttendance(eventId: string, actorUid: string) {
  const db = getFirestore();
  const eventDoc = await db.collection('events').doc(documentId(eventId, 'eventId')).get();
  if (!eventDoc.exists) throw new ApiError('not-found', 'Event not found.');

  const [logsSnap, regsSnap, feedbackSnap, pendingSnap] = await Promise.all([
    db.collection('attendance_logs').where('eventId', '==', eventId).get(),
    db.collection('registrations').where('eventId', '==', eventId).get(),
    db.collection('event_feedback').where('eventId', '==', eventId).get(),
    db.collection('pending_checkins').where('eventId', '==', eventId).get(),
  ]);

  const existingRegMap = new Map<string, FirebaseFirestore.DocumentData>();
  regsSnap.docs.forEach(doc => {
    existingRegMap.set(doc.data().userId, { id: doc.id, ref: doc.ref, ...doc.data() });
  });

  let repairedCount = 0;
  const userIdsToFetch = new Set<string>();

  for (const logDoc of logsSnap.docs) {
    const logData = logDoc.data();
    const userId = logData.userId;
    const existing = existingRegMap.get(userId);
    if (!existing || !existing.timestamp || !existing.userName) {
      userIdsToFetch.add(userId);
    }
  }

  for (const regDoc of regsSnap.docs) {
    const regData = regDoc.data();
    if (!regData.timestamp && regData.userId) {
      userIdsToFetch.add(regData.userId);
    }
  }

  const userMap = new Map<string, FirebaseFirestore.DocumentData>();
  const uidList = Array.from(userIdsToFetch);
  for (let i = 0; i < uidList.length; i += 25) {
    const chunk = uidList.slice(i, i + 25);
    const snaps = await Promise.all(chunk.map(uid => db.collection('users').doc(uid).get()));
    snaps.forEach(s => {
      if (s.exists) userMap.set(s.id, s.data()!);
    });
  }

  const batches: FirebaseFirestore.WriteBatch[] = [db.batch()];
  let currentBatchOps = 0;

  const queueWrite = (ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>, merge = true) => {
    if (currentBatchOps >= 400) {
      batches.push(db.batch());
      currentBatchOps = 0;
    }
    const batch = batches[batches.length - 1];
    batch.set(ref, data, { merge });
    currentBatchOps++;
    repairedCount++;
  };

  for (const logDoc of logsSnap.docs) {
    const logData = logDoc.data();
    const userId = logData.userId;
    const existing = existingRegMap.get(userId);
    const user = userMap.get(userId);
    const regRef = db.collection('registrations').doc(`${eventId}_${userId}`);

    if (!existing) {
      queueWrite(regRef, {
        eventId,
        userId,
        status: 'attended',
        attended: true,
        isWalkIn: true,
        timestamp: logData.timestamp || FieldValue.serverTimestamp(),
        registeredAt: logData.timestamp || FieldValue.serverTimestamp(),
        attendedAt: logData.timestamp || FieldValue.serverTimestamp(),
        userName: user?.arabicFullName || user?.displayName || 'Student',
        userEmail: user?.email || '',
        ...(user?.universityId ? { universityId: user.universityId } : {}),
      }, false);
    } else if (!existing.timestamp || !existing.userName || existing.status !== 'attended') {
      queueWrite(regRef, {
        status: 'attended',
        attended: true,
        timestamp: existing.timestamp || existing.attendedAt || existing.registeredAt || logData.timestamp || FieldValue.serverTimestamp(),
        attendedAt: existing.attendedAt || logData.timestamp || FieldValue.serverTimestamp(),
        ...(!existing.userName ? { userName: user?.arabicFullName || user?.displayName || 'Student' } : {}),
        ...(!existing.userEmail ? { userEmail: user?.email || '' } : {}),
        ...(user?.universityId && !existing.universityId ? { universityId: user.universityId } : {}),
      }, true);
    }
  }

  for (const regDoc of regsSnap.docs) {
    const regData = regDoc.data();
    if (!regData.timestamp) {
      const user = userMap.get(regData.userId);
      queueWrite(regDoc.ref, {
        timestamp: regData.attendedAt || regData.registeredAt || FieldValue.serverTimestamp(),
        ...(!regData.userName && user ? { userName: user.arabicFullName || user.displayName || 'Student' } : {}),
        ...(!regData.userEmail && user ? { userEmail: user.email || '' } : {}),
        ...(user?.universityId && !regData.universityId ? { universityId: user.universityId } : {}),
      }, true);
    }
  }

  if (currentBatchOps > 0) {
    await Promise.all(batches.map(b => b.commit()));
  }

  // Restore feedback obligations lost by the old manual-attendance flow.
  // Recheck each candidate atomically so concurrent feedback or cancellation wins.
  const rated = new Set(feedbackSnap.docs.map(doc => doc.data().userId));
  const pending = new Set(pendingSnap.docs.filter(doc => doc.data().status === 'pending' && doc.data().attendanceRecorded === true).map(doc => doc.data().userId));
  const candidates = logsSnap.docs.filter(doc => !rated.has(doc.data().userId) && !pending.has(doc.data().userId));
  for (let offset = 0; offset < candidates.length; offset += 20) {
    const results = await Promise.all(candidates.slice(offset, offset + 20).map(log => db.runTransaction(async tx => {
      const userId = log.data().userId;
      const taskRef = db.collection('pending_checkins').doc(`${eventId}_${userId}`);
      const [attendance, feedback, task, currentEvent] = await Promise.all([
        tx.get(log.ref), tx.get(db.collection('event_feedback').doc(`${eventId}_${userId}`)),
        tx.get(taskRef), tx.get(eventDoc.ref),
      ]);
      if (!attendance.exists || feedback.exists || !currentEvent.exists || (task.data()?.status === 'pending' && task.data()?.attendanceRecorded === true)) return 0;
      const event = currentEvent.data()!;
      tx.set(taskRef, { eventId, userId, eventTitle: event.title, eventTitleEn: event.titleEn || null,
        points: event.points || 0, feedbackQuestions: event.feedbackQuestions || [], status: 'pending',
        attendanceRecorded: true, scannedAt: FieldValue.serverTimestamp() });
      return 1;
    })));
    repairedCount += results.reduce((sum: number, value) => sum + value, 0);
  }

  if (repairedCount > 0) {
    await db.runTransaction(async tx => {
      audit(tx, 'attendance.sync', actorUid, eventId, { repairedCount, totalLogs: logsSnap.size });
    });
  }

  return { status: 'success', repairedCount, totalAttendance: logsSnap.size };
}

export async function cancelAttendance(input: { eventId: string; targetUserId: string; actorUid: string }) {
  const { eventId, actorUid } = input;
  const userId = await resolveStudentUid(input.targetUserId);
  const db = getFirestore();
  const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
  const regRef = db.collection('registrations').doc(`${eventId}_${documentId(userId, 'userId')}`);
  const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
  const pointRef = db.collection('point_transactions').doc(`attendance_${eventId}_${userId}`);
  const pendingRef = db.collection('pending_checkins').doc(`${eventId}_${userId}`);
  const feedbackRef = db.collection('event_feedback').doc(`${eventId}_${userId}`);

  return db.runTransaction(async tx => {
    const [eventSnap, regSnap, logSnap, pointSnap, userSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(regRef),
      tx.get(logRef),
      tx.get(pointRef),
      tx.get(db.collection('users').doc(userId)),
    ]);

    const event = eventSnap.data();
    if (!event) throw new ApiError('not-found', 'Event not found.');
    if (!logSnap.exists && (!regSnap.exists || regSnap.data()?.status !== 'attended')) {
      throw new ApiError('not-found', 'No attendance record found for this user.');
    }

    // 1. Delete attendance log
    if (logSnap.exists) {
      tx.delete(logRef);
    }

    // 2. Revoke attendance points completely ("سحب كامل ما يطلع خصم")
    let revokedPoints = 0;
    if (pointSnap.exists) {
      revokedPoints = Number(pointSnap.data()?.amount) || 0;
      tx.delete(pointRef);
    }

    if (userSnap.exists) {
      const userData = userSnap.data()!;
      const currentPoints = Number(userData.totalPoints) || 0;
      const totalPoints = Math.max(0, currentPoints - revokedPoints);
      tx.update(userSnap.ref, { totalPoints });
      tx.set(db.collection('public_profiles').doc(userId), publicProfile({ ...userData, totalPoints }));
    }

    // 3. Update or remove registration
    const isRegistrationRequired = event.requiresRegistration !== false && event.type !== 'Booth';
    if (regSnap.exists) {
      const regData = regSnap.data() || {};
      if (regData.isWalkIn || !isRegistrationRequired) {
        tx.delete(regRef);
      } else {
        tx.update(regRef, {
          status: 'approved',
          attended: false,
          attendedAt: FieldValue.delete(),
          updatedBy: actorUid,
        });
      }
    }

    // 4. Decrement event attendanceCount
    if (logSnap.exists) tx.set(eventRef.collection('attendance_shards').doc(attendanceShard(userId)), { count: FieldValue.increment(-1) }, { merge: true });

    // 5. Clean up pending check-in / feedback if any
    tx.delete(pendingRef);
    tx.delete(feedbackRef);

    audit(tx, 'attendance.cancel', actorUid, logRef.id, { eventId, userId, revokedPoints });
    return { status: 'success', eventId, userId, revokedPoints };
  }, { maxAttempts: 10 });
}


function attendanceShard(userId: string): string {
  return String(createHash('sha256').update(userId).digest()[0] % 64);
}
