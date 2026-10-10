import * as functions from 'firebase-functions/v1';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { documentId, recordAttendance } from './utils/eventLifecycle';

export const manualAttendanceOverride = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  await verifyAdmin(uid);
  return recordAttendance({ eventId: documentId(data?.eventId, 'eventId'), userId: documentId(data?.studentUid, 'studentUid'), actorUid: uid, admin: true });
});
