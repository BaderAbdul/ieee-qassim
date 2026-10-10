import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { enqueueEmail, EmailTemplate } from '../utils/email';

export const emailCertificates = onDocumentWritten('certificates/{certificateId}', async (event) => {
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

  // Only trigger on Available or Revoked
  if (newStatus !== 'Available' && newStatus !== 'Revoked') {
    return;
  }

  const certificateId = event.params.certificateId;
  const db = getFirestore();
  
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

  if (newStatus === 'Available') {
    template = 'CERTIFICATE_AVAILABLE';
    dedupeKey = `certificate_available_${certificateId}`;
  } else if (newStatus === 'Revoked') {
    template = 'CERTIFICATE_REVOKED';
    dedupeKey = `certificate_revoked_${certificateId}`;
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
