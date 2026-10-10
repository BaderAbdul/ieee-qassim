import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { randomBytes } from 'node:crypto';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { documentId } from './utils/eventLifecycle';

// Tokens stay out of public event documents and expire after 15 minutes.
export const generateCheckInToken = functions.https.onCall(async (data, context) => {
  await verifyAdmin(verifyAuth(context));
  const eventId = documentId(data?.eventId, 'eventId');
  const token = randomBytes(32).toString('hex');
  const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
  await getFirestore().runTransaction(async tx => {
    const event = await tx.get(getFirestore().collection('events').doc(eventId));
    if (!event.exists || event.data()?.state !== 'Ongoing') throw new functions.https.HttpsError('failed-precondition', 'Event must be Ongoing.');
    tx.set(getFirestore().collection('event_secrets').doc(eventId), { token, expiresAt });
  });
  return { token, expiresAt: expiresAt.toMillis() };
});
