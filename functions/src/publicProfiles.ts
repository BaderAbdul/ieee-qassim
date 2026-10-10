import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';

export function publicProfile(data: FirebaseFirestore.DocumentData) {
  const fields = ['displayName', 'arabicFullName', 'firstName', 'familyName', 'photoURL', 'role', 'totalPoints', 'badges', 'publicProfile', 'cardPreferences', 'createdAt', 'college', 'major'];
  const result = Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  if (data.publicProfile) result.publicProfile = Object.fromEntries(['avatar', 'bio', 'linkedin'].filter(key => data.publicProfile[key] !== undefined).map(key => [key, data.publicProfile[key]]));
  if (data.cardPreferences) result.cardPreferences = Object.fromEntries(['theme', 'pattern'].filter(key => data.cardPreferences[key] !== undefined).map(key => [key, data.cardPreferences[key]]));
  return result;
}

// Read the current source within a transaction: delayed triggers cannot publish stale data.
export async function syncPublicProfile(userId: string) {
  const db = getFirestore();
  await db.runTransaction(async tx => {
    const source = await tx.get(db.collection('users').doc(userId));
    const target = db.collection('public_profiles').doc(userId);
    if (!source.exists || source.data()?.isRestricted) tx.delete(target);
    else tx.set(target, publicProfile(source.data()!));
  });
}

export const onUserProfileWritten = functions.runWith({ failurePolicy: true }).firestore.document('users/{userId}')
  .onWrite((_change, context) => syncPublicProfile(context.params.userId));
