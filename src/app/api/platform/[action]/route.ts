import { randomBytes, randomUUID } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { authenticate, errorResponse, limitRequests, readJson, requireAdmin } from '@/lib/server/request';
import { ApiError } from '@/lib/server/errors';
import { changeRegistration, documentId, recordAttendance, type AttendanceInput } from '@/lib/server/lifecycle';
import { publicProfile, syncPublicProfile } from '@/lib/server/profiles';
import { assignCertificate, authorizeCertificate, certificateDownload, renderCertificate } from '@/lib/server/certificates';
import { processNotificationBatch, queueNotification } from '@/lib/server/notifications';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const actor = await authenticate(request);
    const { action } = await context.params;
    const data = await readJson(request);
    await limitRequests(actor.uid, 'platform', ['event_organizer', 'super_admin'].includes(actor.role) ? 300 : 60);
    const db = getFirestore();
    const admin = ['event_organizer', 'super_admin'].includes(actor.role);
    let result: unknown;
    switch (action) {
      case 'processNotifications': requireAdmin(actor); result = await processNotificationBatch(); break;
      case 'registerForEvent': case 'cancelRegistration':
        result = await changeRegistration(actor.uid, documentId(data.eventId, 'eventId'), action === 'registerForEvent' ? 'register' : 'cancel'); break;
      case 'manageRegistration':
        requireAdmin(actor);
        if (!['approve', 'reject', 'cancel'].includes(String(data.action))) throw new ApiError('invalid-argument', 'Invalid action.');
        result = await changeRegistration(documentId(data.userId, 'userId'), documentId(data.eventId, 'eventId'), data.action as 'approve' | 'reject' | 'cancel', actor.uid); break;
      case 'generateCheckInToken': {
        requireAdmin(actor); const eventId = documentId(data.eventId, 'eventId');
        const token = randomBytes(32).toString('hex'); const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60000);
        await db.runTransaction(async tx => {
          const event = await tx.get(db.collection('events').doc(eventId));
          if (event.data()?.state !== 'Ongoing') throw new ApiError('failed-precondition', 'Event must be Ongoing.');
          tx.set(db.collection('event_secrets').doc(eventId), { token, expiresAt });
        }); result = { token, expiresAt: expiresAt.toMillis() }; break;
      }
      case 'submitCheckIn': {
        const override = data.targetUserId !== undefined;
        if (override) requireAdmin(actor);
        if (data.feedbackData && (typeof data.feedbackData !== 'object' || Array.isArray(data.feedbackData))) throw new ApiError('invalid-argument', 'Invalid feedback.');
        result = await recordAttendance({ eventId: documentId(data.eventId, 'eventId'), userId: override ? documentId(data.targetUserId, 'userId').replace('ieee-qu-user:', '') : actor.uid, actorUid: actor.uid, admin: override, token: typeof data.token === 'string' ? data.token : undefined, feedback: data.feedbackData as AttendanceInput['feedback'] }); break;
      }
      case 'checkUniversityId': {
        if (typeof data.universityId !== 'string' || !/^\d{9}$/.test(data.universityId)) throw new ApiError('invalid-argument', 'Invalid university ID.');
        const matches = await db.collection('users').where('universityId', '==', data.universityId).limit(2).get();
        result = { available: matches.docs.every(doc => doc.id === actor.uid) }; break;
      }
      case 'syncPublicProfile': {
        const uid = data.userId === undefined ? actor.uid : documentId(data.userId, 'userId');
        if (uid !== actor.uid) requireAdmin(actor);
        await syncPublicProfile(uid); result = { status: 'success' }; break;
      }
      case 'manageUser': {
        if (actor.role !== 'super_admin') throw new ApiError('permission-denied', 'Super admin required.');
        const uid = documentId(data.userId, 'userId');
        if (!['role', 'restriction', 'delete'].includes(String(data.change))) throw new ApiError('invalid-argument', 'Invalid user change.');
        if (data.change === 'role' && !['student', 'event_organizer', 'super_admin'].includes(String(data.role))) throw new ApiError('invalid-argument', 'Invalid role.');
        if (data.change === 'restriction' && typeof data.isRestricted !== 'boolean') throw new ApiError('invalid-argument', 'Invalid restriction.');
        await db.runTransaction(async tx => {
          const [target, currentActor] = await Promise.all([tx.get(db.collection('users').doc(uid)), tx.get(db.collection('users').doc(actor.uid))]);
          if (currentActor.data()?.role !== 'super_admin' || currentActor.data()?.isRestricted) throw new ApiError('permission-denied', 'Super admin required.');
          if (!target.exists) throw new ApiError('not-found', 'User not found.');
          const projection = db.collection('public_profiles').doc(uid);
          if (data.change === 'delete') { tx.delete(target.ref); tx.delete(projection); }
          else {
            const update = data.change === 'role' ? { role: data.role } : { isRestricted: data.isRestricted };
            tx.update(target.ref, update);
            const next = { ...target.data(), ...update };
            if (next.isRestricted) tx.delete(projection); else tx.set(projection, publicProfile(next));
          }
        }); result = { status: 'success' }; break;
      }
      case 'addManualPoints': {
        requireAdmin(actor); const uid = documentId(data.studentUid, 'studentUid');
        if (!Number.isSafeInteger(data.amount) || data.amount === 0 || Math.abs(Number(data.amount)) > 100000 || typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 2000) throw new ApiError('invalid-argument', 'Invalid points adjustment.');
        const ref = db.collection('point_transactions').doc();
        await db.runTransaction(async tx => {
          const user = await tx.get(db.collection('users').doc(uid));
          if (!user.exists) throw new ApiError('not-found', 'Student not found.');
          const totalPoints = Math.max(0, (Number(user.data()?.totalPoints) || 0) + Number(data.amount));
          const badges = [...new Set([...(user.data()?.badges || []), ...(totalPoints >= 100 ? ['century_club'] : []), ...(totalPoints >= 250 ? ['engineering_leader'] : [])])];
          tx.create(ref, { userId: uid, amount: data.amount, source: 'manual_adjustment', reason: data.reason, createdBy: actor.uid, createdAt: FieldValue.serverTimestamp(), aggregatedAt: FieldValue.serverTimestamp() });
          tx.update(user.ref, { totalPoints, badges });
          if (!user.data()?.isRestricted) tx.set(db.collection('public_profiles').doc(uid), publicProfile({ ...user.data(), totalPoints, badges }));
        }); result = { status: 'success', transactionId: ref.id }; break;
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
        for (const uid of ids) if ((await assignCertificate(actor.uid, eventId, uid)).queued) queuedCount++;
        result = { status: 'success', queuedCount }; break;
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
        }); result = { status: 'success' }; break;
      }
      case 'getCertificateDownloadUrl': result = await certificateDownload(data.certificateId, actor.uid, admin); break;
      default: throw new ApiError('not-found', 'Unknown operation.');
    }
    return Response.json({ data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
