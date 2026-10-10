import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { verifyAuth } from './utils/auth';

// Checks availability without exposing student documents to other students.
export const checkUniversityId = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  if (typeof data?.universityId !== 'string' || !/^\d{9}$/.test(data.universityId)) throw new functions.https.HttpsError('invalid-argument', 'Invalid university ID.');
  const matches = await getFirestore().collection('users').where('universityId', '==', data.universityId).limit(2).get();
  return { available: matches.docs.every(doc => doc.id === uid) };
});
