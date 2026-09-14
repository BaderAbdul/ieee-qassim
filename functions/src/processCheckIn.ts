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

  const JWT_SECRET = process.env.JWT_SECRET || functions.config().jwt?.secret || 'fallback_secret_do_not_use_in_prod_123!';

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
    
    if (regSnap.data()?.status !== 'approved') {
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
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      verifiedByQR: true,
      tokenNonce: decodedToken.nonce,
    });

    return { status: 'success' };
  });
});
