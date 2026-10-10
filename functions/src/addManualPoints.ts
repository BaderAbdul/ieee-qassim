import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';
import { documentId } from './utils/eventLifecycle';

export const addManualPoints = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  await verifyAdmin(adminUid); // Only admins can do manual adjustments

  const { studentUid, amount, reason } = data;
  documentId(studentUid, 'studentUid');

  if (!studentUid || typeof studentUid !== 'string') {
    throwFailedPrecondition('Invalid or missing studentUid.');
  }
  
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
    throwFailedPrecondition('Invalid amount. Must be a non-zero number.');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throwFailedPrecondition('Reason is required for manual point adjustments.');
  }

  const db = getFirestore();
  if (!(await db.collection('users').doc(studentUid).get()).exists) {
    throwFailedPrecondition('Student profile not found.');
  }
  
  // Create a new point transaction
  // Using auto-ID since manual adjustments can happen multiple times for a student
  const pointTxRef = db.collection('point_transactions').doc();
  
  await pointTxRef.set({
    userId: studentUid,
    amount: amount,
    source: 'manual_adjustment',
    reason: reason.trim(),
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { status: 'success', transactionId: pointTxRef.id };
});
