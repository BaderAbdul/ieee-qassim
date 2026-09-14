import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const manualAttendanceOverride = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  await verifyAdmin(adminUid); // Only admins can do manual overrides

  const { studentUid, eventId } = data;

  if (!studentUid || typeof studentUid !== 'string') {
    throwFailedPrecondition('Invalid or missing studentUid.');
  }
  
  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Invalid or missing eventId.');
  }

  const db = admin.firestore();
  
  // Use a transaction to ensure idempotency and verify state securely
  return db.runTransaction(async (transaction) => {
    // 1. Verify Event Exists
    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await transaction.get(eventRef);
    
    if (!eventSnap.exists) {
      throwFailedPrecondition('Event not found.');
    }
    
    // We don't enforce 'Ongoing' for manual override because admins might correct attendance after the fact.

    // 2. Verify User Registration
    const regId = `${eventId}_${studentUid}`;
    const regRef = db.collection('registrations').doc(regId);
    const regSnap = await transaction.get(regRef);

    if (!regSnap.exists) {
      throwFailedPrecondition('Student is not registered for this event.');
    }
    
    if (regSnap.data()?.status !== 'approved') {
      throwFailedPrecondition('Student registration is not approved.');
    }

    // 3. Check for existing attendance (Idempotency)
    const logId = `${eventId}_${studentUid}`;
    const logRef = db.collection('attendance_logs').doc(logId);
    const logSnap = await transaction.get(logRef);

    if (logSnap.exists) {
      return { status: 'already_checked_in' };
    }

    // 4. Write attendance log
    transaction.set(logRef, {
      userId: studentUid,
      eventId: eventId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      verifiedByQR: false,
      manualOverride: true,
      overriddenBy: adminUid,
      overrideTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Award Points Atomically
    const eventData = eventSnap.data();
    const pointsToAward = typeof eventData?.points === 'number' ? eventData.points : 0;
    
    if (pointsToAward > 0) {
      const pointTxId = `attendance_${eventId}_${studentUid}`;
      const pointTxRef = db.collection('point_transactions').doc(pointTxId);
      
      transaction.set(pointTxRef, {
        userId: studentUid,
        amount: pointsToAward,
        source: 'attendance_override',
        reason: `Manual attendance for event: ${eventData?.title || 'Unknown'}`,
        sourceEventId: eventId,
        createdBy: adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { status: 'success' };
  });
});
