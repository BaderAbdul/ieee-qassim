import * as functions from 'firebase-functions/v1';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, verifyAuth } from './utils/auth';
import { documentId } from './utils/eventLifecycle';

export const saveExternalCertificate = functions.https.onCall(async (data, context) => {
  const actor = verifyAuth(context);
  await verifyAdmin(actor);
  const eventId = documentId(data?.eventId, 'eventId');
  const userId = documentId(data?.userId, 'userId');
  let url: URL;
  try { url = new URL(data?.url); } catch { throw new functions.https.HttpsError('invalid-argument', 'Invalid certificate URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) throw new functions.https.HttpsError('invalid-argument', 'Use an HTTPS certificate URL.');
  const db = getFirestore();
  const id = `certificate_${eventId}_${userId}`;
  return db.runTransaction(async tx => {
    const ref = db.collection('certificates').doc(id);
    const [event, log, user, existing] = await Promise.all([
      tx.get(db.collection('events').doc(eventId)),
      tx.get(db.collection('attendance_logs').doc(`${eventId}_${userId}`)),
      tx.get(db.collection('users').doc(userId)), tx.get(ref),
    ]);
    if (event.data()?.state !== 'Completed' || !event.data()?.hasCertificate || !log.exists || !user.exists) throw new functions.https.HttpsError('failed-precondition', 'A completed event and verified attendance are required.');
    if (existing.data()?.status === 'Revoked' || existing.data()?.status === 'Generating') throw new functions.https.HttpsError('failed-precondition', 'Certificate cannot be replaced in this state.');
    tx.set(ref, {
      id, eventId, userId, status: 'Available', externalUrl: url.href,
      studentName: user.data()?.arabicFullName || user.data()?.displayName || 'Student',
      eventTitle: event.data()?.title || '', eventType: event.data()?.type || 'Other',
      attendanceDate: log.data()?.timestamp,
      issueDate: FieldValue.serverTimestamp(), createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(), attemptCount: 1, issuedBy: actor,
    });
    return { status: 'success' };
  });
});
