import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { verifyAuth } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const processCheckIn = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  const { token, eventId } = data;

  if (!token || typeof token !== 'string') {
    throwFailedPrecondition('Invalid or missing token.');
  }
  
  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Invalid or missing eventId.');
  }

  const JWT_SECRET = process.env.JWT_SECRET || functions.config().jwt?.secret;
  if (!JWT_SECRET) {
    throwFailedPrecondition('JWT_SECRET is not configured. Please set it in Firebase Secret Manager.');
  }

  let decodedToken: any;
  try {
    decodedToken = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throwFailedPrecondition('Token is invalid or expired.');
  }

  // Verify the token belongs to the event being checked into
  if (decodedToken.eventId !== eventId) {
    throwFailedPrecondition('Token does not match the event.');
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
    
    if (eventSnap.data()?.state !== 'Ongoing') {
      throwFailedPrecondition('Event is not currently accepting attendance.');
    }

    // 2. Verify User Registration
    const regId = `${eventId}_${uid}`;
    const regRef = db.collection('registrations').doc(regId);
    const regSnap = await transaction.get(regRef);

    if (!regSnap.exists) {
      throwFailedPrecondition('You are not registered for this event.');
    }
    
    const currentRegStatus = regSnap.data()?.status;
    if (currentRegStatus !== 'approved' && currentRegStatus !== 'attended') {
      throwFailedPrecondition('Your registration is not approved.');
    }

    // 3. Check for existing attendance (Idempotency)
    const logId = `${eventId}_${uid}`;
    const logRef = db.collection('attendance_logs').doc(logId);
    const logSnap = await transaction.get(logRef);

    if (logSnap.exists) {
      // Already checked in. Return success without writing again.
      return { status: 'already_checked_in' };
    }

    // 4. Write attendance log
    transaction.set(logRef, {
      userId: uid,
      eventId: eventId,
      timestamp: FieldValue.serverTimestamp(),
      verifiedByQR: true,
      tokenNonce: decodedToken.nonce,
    });

    // 4b. Update registration status to attended
    transaction.update(regRef, {
      status: 'attended',
      attendedAt: FieldValue.serverTimestamp(),
    });

    // 5. Award Points Atomically
    const eventData = eventSnap.data();
    const pointsToAward = typeof eventData?.points === 'number' ? eventData.points : 0;
    
    if (pointsToAward > 0) {
      const pointTxId = `attendance_${eventId}_${uid}`;
      const pointTxRef = db.collection('point_transactions').doc(pointTxId);
      
      transaction.set(pointTxRef, {
        userId: uid,
        amount: pointsToAward,
        source: 'attendance',
        reason: `Attended event: ${eventData?.title || 'Unknown'}`,
        sourceEventId: eventId,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { status: 'success' };
  });
});
