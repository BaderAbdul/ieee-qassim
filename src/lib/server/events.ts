import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ApiError } from './errors';
import { documentId } from './lifecycle';
import { audit } from './audit';

const textFields: Record<string, number> = { title: 200, titleEn: 200, description: 12000, descriptionEn: 12000, location: 500, locationEn: 500, coverUrl: 2000 };
const fields = [...Object.keys(textFields), 'type', 'date', 'durationHours', 'capacity', 'isUnlimitedCapacity', 'hideExactCapacity', 'hideFromDiscovery', 'points', 'hasCertificate', 'registrationMode', 'gains', 'gainsEn', 'speakers', 'feedbackQuestions', 'isPinned'];

export async function saveEvent(actorUid: string, input: Record<string, unknown>) {
  const db = getFirestore();
  const ref = input.eventId === undefined ? db.collection('events').doc() : db.collection('events').doc(documentId(input.eventId, 'eventId'));
  if (Object.keys(input).some(key => ![...fields, 'eventId', 'state', 'createdAt', 'updatedAt', 'expectedUpdatedAt'].includes(key))) throw new ApiError('invalid-argument', 'Invalid event fields.');
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (input.eventId !== undefined && !snap.exists) throw new ApiError('not-found', 'Event not found.');
    const old = snap.data() || {};
    const oldUpdatedAt = old.updatedAt instanceof Timestamp ? old.updatedAt.toDate().getTime() : typeof old.updatedAt === 'string' ? new Date(old.updatedAt).getTime() : 0;
    if (input.expectedUpdatedAt !== undefined && (!Number.isFinite(input.expectedUpdatedAt) || oldUpdatedAt !== input.expectedUpdatedAt)) throw new ApiError('failed-precondition', 'Event details changed while the editor was open. Reload before saving. / تغيرت تفاصيل الفعالية أثناء التعديل؛ أعد تحميلها قبل الحفظ.');
    const data = { ...old, ...Object.fromEntries(fields.filter(field => input[field] !== undefined).map(field => [field, input[field]])) };
    for (const [field, max] of Object.entries(textFields)) if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > max)) throw new ApiError('invalid-argument', `Invalid ${field}.`);
    if (typeof data.title !== 'string' || !data.title.trim() || !['Workshop', 'Camp', 'Lecture', 'Competition', 'Meetup', 'Challenge', 'Other'].includes(String(data.type)) || !['Auto', 'Manual'].includes(String(data.registrationMode))) throw new ApiError('invalid-argument', 'Complete the title, event type and registration mode.');
    if (!Number.isSafeInteger(data.capacity) || data.capacity < 0 || !Number.isSafeInteger(data.points) || data.points < 0 || data.points > 100000 || !Number.isFinite(data.durationHours) || data.durationHours <= 0 || data.durationHours > 72) throw new ApiError('invalid-argument', 'Invalid capacity, points or duration.');
    for (const field of ['isUnlimitedCapacity', 'hideExactCapacity', 'hideFromDiscovery', 'hasCertificate', 'isPinned']) if (data[field] !== undefined && typeof data[field] !== 'boolean') throw new ApiError('invalid-argument', `Invalid ${field}.`);
    if (data.isUnlimitedCapacity !== true && data.capacity < Number(old.registeredCount || 0)) throw new ApiError('failed-precondition', 'Capacity cannot be lower than the reserved seats.');
    if (data.coverUrl) {
      try { const url = new URL(data.coverUrl); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
      catch { throw new ApiError('invalid-argument', 'Use an HTTPS cover image.'); }
    }
    for (const field of ['gains', 'gainsEn', 'speakers']) if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].length > 50 || data[field].some((value: unknown) => typeof value !== 'string' || value.length > 1000))) throw new ApiError('invalid-argument', `Invalid ${field}.`);
    if (data.feedbackQuestions !== undefined) {
      if (!Array.isArray(data.feedbackQuestions) || data.feedbackQuestions.length > 25) throw new ApiError('invalid-argument', 'Use up to 25 feedback questions.');
      const ids = new Set<string>();
      for (const question of data.feedbackQuestions) {
        if (!question || typeof question.id !== 'string' || !question.id || question.id.length > 128 || ids.has(question.id) || !['text', 'choice'].includes(question.type) || typeof question.title !== 'string' || !question.title.trim() || question.title.length > 1000 || typeof question.required !== 'boolean') throw new ApiError('invalid-argument', 'Invalid feedback question.');
        ids.add(question.id);
        if (question.type === 'choice' && (!Array.isArray(question.options) || !question.options.length || question.options.length > 30 || question.options.some((option: unknown) => typeof option !== 'string' || !option.trim() || option.length > 500))) throw new ApiError('invalid-argument', 'Choice questions need valid options.');
        for (const key of ['placeholder']) if (question[key] !== undefined && (typeof question[key] !== 'string' || question[key].length > 500)) throw new ApiError('invalid-argument', 'Invalid question hint.');
        if (question.quickChips !== undefined && (!Array.isArray(question.quickChips) || question.quickChips.length > 30 || question.quickChips.some((value: unknown) => typeof value !== 'string' || value.length > 500))) throw new ApiError('invalid-argument', 'Invalid answer suggestions.');
      }
    }
    const date = data.date instanceof Timestamp ? data.date.toDate() : typeof data.date === 'string' ? new Date(data.date) : null;
    if (!date || !Number.isFinite(date.getTime())) throw new ApiError('invalid-argument', 'Invalid event date.');
    const update = { ...Object.fromEntries(fields.filter(field => data[field] !== undefined).map(field => [field, data[field]])), date: Timestamp.fromDate(date), updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid };
    if (snap.exists) tx.update(ref, update);
    else tx.create(ref, { ...update, state: 'Draft', registeredCount: 0, attendanceCount: 0, createdAt: FieldValue.serverTimestamp(), createdBy: actorUid });
    audit(tx, snap.exists ? 'event.update' : 'event.create', actorUid, ref.id, { fields: fields.filter(field => input[field] !== undefined) });
    return { status: 'success', eventId: ref.id };
  });
}
