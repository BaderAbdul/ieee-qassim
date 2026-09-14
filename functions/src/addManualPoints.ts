import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const addManualPoints = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  await verifyAdmin(adminUid); // Only admins can do manual adjustments

  const { studentUid, amount, reason } = data;

  if (!studentUid || typeof studentUid !== 'string') {
    throwFailedPrecondition('Invalid or missing studentUid.');
  }
  
  if (typeof amount !== 'number' || amount === 0) {
    throwFailedPrecondition('Invalid amount. Must be a non-zero number.');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throwFailedPrecondition('Reason is required for manual point adjustments.');
  }

  const db = admin.firestore();
  
  // Create a new point transaction
  // Using auto-ID since manual adjustments can happen multiple times for a student
  const pointTxRef = db.collection('point_transactions').doc();
  
  await pointTxRef.set({
    userId: studentUid,
    amount: amount,
    source: 'manual_adjustment',
    reason: reason.trim(),
    createdBy: adminUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: 'success', transactionId: pointTxRef.id };
});
