import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ApiError } from './errors';
import { audit } from './audit';

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

const namePattern = /^[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\u064B-\u065F\s]+$/u;
export function normalizeUniversityId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

/** Claims serialize simultaneous profile saves; the legacy query protects existing IDs. */
export async function saveProfile(uid: string, input: Record<string, unknown>) {
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const ref = db.collection('users').doc(uid);
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.isRestricted) throw new ApiError('permission-denied', 'Account is unavailable.');
    const old = snap.data()!;
    const combined = { ...old, ...input };
    const names = Object.fromEntries(['firstName', 'fatherName', 'familyName'].map(field => {
      const value = combined[field];
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 45 || !namePattern.test(value.trim())) throw new ApiError('invalid-argument', 'Enter your first, father and family names in Arabic.');
      return [field, value.trim().replace(/\s+/g, ' ')];
    }));
    if (typeof combined.isQassimStudent !== 'boolean') throw new ApiError('invalid-argument', 'Select whether you are a Qassim student.');
    const universityId = combined.isQassimStudent ? normalizeUniversityId(combined.universityId) : '';
    const academic: Record<string, string | null> = {};
    for (const field of ['college', 'major', 'academicLevel']) {
      const value = combined[field];
      if (combined.isQassimStudent && (typeof value !== 'string' || !value.trim() || value.trim().length > 150)) throw new ApiError('invalid-argument', 'Complete your college, major and academic level.');
      academic[field] = combined.isQassimStudent ? String(value).trim() : null;
    }
    if (combined.isQassimStudent && !/^\d{9}$/.test(universityId)) throw new ApiError('invalid-argument', 'University ID must contain 9 digits.');
    const claim = universityId ? db.collection('university_ids').doc(universityId) : null;
    const oldId = normalizeUniversityId(old.universityId);
    const oldClaim = oldId && oldId !== universityId ? db.collection('university_ids').doc(oldId) : null;
    const [claimSnap, oldClaimSnap, legacy] = await Promise.all([
      claim ? tx.get(claim) : null,
      oldClaim ? tx.get(oldClaim) : null,
      universityId ? tx.get(db.collection('users').where('universityId', '==', universityId).limit(2)) : null,
    ]);
    if ((claimSnap?.exists && claimSnap.data()?.userId !== uid) || legacy?.docs.some(doc => doc.id !== uid)) throw new ApiError('already-exists', 'This university ID is already used. / الرقم الجامعي مستخدم لحساب آخر.');
    const update = { ...names, ...academic, arabicFullName: Object.values(names).join(' '), isQassimStudent: combined.isQassimStudent, universityId: universityId || null, profileCompleted: true, profileCompletedAt: old.profileCompletedAt || new Date().toISOString() };
    if (claim) tx.set(claim, { userId: uid, updatedAt: FieldValue.serverTimestamp() });
    if (oldClaim && oldClaimSnap?.data()?.userId === uid) tx.delete(oldClaim);
    tx.update(ref, update);
    tx.set(db.collection('public_profiles').doc(uid), publicProfile({ ...old, ...update }));
    audit(tx, 'profile.save', uid, uid, { fields: Object.keys(update).filter(field => field !== 'universityId') });
    return { status: 'success', profileCompleted: true };
  });
}
