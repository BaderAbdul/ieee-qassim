import * as functions from 'firebase-functions/v1';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Firestore delivers events at least once; the marker and total must commit together.
export async function aggregatePoints(transactionId: string) {
  const db = getFirestore();
  const ledger = db.collection('point_transactions').doc(transactionId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ledger);
    const data = snap.data();
    if (!data || data.aggregatedAt) return;
    const amount = data.amount ?? data.points;
    if (!Number.isSafeInteger(amount) || !data.userId) throw new Error('Invalid points ledger entry.');
    const userRef = db.collection('users').doc(data.userId);
    const [user, attendance] = await Promise.all([
      tx.get(userRef), tx.get(db.collection('attendance_logs').where('userId', '==', data.userId).limit(5)),
    ]);
    if (!user.exists) throw new Error('Points owner does not exist.');
    const totalPoints = Math.max(0, (user.data()?.totalPoints || 0) + amount);
    const badges = new Set<string>(user.data()?.badges || []);
    if (attendance.size >= 1) badges.add('ieee_starter');
    if (attendance.size >= 3) badges.add('active_engineer');
    if (attendance.size >= 5) badges.add('tech_pioneer');
    if (totalPoints >= 100) badges.add('century_club');
    if (totalPoints >= 250) badges.add('engineering_leader');
    tx.update(userRef, { totalPoints, badges: Array.from(badges) });
    tx.update(ledger, { aggregatedAt: FieldValue.serverTimestamp() });
  });
}

export const onPointTransactionCreated = functions.runWith({ failurePolicy: true }).firestore
  .document('point_transactions/{transactionId}').onCreate((_snap, context) => aggregatePoints(context.params.transactionId));
