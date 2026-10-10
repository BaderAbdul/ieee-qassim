import * as functions from 'firebase-functions/v1';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { changeRegistration, documentId } from './utils/eventLifecycle';

export const registerForEvent = functions.https.onCall((data, context) =>
  changeRegistration(verifyAuth(context), documentId(data?.eventId, 'eventId'), 'register'));

export const cancelRegistration = functions.https.onCall((data, context) =>
  changeRegistration(verifyAuth(context), documentId(data?.eventId, 'eventId'), 'cancel'));

export const manageRegistration = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  await verifyAdmin(uid);
  if (!['approve', 'reject', 'cancel'].includes(data?.action)) throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
  return changeRegistration(documentId(data?.userId, 'userId'), documentId(data?.eventId, 'eventId'), data.action, uid);
});
