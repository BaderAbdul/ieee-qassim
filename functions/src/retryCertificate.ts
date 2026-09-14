import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const retryCertificate = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  const { role } = await verifyAdmin(adminUid);

  if (role !== 'super_admin' && role !== 'event_organizer') {
    throwFailedPrecondition('Insufficient permissions. Only Organizers or Super Admins can retry certificates.');
  }

  const { certificateId } = data;

  if (!certificateId || typeof certificateId !== 'string') {
    throwFailedPrecondition('Missing or invalid certificateId.');
  }

  const db = admin.firestore();
  
  await db.runTransaction(async (transaction) => {
    const certRef = db.collection('certificates').doc(certificateId);
    const certSnap = await transaction.get(certRef);

    if (!certSnap.exists) {
      throwFailedPrecondition('Certificate not found.');
    }

    const certData = certSnap.data();
    
    if (certData?.status !== 'Failed') {
      throwFailedPrecondition('Only Failed certificates can be retried.');
    }

    transaction.update(certRef, {
      status: 'Generating', // This will re-trigger the generateCertificate function
      updatedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete(), // clear the old error
    });
  });

  return { status: 'success' };
});
