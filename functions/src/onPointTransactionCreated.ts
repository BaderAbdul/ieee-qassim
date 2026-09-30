import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onPointTransactionCreated = functions.firestore
  .document('point_transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const userId = data.userId;
    const amount = typeof data.amount === 'number' ? data.amount : data.points;

    if (!userId || typeof amount !== 'number') {
      console.error('Invalid point transaction data:', data);
      return null;
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    // Atomically increment the user's totalPoints cache
    try {
      await userRef.update({
        totalPoints: FieldValue.increment(amount)
      });
      console.log(`Successfully updated totalPoints for user ${userId} by ${amount}`);
    } catch (error: any) {
      // If the user document doesn't exist or doesn't have totalPoints, we might need to set it
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
        await userRef.set({
          totalPoints: amount
        }, { merge: true });
        console.log(`Created and set totalPoints for user ${userId} to ${amount}`);
      } else {
        console.error('Error updating totalPoints:', error);
        throw error;
      }
    }

    return null;
  });
