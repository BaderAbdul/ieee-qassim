import { randomBytes, randomUUID } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { authenticate, errorResponse, limitRequests, readJson, requireAdmin } from '@/lib/server/request';
import { ApiError } from '@/lib/server/errors';
import { changeRegistration, documentId, recordAttendance, submitEventFeedback, type AttendanceInput } from '@/lib/server/lifecycle';
import { normalizeUniversityId, saveProfile, syncPublicProfile } from '@/lib/server/profiles';
import { assignCertificate, authorizeCertificate, certificateDownload, renderCertificate } from '@/lib/server/certificates';
import { processNotificationBatch, queueNotification } from '@/lib/server/notifications';
import { adjustPoints } from '@/lib/server/points';
import { getMemberActivity, getMemberOverview, manageUser, searchMembers } from '@/lib/server/members';
import { changeEventState, getAdminOverview, getAuditLog, getEventReport, getOperations, retryNotification } from '@/lib/server/operations';
import { audit } from '@/lib/server/audit';
import { saveHomepage } from '@/lib/server/content';
import { saveEvent } from '@/lib/server/events';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const requestId = randomUUID();
  try {
    const actor = await authenticate(request);
    const { action } = await context.params;
    const data = await readJson(request);
    await limitRequests(actor.uid, 'platform', ['event_organizer', 'super_admin'].includes(actor.role) ? 300 : 60);
    const db = getFirestore();
    const admin = ['event_organizer', 'super_admin'].includes(actor.role);
    let result: unknown;
    switch (action) {
      case 'getAdminOverview': requireAdmin(actor); result = await getAdminOverview(); break;
      case 'getOperations': requireAdmin(actor); result = await getOperations(); break;
      case 'getEventReport': requireAdmin(actor); result = await getEventReport(documentId(data.eventId, 'eventId')); break;
      case 'searchMembers': requireAdmin(actor); result = await searchMembers(data); break;
      case 'getMemberOverview': requireAdmin(actor); result = await getMemberOverview(data); break;
      case 'getMemberActivity': requireAdmin(actor); result = await getMemberActivity(data); break;
      case 'getAuditLog':
        if (actor.role !== 'super_admin') throw new ApiError('permission-denied', 'Super admin required.');
        result = await getAuditLog(data); break;
      case 'changeEventState': requireAdmin(actor); result = await changeEventState(actor.uid, documentId(data.eventId, 'eventId'), data.state); break;
      case 'saveEvent': requireAdmin(actor); result = await saveEvent(actor.uid, data); break;
      case 'retryNotification': requireAdmin(actor); result = await retryNotification(actor.uid, documentId(data.jobId, 'jobId')); break;
      case 'saveProfile': result = await saveProfile(actor.uid, data); break;
      case 'saveHomepage': requireAdmin(actor); result = await saveHomepage(actor.uid, data); break;
      case 'submitEventFeedback': result = await submitEventFeedback(actor.uid, documentId(data.eventId, 'eventId'), data.feedbackData as AttendanceInput['feedback']); break;
      case 'processNotifications': requireAdmin(actor); result = await processNotificationBatch(); break;
      case 'registerForEvent': case 'cancelRegistration':
        result = await changeRegistration(actor.uid, documentId(data.eventId, 'eventId'), action === 'registerForEvent' ? 'register' : 'cancel'); break;
      case 'manageRegistration':
        requireAdmin(actor);
        if (!['approve', 'reject', 'cancel', 'waitlist'].includes(String(data.action))) throw new ApiError('invalid-argument', 'Invalid action.');
        result = await changeRegistration(documentId(data.userId, 'userId'), documentId(data.eventId, 'eventId'), data.action as 'approve' | 'reject' | 'cancel' | 'waitlist', actor.uid); break;
      case 'generateCheckInToken': {
        requireAdmin(actor); const eventId = documentId(data.eventId, 'eventId');
        const token = randomBytes(32).toString('hex'); const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60000);
        await db.runTransaction(async tx => {
          const event = await tx.get(db.collection('events').doc(eventId));
          if (event.data()?.state !== 'Ongoing') throw new ApiError('failed-precondition', 'Event must be Ongoing.');
          tx.set(db.collection('event_secrets').doc(eventId), { token, expiresAt });
          audit(tx, 'attendance.rotate_token', actor.uid, eventId, { expiresAt: expiresAt.toMillis() });
        }); result = { token, expiresAt: expiresAt.toMillis() }; break;
      }
      case 'submitCheckIn': {
        const override = data.targetUserId !== undefined;
        if (override) requireAdmin(actor);
        if (data.feedbackData && (typeof data.feedbackData !== 'object' || Array.isArray(data.feedbackData))) throw new ApiError('invalid-argument', 'Invalid feedback.');
        result = await recordAttendance({ eventId: documentId(data.eventId, 'eventId'), userId: override ? documentId(data.targetUserId, 'userId').replace('ieee-qu-user:', '') : actor.uid, actorUid: actor.uid, admin: override, token: typeof data.token === 'string' ? data.token : undefined, feedback: data.feedbackData as AttendanceInput['feedback'] }); break;
      }
      case 'checkUniversityId': {
        const id = normalizeUniversityId(data.universityId);
        if (!/^\d{9}$/.test(id)) throw new ApiError('invalid-argument', 'Invalid university ID.');
        const [matches, claim] = await Promise.all([db.collection('users').where('universityId', '==', id).limit(2).get(), db.collection('university_ids').doc(id).get()]);
        result = { available: matches.docs.every(doc => doc.id === actor.uid) && (!claim.exists || claim.data()?.userId === actor.uid) }; break;
      }
      case 'syncPublicProfile': {
        const uid = data.userId === undefined ? actor.uid : documentId(data.userId, 'userId');
        if (uid !== actor.uid) requireAdmin(actor);
        await syncPublicProfile(uid, actor.uid); result = { status: 'success' }; break;
      }
      case 'manageUser': {
        if (actor.role !== 'super_admin') throw new ApiError('permission-denied', 'Super admin required.');
        result = await manageUser(actor.uid, data); break;
      }
      case 'addManualPoints': {
        requireAdmin(actor); result = await adjustPoints(actor.uid, data); break;
      }
      case 'saveExternalCertificate':
        requireAdmin(actor);
        if (typeof data.url !== 'string') throw new ApiError('invalid-argument', 'Certificate link required.');
        await assignCertificate(actor.uid, documentId(data.eventId, 'eventId'), documentId(data.userId, 'userId'), data.url);
        result = { status: 'success' }; break;
      case 'issueCertificates': {
        requireAdmin(actor); const eventId = documentId(data.eventId, 'eventId');
        if (!Array.isArray(data.userIds) || !data.userIds.length || data.userIds.length > 300) throw new ApiError('invalid-argument', 'Select up to 300 attendees.');
        const ids = [...new Set(data.userIds.map(id => documentId(id, 'userId')))]; let queuedCount = 0;
        const results: { userId: string; status: string; message?: string }[] = [];
        for (const uid of ids) {
          try {
            const issued = await assignCertificate(actor.uid, eventId, uid);
            if (issued.queued) queuedCount++;
            results.push({ userId: uid, status: issued.queued ? 'queued' : 'skipped' });
          } catch (error) { results.push({ userId: uid, status: 'failed', message: error instanceof ApiError ? error.message : 'Certificate request failed.' }); }
        }
        result = { status: 'success', queuedCount, results, failedCount: results.filter(item => item.status === 'failed').length }; break;
      }
      case 'renderCertificate': {
        requireAdmin(actor); const id = documentId(data.certificateId, 'certificateId');
        result = await renderCertificate(id); break;
      }
      case 'retryCertificate': case 'revokeCertificate': {
        requireAdmin(actor); const { ref } = await authorizeCertificate(data.certificateId, actor.uid, true);
        const notificationKey = randomUUID();
        await db.runTransaction(async tx => {
          const current = (await tx.get(ref)).data();
          if (!current) throw new ApiError('not-found', 'Certificate not found.');
          if (action === 'revokeCertificate' && current.status === 'Revoked') return;
          if (action === 'retryCertificate' && current.status !== 'Failed') throw new ApiError('failed-precondition', 'Only failed certificates can be retried.');
          const recipient = action === 'revokeCertificate' ? await tx.get(db.collection('users').doc(current.userId)) : null;
          tx.update(ref, { status: action === 'retryCertificate' ? 'Generating' : 'Revoked', updatedAt: FieldValue.serverTimestamp(), revokedBy: action === 'revokeCertificate' ? actor.uid : FieldValue.delete(), lease: FieldValue.delete(), leaseExpiresAt: FieldValue.delete(), lastError: FieldValue.delete() });
          if (recipient) queueNotification(tx, notificationKey, recipient.data()?.email, 'تم إلغاء الشهادة. / Your certificate was revoked.', current.eventTitle);
          audit(tx, action === 'retryCertificate' ? 'certificate.retry' : 'certificate.revoke', actor.uid, ref.id, { before: current.status, after: action === 'retryCertificate' ? 'Generating' : 'Revoked' });
        }); result = { status: 'success' }; break;
      }
      case 'getCertificateDownloadUrl': result = await certificateDownload(data.certificateId, actor.uid, admin); break;
      default: throw new ApiError('not-found', 'Unknown operation.');
    }
    return Response.json({ data: result }, { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
  } catch (error) {
    if (!(error instanceof ApiError)) console.error('Platform operation failed', { requestId, name: error instanceof Error ? error.name : 'UnknownError' });
    const response = errorResponse(error); response.headers.set('X-Request-Id', requestId); return response;
  }
}
