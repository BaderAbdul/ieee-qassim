import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ApiError } from './errors';
import { audit } from './audit';

const textLimits: Record<string, number> = { membersCount: 40, eventsCount: 40, tracksCount: 40, adminsCount: 40, heroTitle: 180, heroSubtitleAr: 1000, heroSubtitleEn: 1000, featuredEventId: 128 };
const optionalText = (value: unknown, max: number) => value === undefined || (typeof value === 'string' && value.length <= max);
const optionalURL = (value: unknown) => {
  if (value === undefined || value === '') return true;
  try { const url = new URL(String(value)); return typeof value === 'string' && url.protocol === 'https:' && !url.username && !url.password && value.length <= 2000; }
  catch { return false; }
};

export async function saveHomepage(actorUid: string, input: Record<string, unknown>) {
  const allowed = new Set([...Object.keys(textLimits), 'showStructure', 'committees', 'expectedStructureRevision']);
  if (!Object.keys(input).length || Object.keys(input).some(key => !allowed.has(key))) throw new ApiError('invalid-argument', 'Invalid homepage fields.');
  for (const [key, max] of Object.entries(textLimits)) if (!optionalText(input[key], max)) throw new ApiError('invalid-argument', `Invalid ${key}.`);
  if (input.showStructure !== undefined && typeof input.showStructure !== 'boolean') throw new ApiError('invalid-argument', 'Invalid structure visibility.');
  if (input.committees !== undefined) {
    if (!Array.isArray(input.committees) || input.committees.length > 50 || !Number.isSafeInteger(input.expectedStructureRevision)) throw new ApiError('invalid-argument', 'Invalid structure or revision.');
    const ids = new Set<string>();
    for (const committee of input.committees) {
      if (!committee || typeof committee !== 'object' || typeof committee.id !== 'string' || !committee.id || committee.id.length > 128 || ids.has(committee.id) || typeof committee.name !== 'string' || !committee.name.trim() || !optionalText(committee.name, 150) || !optionalText(committee.englishName, 150) || !optionalText(committee.description, 2000) || !optionalText(committee.iconName, 50) || !Array.isArray(committee.members) || committee.members.length > 200) throw new ApiError('invalid-argument', 'Invalid committee.');
      ids.add(committee.id);
      const members = new Set<string>();
      for (const member of committee.members) {
        if (!member || typeof member.userId !== 'string' || !member.userId || member.userId.length > 128 || members.has(member.userId) || typeof member.name !== 'string' || !member.name.trim() || !optionalText(member.name, 150) || !optionalText(member.role, 150) || !optionalText(member.englishName, 150) || !optionalText(member.englishRole, 150) || !optionalURL(member.linkedin) || !optionalURL(member.avatar)) throw new ApiError('invalid-argument', 'Invalid committee member or HTTPS link.');
        members.add(member.userId);
      }
    }
  }
  const update = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'expectedStructureRevision'));
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const ref = db.collection('settings').doc('homepage');
    const old = (await tx.get(ref)).data() || {};
    if (input.committees !== undefined && Number(old.structureRevision || 0) !== input.expectedStructureRevision) throw new ApiError('failed-precondition', 'Another organizer changed the structure. Reload it before saving. / تغيرت الهيكلة من منظم آخر؛ أعد تحميلها قبل الحفظ.');
    if (typeof input.featuredEventId === 'string' && input.featuredEventId) {
      if (input.featuredEventId.includes('/')) throw new ApiError('invalid-argument', 'Invalid featured event.');
      const event = await tx.get(db.collection('events').doc(input.featuredEventId));
      if (!event.exists || !['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed'].includes(event.data()?.state)) throw new ApiError('failed-precondition', 'Choose a publicly visible event.');
    }
    const structureRevision = Number(old.structureRevision || 0) + (input.committees !== undefined ? 1 : 0);
    tx.set(ref, { ...update, ...(input.committees !== undefined ? { structureRevision } : {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    audit(tx, input.committees !== undefined ? 'content.structure' : 'content.homepage', actorUid, 'homepage', { fields: Object.keys(update) });
    return { status: 'success', structureRevision };
  });
}
