import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { enqueueEmail } from '../utils/email';

export const emailAttendance = onDocumentCreated('attendance_logs/{logId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const eventId = data.eventId;
  const userId = data.userId;

  if (!eventId || !userId) return;

  const db = admin.firestore();
  
  const [userDoc, eventDoc] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('events').doc(eventId).get()
  ]);

  const userEmail = userDoc.data()?.email;
  const userName = userDoc.data()?.displayName || 'Student';
  const eventTitle = eventDoc.data()?.title || 'Event';

  if (!userEmail) return;

  const dedupeKey = `attendance_confirmation_${eventId}_${userId}`;

  await enqueueEmail({
    to: userEmail,
    template: 'ATTENDANCE_CONFIRMATION',
    dedupeKey,
    data: {
      eventName: eventTitle,
      userName
    }
  });
});
