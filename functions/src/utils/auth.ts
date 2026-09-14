import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { throwUnauthenticated, throwUnauthorized } from './errors';

export const verifyAuth = (context: functions.https.CallableContext) => {
  if (!context.auth || !context.auth.uid) {
    throwUnauthenticated();
  }
  return context.auth!.uid;
};

export const verifyAdmin = async (uid: string) => {
  const userSnap = await admin.firestore().collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throwUnauthorized('User profile not found.');
  }
  
  const role = userSnap.data()?.role;
  if (role !== 'event_organizer' && role !== 'super_admin') {
    throwUnauthorized('Admin access required.');
  }
  
  return { uid, role };
};
