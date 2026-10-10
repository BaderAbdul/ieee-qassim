import { getFirestore } from 'firebase-admin/firestore';

export function publicProfile(data: FirebaseFirestore.DocumentData) {
  const fields = ['displayName', 'arabicFullName', 'firstName', 'familyName', 'photoURL', 'role', 'totalPoints', 'badges', 'createdAt', 'college', 'major'];
  const result = Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  for (const [field, keys] of [['publicProfile', ['avatar', 'bio', 'linkedin']], ['cardPreferences', ['theme', 'pattern']]] as const) {
    if (data[field]) result[field] = Object.fromEntries(keys.filter(key => data[field][key] !== undefined).map(key => [key, data[field][key]]));
  }
  return result;
}

export async function syncPublicProfile(uid: string) {
  const db = getFirestore();
  await db.runTransaction(async tx => {
    const source = await tx.get(db.collection('users').doc(uid));
    const target = db.collection('public_profiles').doc(uid);
    if (!source.exists || source.data()?.isRestricted) tx.delete(target);
    else tx.set(target, publicProfile(source.data()!));
  });
}
