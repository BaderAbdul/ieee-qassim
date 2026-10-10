import { getStorage } from 'firebase-admin/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const revokeCertificate = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  const { role } = await verifyAdmin(adminUid);

  if (role !== 'super_admin' && role !== 'event_organizer') {
    throwFailedPrecondition('Insufficient permissions. Only Organizers or Super Admins can revoke certificates.');
  }

  const { certificateId } = data;

  if (!certificateId || typeof certificateId !== 'string') {
    throwFailedPrecondition('Missing or invalid certificateId.');
  }

  const db = getFirestore();
  
  await db.runTransaction(async (transaction) => {
    const certRef = db.collection('certificates').doc(certificateId);
    const certSnap = await transaction.get(certRef);

    if (!certSnap.exists) {
      throwFailedPrecondition('Certificate not found.');
    }

    const certData = certSnap.data();
    
    if (certData?.status !== 'Available') {
      throwFailedPrecondition('Only Available certificates can be revoked.');
    }

    transaction.update(certRef, {
      status: 'Revoked',
      revokedBy: adminUid,
      revokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // We could delete the storage object in a post-transaction step
    // Using transaction.get allows us to read it safely
  });

  // Post-transaction, delete the file from Storage to ensure it's completely gone.
  try {
    const certRef = db.collection('certificates').doc(certificateId);
    const certSnap = await certRef.get();
    const certData = certSnap.data();
    if (certData?.storagePath) {
      const bucket = getStorage().bucket();
      const file = bucket.file(certData.storagePath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
    }
  } catch (err) {
    console.error(`Failed to delete storage object for revoked cert ${certificateId}:`, err);
    // Certificate is still marked Revoked in DB, which is the absolute truth anyway.
  }

  return { status: 'success' };
});
