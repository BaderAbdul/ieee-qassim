import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth } from './utils/auth';
import { throwFailedPrecondition, throwNotFound } from './utils/errors';

export const getCertificateDownloadUrl = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  const { certificateId } = data;

  if (!certificateId || typeof certificateId !== 'string') {
    throwFailedPrecondition('Missing or invalid certificateId.');
  }

  const db = admin.firestore();
  const certRef = db.collection('certificates').doc(certificateId);
  const certSnap = await certRef.get();

  if (!certSnap.exists) {
    throwNotFound('Certificate not found.');
  }

  const certData = certSnap.data();

  // Verify ownership or admin role (roles are stored in Firestore, not JWT custom claims)
  let isAdmin = false;
  const userSnap = await admin.firestore().collection('users').doc(uid).get();
  const role = userSnap.data()?.role;
  if (role === 'super_admin' || role === 'event_organizer') {
    isAdmin = true;
  }

  if (certData?.userId !== uid && !isAdmin) {
    throwFailedPrecondition('You do not have permission to access this certificate.');
  }

  if (certData?.status !== 'Available') {
    throwFailedPrecondition(`Certificate is not available. Current status: ${certData?.status}`);
  }

  const storagePath = certData!.storagePath;
  if (!storagePath) {
    throwFailedPrecondition('Certificate storage path is missing.');
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    // Check if file exists in storage
    const [exists] = await file.exists();
    if (!exists) {
      throwNotFound('Certificate file not found in storage.');
    }

    // Generate a short-lived signed URL (e.g., valid for 15 minutes)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes from now
    });

    return { status: 'success', url };
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    throwFailedPrecondition('Failed to generate download URL.');
  }
  return { status: 'error' };
});
