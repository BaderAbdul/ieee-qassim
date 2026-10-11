import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ApiError } from './errors';
import { documentId } from './lifecycle';
import { publicProfile, normalizeUniversityId } from './profiles';
import { audit } from './audit';

const memberFields = ['role', 'email', 'displayName', 'arabicFullName', 'firstName', 'fatherName', 'familyName', 'photoURL', 'totalPoints', 'universityId', 'college', 'major', 'academicLevel', 'isQassimStudent', 'profileCompleted', 'isRestricted', 'archivedAt', 'publicProfile', 'createdAt'];
export function memberRecord(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return { id: doc.id, ...Object.fromEntries(memberFields.filter(field => data[field] !== undefined).map(field => [field, data[field]?.toDate ? data[field].toDate().toISOString() : data[field]])) };
}

export async function searchMembers(input: Record<string, unknown>) {
  const db = getFirestore();
  const term = typeof input.query === 'string' ? input.query.trim() : '';
  if (term.length > 150) throw new ApiError('invalid-argument', 'Search text is too long.');
  if (!term) {
    let query = db.collection('users').orderBy('__name__').limit(51);
    if (input.cursor) query = query.startAfter(documentId(input.cursor, 'cursor'));
    const snap = await query.get(); const docs = snap.docs.slice(0, 50);
    return { users: docs.map(memberRecord), nextCursor: snap.size > 50 ? docs.at(-1)!.id : null, hasMore: snap.size > 50, truncated: false };
  }
  const queries = ['arabicFullName', 'displayName', 'email'].map(field => {
    const value = field === 'email' ? term.toLowerCase() : term;
    return db.collection('users').orderBy(field).startAt(value).endAt(`${value}\uf8ff`).limit(51).get();
  });
  const [results, numeric, exact] = await Promise.all([
    Promise.all(queries), /^\d{9}$/.test(normalizeUniversityId(term)) ? db.collection('users').where('universityId', '==', normalizeUniversityId(term)).limit(51).get() : null,
    term.includes('/') ? null : db.collection('users').doc(term).get(),
  ]);
  const found = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  if (exact?.exists) found.set(exact.id, exact);
  for (const snap of [...results, ...(numeric ? [numeric] : [])]) for (const doc of snap.docs) found.set(doc.id, doc);
  return { users: [...found.values()].slice(0, 50).map(memberRecord), nextCursor: null, hasMore: false, truncated: found.size > 50 || results.some(result => result.size > 50) };
}

const activityCollections = {
  registrations: ['registrations', ['eventId', 'status', 'timestamp']],
  attendance: ['attendance_logs', ['eventId', 'timestamp', 'verifiedByAdmin']],
  points: ['point_transactions', ['amount', 'source', 'reason', 'sourceEventId', 'createdAt', 'balanceBefore', 'balanceAfter']],
  certificates: ['certificates', ['eventId', 'eventTitle', 'status', 'createdAt', 'issueDate']],
} as const;

function activityDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return typeof value === 'string' ? value : null;
}

/** Read-only diagnostics. Never repair historical totals or projections implicitly. */
export async function getMemberOverview(input: Record<string, unknown>) {
  const uid = documentId(input.userId, 'userId'); const db = getFirestore();
  const [user, projection, ...counts] = await Promise.all([
    db.collection('users').doc(uid).get(), db.collection('public_profiles').doc(uid).get(),
    ...Object.values(activityCollections).map(([collection]) => db.collection(collection).where('userId', '==', uid).count().get()),
  ]);
  if (!user.exists) throw new ApiError('not-found', 'Member not found. / العضو غير موجود.');
  const balance = Number(user.data()?.totalPoints) || 0;
  const projectedBalance = projection.exists ? Number(projection.data()?.totalPoints) || 0 : null;
  return {
    member: memberRecord(user), counts: Object.fromEntries(Object.keys(activityCollections).map((key, index) => [key, counts[index].data().count])),
    publicProjection: { exists: projection.exists, balance: projectedBalance, matchesBalance: projectedBalance === balance },
    generatedAt: new Date().toISOString(),
  };
}

/** Stable document-ID pagination includes legacy entries without timestamp fields. */
export async function getMemberActivity(input: Record<string, unknown>) {
  const uid = documentId(input.userId, 'userId'); const section = String(input.section);
  if (!Object.hasOwn(activityCollections, section)) throw new ApiError('invalid-argument', 'Invalid activity section.');
  const [collection, allowedFields] = activityCollections[section as keyof typeof activityCollections];
  const db = getFirestore(); const member = await db.collection('users').doc(uid).get();
  if (!member.exists) throw new ApiError('not-found', 'Member not found.');
  let query = db.collection(collection).where('userId', '==', uid).orderBy('__name__').limit(31);
  if (input.cursor) {
    const cursor = await db.collection(collection).doc(documentId(input.cursor, 'cursor')).get();
    if (!cursor.exists || cursor.data()?.userId !== uid) throw new ApiError('invalid-argument', 'Activity cursor does not belong to this member.');
    query = query.startAfter(cursor);
  }
  const snap = await query.get(); const docs = snap.docs.slice(0, 30);
  const entries = docs.map(doc => {
    const data = doc.data();
    return { id: doc.id, ...Object.fromEntries(allowedFields.filter(field => data[field] !== undefined).map(field => [field, ['timestamp', 'createdAt', 'issueDate'].includes(field) ? activityDate(data[field]) : data[field]])) };
  });
  const ids = [...new Set(entries.map(entry => { const data = entry as Record<string, unknown>; return data.eventId || data.sourceEventId; }).filter((id): id is string => typeof id === 'string' && !!id && !id.includes('/')))];
  const events = ids.length ? await db.getAll(...ids.map(id => db.collection('events').doc(id))) : [];
  const titles = new Map(events.map(event => [event.id, event.data()?.title || event.id]));
  return { entries: entries.map(entry => { const data = entry as Record<string, unknown>; const id = data.eventId || data.sourceEventId; return { ...entry, ...(typeof id === 'string' ? { eventTitle: titles.get(id) || data.eventTitle || id } : {}) }; }), nextCursor: snap.size > 30 ? docs.at(-1)!.id : null, order: 'documentId' };
}

export async function manageUser(actorUid: string, input: Record<string, unknown>) {
  const uid = documentId(input.userId, 'userId');
  if (!['role', 'restriction', 'delete'].includes(String(input.change))) throw new ApiError('invalid-argument', 'Invalid user change.');
  if (input.change === 'role' && !['student', 'event_organizer', 'super_admin'].includes(String(input.role))) throw new ApiError('invalid-argument', 'Invalid role.');
  if (input.change === 'restriction' && typeof input.isRestricted !== 'boolean') throw new ApiError('invalid-argument', 'Invalid restriction.');
  const db = getFirestore(); const lock = db.collection('platform_locks').doc('administrators');
  await db.runTransaction(async tx => {
    const [target, actor, lockSnap, admins] = await Promise.all([
      tx.get(db.collection('users').doc(uid)), tx.get(db.collection('users').doc(actorUid)), tx.get(lock),
      tx.get(db.collection('users').where('role', '==', 'super_admin').limit(100)),
    ]);
    if (actor.data()?.role !== 'super_admin' || actor.data()?.isRestricted) throw new ApiError('permission-denied', 'Super admin required.');
    if (!target.exists) throw new ApiError('not-found', 'User not found.');
    const removesAdmin = target.data()?.role === 'super_admin' && (input.change === 'delete' || (input.change === 'restriction' && input.isRestricted === true) || (input.change === 'role' && input.role !== 'super_admin'));
    if (removesAdmin && !admins.docs.some(doc => doc.id !== uid && !doc.data().isRestricted)) throw new ApiError('failed-precondition', 'Keep at least one active super admin. / يجب إبقاء مدير عام نشط واحد على الأقل.');
    const update = input.change === 'delete'
      ? { isRestricted: true, archivedAt: FieldValue.serverTimestamp(), archivedBy: actorUid }
      : input.change === 'role' ? { role: input.role }
      : { isRestricted: input.isRestricted, ...(input.isRestricted === false ? { archivedAt: FieldValue.delete(), archivedBy: FieldValue.delete() } : {}) };
    tx.update(target.ref, update);
    const next = { ...target.data(), ...update };
    const projection = db.collection('public_profiles').doc(uid);
    if (next.isRestricted) tx.delete(projection); else tx.set(projection, publicProfile(next));
    tx.set(lock, { revision: Number(lockSnap.data()?.revision || 0) + 1 });
    audit(tx, input.change === 'delete' ? 'member.archive' : `member.${input.change}`, actorUid, uid, { before: { role: target.data()?.role || null, isRestricted: target.data()?.isRestricted === true }, after: { role: input.change === 'role' ? input.role : target.data()?.role || null, isRestricted: next.isRestricted === true } });
  });
  return { status: 'success', archived: input.change === 'delete' };
}
