import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const generateCheckInToken = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  await verifyAdmin(uid); // Only admins can generate QR tokens

  const { eventId } = data;
  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Invalid eventId.');
  }

  const db = admin.firestore();
  const eventSnap = await db.collection('events').doc(eventId).get();
  
  if (!eventSnap.exists) {
    throwFailedPrecondition('Event not found.');
  }

  const eventData = eventSnap.data()!;
  if (eventData.state !== 'Ongoing') {
    throwFailedPrecondition('Event must be Ongoing to generate tokens.');
  }

  // Get the secret from environment config (firebase functions:config:set or dotenv)
  // For V1, we'll use a strong fallback if env var is missing, but in production, this should be set in Secrets Manager.
  const JWT_SECRET = process.env.JWT_SECRET || functions.config().jwt?.secret || 'fallback_secret_do_not_use_in_prod_123!';

  // Create a payload with a nonce to prevent replay attacks and limit lifespan to 60 seconds
  const payload = {
    eventId,
    nonce: Date.now() + Math.random().toString(36).substring(2),
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '60s' });

  return { token };
});
