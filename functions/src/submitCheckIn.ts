import * as functions from 'firebase-functions/v1';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { documentId, recordAttendance } from './utils/eventLifecycle';

export const submitCheckIn = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  const eventId = documentId(data?.eventId, 'eventId');
  const isAdmin = Boolean(data?.targetUserId);
  if (isAdmin) await verifyAdmin(uid);
  const userId = isAdmin ? documentId(data.targetUserId, 'userId').replace('ieee-qu-user:', '') : uid;
  return recordAttendance({ eventId, userId, actorUid: uid, admin: isAdmin, token: data?.token, feedback: data?.feedbackData });
});
