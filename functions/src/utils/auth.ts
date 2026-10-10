import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { throwUnauthenticated, throwUnauthorized } from './errors';

export const verifyAuth = (context: functions.https.CallableContext) => {
  if (!context.auth || !context.auth.uid) {
    throwUnauthenticated();
  }
  return context.auth!.uid;
};

export const verifyAdmin = async (uid: string) => {
  const userSnap = await getFirestore().collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throwUnauthorized('User profile not found.');
  }
  
  const role = userSnap.data()?.role;
  if (userSnap.data()?.isRestricted) throwUnauthorized('Account is restricted.');
  if (role !== 'event_organizer' && role !== 'super_admin') {
    throwUnauthorized('Admin access required.');
  }
  
  return { uid, role };
};
