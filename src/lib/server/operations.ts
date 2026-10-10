import { AggregateField, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { AdminOverview, EventReport } from '../adminTypes';
import type { EventState } from '../types';
import { ApiError } from './errors';
import { documentId } from './lifecycle';
import { audit } from './audit';

const states = ['Draft', 'Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Archived'] as const;
const transitions: Record<EventState, readonly EventState[]> = {
  Draft: ['Published', 'Archived'], Published: ['Draft', 'Registration Open', 'Archived'],
  'Registration Open': ['Registration Closed', 'Ongoing', 'Archived'],
  'Registration Closed': ['Registration Open', 'Ongoing', 'Archived'],
  Ongoing: ['Completed'], Completed: ['Archived'], Archived: [],
};
const dateString = (value: unknown): string | undefined => {
  const date = value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};
const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = getFirestore();
  const active = db.collection('events').where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing']);
  const counts = await Promise.all([
    count(db.collection('users')), count(active), count(db.collection('registrations')),
    count(db.collection('certificates').where('status', '==', 'Available')),
    count(db.collection('registrations').where('status', '==', 'pending')),
    count(db.collection('registrations').where('status', '==', 'attended')),
    count(db.collection('certificates').where('status', '==', 'Failed')),
    count(db.collection('certificates').where('status', '==', 'Generating')),
    ...['PENDING', 'FAILED', 'REVIEW', 'DELIVERED'].map(status => count(db.collection('notification_jobs').where('status', '==', status))),
  ]);
  const events = await active.orderBy('date', 'asc').limit(20).get();
  return {
    counts: { users: counts[0], activeEvents: counts[1], registrations: counts[2], availableCertificates: counts[3], pendingRegistrations: counts[4], attendedRegistrations: counts[5], failedCertificates: counts[6], queuedCertificates: counts[7] },
    notifications: { pending: counts[8], failed: counts[9], review: counts[10], delivered: counts[11] },
    events: events.docs.map(doc => { const data = doc.data(); return { id: doc.id, title: data.title || '', titleEn: data.titleEn || '', state: data.state, date: dateString(data.date), registeredCount: data.registeredCount || 0, attendanceCount: data.attendanceCount || 0, capacity: data.capacity || 0, isUnlimitedCapacity: data.isUnlimitedCapacity === true }; }),
    generatedAt: new Date().toISOString(),
  };
}

export async function getEventReport(eventId: string): Promise<EventReport> {
  const db = getFirestore();
  if (!(await db.collection('events').doc(eventId).get()).exists) throw new ApiError('not-found', 'Event not found.');
  const regs = db.collection('registrations').where('eventId', '==', eventId);
  const certs = db.collection('certificates').where('eventId', '==', eventId);
  const [counts, feedback] = await Promise.all([
    Promise.all([count(regs), ...['pending', 'approved', 'waitlisted', 'rejected', 'cancelled', 'attended'].map(status => count(regs.where('status', '==', status))), ...['Available', 'Failed', 'Generating'].map(status => count(certs.where('status', '==', status)))]),
    db.collection('event_feedback').where('eventId', '==', eventId).aggregate({ responses: AggregateField.count(), averageRating: AggregateField.average('rating') }).get(),
  ]);
  return { counts: { registrations: counts[0], pending: counts[1], approved: counts[2], waitlisted: counts[3], rejected: counts[4], cancelled: counts[5], attended: counts[6], certificatesAvailable: counts[7], certificatesFailed: counts[8], certificatesQueued: counts[9] }, feedback: feedback.data() };
}

export async function changeEventState(actorUid: string, eventId: string, state: unknown) {
  if (!states.includes(state as EventState)) throw new ApiError('invalid-argument', 'Invalid event state.');
  const db = getFirestore(); const ref = db.collection('events').doc(eventId);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref); const event = snap.data();
    if (!event) throw new ApiError('not-found', 'Event not found.');
    if (event.state === state) return { status: 'success', state, unchanged: true };
    if (!transitions[event.state as EventState]?.includes(state as EventState)) throw new ApiError('failed-precondition', 'This lifecycle transition is not allowed. / الانتقال بين هاتين المرحلتين غير مسموح.');
    if (['Published', 'Registration Open', 'Ongoing'].includes(String(state))) {
      const missing = ['title', 'description', 'location'].some(field => typeof event[field] !== 'string' || !event[field].trim());
      if (missing || !dateString(event.date) || !(Number(event.durationHours) > 0) || (event.isUnlimitedCapacity !== true && !(Number(event.capacity) > 0)) || !Number.isSafeInteger(event.points) || event.points < 0 || event.points > 100000) throw new ApiError('failed-precondition', 'Complete the title, description, location, date, duration and capacity before publishing. / أكمل تجهيز الفعالية قبل النشر أو فتح التسجيل.');
    }
    tx.update(ref, { state, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid });
    if (['Completed', 'Archived'].includes(String(state))) tx.delete(db.collection('event_secrets').doc(eventId));
    audit(tx, 'event.state', actorUid, eventId, { before: event.state, after: state });
    return { status: 'success', state };
  });
}

export async function getOperations() {
  const db = getFirestore();
  const [mail, certificates] = await Promise.all([
    db.collection('notification_jobs').where('status', 'in', ['PENDING', 'PROCESSING', 'FAILED', 'REVIEW']).limit(50).get(),
    db.collection('certificates').where('status', 'in', ['Generating', 'Failed']).limit(50).get(),
  ]);
  return {
    notificationJobs: mail.docs.map(doc => { const d = doc.data(); return { id: doc.id, status: d.status, to: d.to, attempts: d.attempts || 0, lastError: d.lastError || null }; }),
    certificateJobs: certificates.docs.map(doc => { const d = doc.data(); return { id: doc.id, status: d.status, eventId: d.eventId, studentName: d.studentName, eventTitle: d.eventTitle, lastError: d.lastError || null }; }),
    limitedTo: 50,
  };
}

export async function getAuditLog(input: Record<string, unknown>) {
  const db = getFirestore();
  let query = db.collection('audit_logs').orderBy('createdAt', 'desc').orderBy('__name__', 'desc').limit(51);
  if (input.cursor) {
    const cursor = await db.collection('audit_logs').doc(documentId(input.cursor, 'cursor')).get();
    if (!cursor.exists) throw new ApiError('invalid-argument', 'Audit cursor is unavailable.');
    query = query.startAfter(cursor);
  }
  const snap = await query.get(); const docs = snap.docs.slice(0, 50);
  return { entries: docs.map(doc => { const d = doc.data(); return { id: doc.id, action: d.action, actorUid: d.actorUid, targetId: d.targetId, createdAt: dateString(d.createdAt), ...(typeof d.reason === 'string' ? { reason: d.reason } : {}), ...(d.before !== undefined ? { before: d.before } : {}), ...(d.after !== undefined ? { after: d.after } : {}) }; }), nextCursor: snap.size > 50 ? docs.at(-1)!.id : null };
}

export async function retryNotification(actorUid: string, id: string) {
  const ref = getFirestore().collection('notification_jobs').doc(id);
  await getFirestore().runTransaction(async tx => {
    const job = (await tx.get(ref)).data();
    if (!job || job.status !== 'FAILED') throw new ApiError('failed-precondition', 'Only failed deliveries can be retried.');
    if (job.firstAttemptAt && Date.now() - job.firstAttemptAt.toMillis() >= 23 * 3600000) throw new ApiError('failed-precondition', 'Check the provider delivery outcome before retrying this older message.');
    tx.update(ref, { status: 'PENDING', attempts: 0, nextAttemptAt: Timestamp.now(), updatedAt: Timestamp.now(), lastError: FieldValue.delete() });
    audit(tx, 'notification.retry', actorUid, id);
  });
  return { status: 'success' };
}
