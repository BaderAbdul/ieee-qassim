import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { enqueueEmail, EmailTemplate } from '../utils/email';

export const emailRegistrations = onDocumentWritten('registrations/{registrationId}', async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;

  if (!after || !after.exists) return; // Document deleted

  const afterData = after.data();
  const eventId = afterData?.eventId;
  const userId = afterData?.userId;
  const newStatus = afterData?.status;

  if (before && before.exists) {
    const beforeData = before.data();
    if (beforeData?.status === newStatus) {
      // Status didn't change, do nothing
      return;
    }
  }

  if (!eventId || !userId || !newStatus) return;

  const db = admin.firestore();
  
  const [userDoc, eventDoc] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('events').doc(eventId).get()
  ]);

  const userEmail = userDoc.data()?.email;
  const userName = userDoc.data()?.displayName || 'Student';
  const eventTitle = eventDoc.data()?.title || 'Event';

  if (!userEmail) return;

  let template: EmailTemplate | null = null;
  let dedupeKey = '';

  switch (newStatus) {
    case 'pending':
      template = 'REGISTRATION_RECEIVED';
      dedupeKey = `registration_received_${eventId}_${userId}`;
      break;
    case 'approved':
      template = 'REGISTRATION_APPROVED';
      dedupeKey = `registration_approved_${eventId}_${userId}`;
      break;
    case 'waitlisted':
      template = 'REGISTRATION_WAITLISTED';
      dedupeKey = `registration_waitlisted_${eventId}_${userId}`;
      break;
    case 'rejected':
      template = 'REGISTRATION_REJECTED';
      dedupeKey = `registration_rejected_${eventId}_${userId}`;
      break;
    case 'cancelled':
      template = 'REGISTRATION_CANCELLED';
      dedupeKey = `registration_cancelled_${eventId}_${userId}`;
      break;
  }

  if (template) {
    await enqueueEmail({
      to: userEmail,
      template,
      dedupeKey,
      data: {
        eventName: eventTitle,
        userName
      }
    });
  }
});
