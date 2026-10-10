import * as functions from 'firebase-functions/v1';
import { verifyAuth } from './utils/auth';
import { documentId, recordAttendance } from './utils/eventLifecycle';

// Compatibility endpoint shares the same attendance transaction as submitCheckIn.
export const processCheckIn = functions.https.onCall((data, context) => {
  const uid = verifyAuth(context);
  return recordAttendance({ eventId: documentId(data?.eventId, 'eventId'), userId: uid, actorUid: uid, admin: false, token: data?.token });
});
