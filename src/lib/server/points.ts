import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ApiError } from './errors';
import { documentId } from './lifecycle';
import { publicProfile } from './profiles';
import { audit } from './audit';

export async function adjustPoints(actorUid: string, input: Record<string, unknown>) {
  const uid = documentId(input.studentUid, 'studentUid');
  const operationId = documentId(input.operationId, 'operationId');
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(operationId)) throw new ApiError('invalid-argument', 'A unique operation ID is required.');
  if (!Number.isSafeInteger(input.amount) || input.amount === 0 || Math.abs(Number(input.amount)) > 100000 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000) throw new ApiError('invalid-argument', 'Invalid points adjustment.');
  const amount = Number(input.amount); const reason = input.reason.trim();
  const db = getFirestore();
  const id = `manual_${createHash('sha256').update(`${actorUid}:${operationId}`).digest('hex')}`;
  const ref = db.collection('point_transactions').doc(id);
  return db.runTransaction(async tx => {
    const [user, previous] = await Promise.all([tx.get(db.collection('users').doc(uid)), tx.get(ref)]);
    if (previous.exists) {
      const data = previous.data()!;
      if (data.userId !== uid || data.amount !== amount || data.reason !== reason) throw new ApiError('already-exists', 'Operation ID was already used for a different adjustment.');
      return { status: 'success', transactionId: id, totalPoints: data.balanceAfter, replayed: true };
    }
    if (!user.exists) throw new ApiError('not-found', 'Student not found.');
    if (user.data()?.isRestricted) throw new ApiError('failed-precondition', 'Student account is unavailable.');
    const balanceBefore = Math.max(0, Number(user.data()?.totalPoints) || 0);
    if (balanceBefore + amount < 0) throw new ApiError('failed-precondition', 'Deduction exceeds the current balance. / الخصم يتجاوز الرصيد الحالي.');
    const totalPoints = balanceBefore + amount;
    const badges = [...new Set([...(user.data()?.badges || []), ...(totalPoints >= 100 ? ['century_club'] : []), ...(totalPoints >= 250 ? ['engineering_leader'] : [])])];
    tx.create(ref, { userId: uid, amount, source: 'manual_adjustment', reason, operationId, balanceBefore, balanceAfter: totalPoints, createdBy: actorUid, createdAt: FieldValue.serverTimestamp(), aggregatedAt: FieldValue.serverTimestamp() });
    tx.update(user.ref, { totalPoints, badges });
    tx.set(db.collection('public_profiles').doc(uid), publicProfile({ ...user.data(), totalPoints, badges }));
    audit(tx, 'points.adjust', actorUid, uid, { transactionId: id, amount, before: balanceBefore, after: totalPoints, reason });
    return { status: 'success', transactionId: id, totalPoints, replayed: false };
  });
}
