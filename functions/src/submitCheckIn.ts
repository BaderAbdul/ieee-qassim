import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const submitCheckIn = functions.https.onCall(async (data, context) => {
  const callerUid = verifyAuth(context);
  const { eventId, token, targetUserId } = data;

  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Invalid or missing eventId.');
  }

  const db = admin.firestore();
  
  // Use a transaction to ensure idempotency and verify state securely
  return db.runTransaction(async (transaction) => {
    // 1. Verify Event State
    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await transaction.get(eventRef);
    
    if (!eventSnap.exists) {
      throwFailedPrecondition('Event not found.');
    }
    
    const eventData = eventSnap.data();
    
    // Check if the caller is an Admin (can bypass some restrictions)
    const callerUserSnap = await transaction.get(db.collection('users').doc(callerUid));
    const callerRole = callerUserSnap.data()?.role;
    const isAdmin = callerRole === 'super_admin' || callerRole === 'event_organizer';

    // Determine WHO is being checked in
    let uidToCheckIn = callerUid;

    if (isAdmin && targetUserId) {
      uidToCheckIn = targetUserId.replace('ieee-qu-user:', ''); // Strip prefix if scanned from QR
    } else {
      // If it's a student checking themselves in, they MUST provide the static token
      if (!token || typeof token !== 'string') {
        throwFailedPrecondition('Invalid or missing token.');
      }
      if (eventData?.checkinToken !== token) {
        throwFailedPrecondition('Check-in link is invalid or expired.');
      }
    }

    if (eventData?.state !== 'Ongoing' && !isAdmin) {
      throwFailedPrecondition('Event is not currently accepting attendance.');
    }

    // 2. Verify User Registration
    const regId = `${eventId}_${uidToCheckIn}`;
    const regRef = db.collection('registrations').doc(regId);
    const regSnap = await transaction.get(regRef);

    if (!regSnap.exists) {
      if (isAdmin) {
        throwFailedPrecondition('User is not registered for this event.');
      } else {
        throwFailedPrecondition('You are not registered for this event.');
      }
    }
    
    const currentRegStatus = regSnap.data()?.status;
    if (currentRegStatus !== 'approved' && currentRegStatus !== 'attended') {
      throwFailedPrecondition('Registration is not approved.');
    }

    // 3. Check for existing attendance (Idempotency)
    const logId = `${eventId}_${uidToCheckIn}`;
    const logRef = db.collection('attendance_logs').doc(logId);
    const logSnap = await transaction.get(logRef);

    if (logSnap.exists) {
      // Already checked in. Return success without writing again.
      return { status: 'already_checked_in', userId: uidToCheckIn };
    }

    // 4. Write attendance log
    transaction.set(logRef, {
      userId: uidToCheckIn,
      eventId: eventId,
      timestamp: FieldValue.serverTimestamp(),
      verifiedByAdmin: isAdmin && targetUserId ? callerUid : false,
    });

    // 4b. Update registration status to attended
    transaction.update(regRef, {
      status: 'attended',
      attended: true,
      attendedAt: FieldValue.serverTimestamp(),
    });

    // 5. Award Points Atomically
    const pointsToAward = typeof eventData?.points === 'number' ? eventData.points : 0;
    
    if (pointsToAward > 0) {
      const pointTxId = `attendance_${eventId}_${uidToCheckIn}`;
      const pointTxRef = db.collection('point_transactions').doc(pointTxId);
      
      transaction.set(pointTxRef, {
        userId: uidToCheckIn,
        amount: pointsToAward,
        source: 'attendance',
        reason: `حضور فعالية: ${eventData?.title || 'Unknown'}`,
        sourceEventId: eventId,
        createdBy: isAdmin ? callerUid : 'system',
        createdAt: FieldValue.serverTimestamp(),
        type: 'earned',
        points: pointsToAward,
        description: `حضور فعالية: ${eventData?.title || 'Unknown'}`,
        timestamp: FieldValue.serverTimestamp()
      });

      // User total points will be updated by the onPointTransactionCreated trigger
      // to maintain a single source of truth and prevent double-counting.
    }

    return { status: 'success', userId: uidToCheckIn, awardedPoints: pointsToAward };
  });
});
