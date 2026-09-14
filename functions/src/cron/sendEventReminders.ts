import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { enqueueEmail } from '../utils/email';

export const sendEventReminders = onSchedule('every 1 hours', async (event) => {
  const db = admin.firestore();
  
  const now = admin.firestore.Timestamp.now();
  const nowMs = now.toMillis();
  
  // Calculate window: events starting between 23h30m and 24h30m from now
  const windowStartMs = nowMs + (23.5 * 60 * 60 * 1000);
  const windowEndMs = nowMs + (24.5 * 60 * 60 * 1000);
  
  const windowStart = admin.firestore.Timestamp.fromMillis(windowStartMs);
  const windowEnd = admin.firestore.Timestamp.fromMillis(windowEndMs);

  // Query events happening in this window
  // Assume events have a `date` field (Timestamp)
  const eventsSnapshot = await db.collection('events')
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .get();

  if (eventsSnapshot.empty) {
    console.log('No events starting in ~24 hours.');
    return;
  }

  let reminderCount = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const eventId = eventDoc.id;
    const eventTitle = eventData.title || 'Event';

    // Get approved registrations
    const registrationsSnapshot = await db.collection('registrations')
      .where('eventId', '==', eventId)
      .where('status', '==', 'approved')
      .get();

    for (const regDoc of registrationsSnapshot.docs) {
      const regData = regDoc.data();
      const userId = regData.userId;

      if (!userId) continue;

      const dedupeKey = `event_reminder_24h_${eventId}_${userId}`;
      
      // Because we use enqueueEmail which catches ALREADY_EXISTS, 
      // it is safe to run this multiple times inside the 1-hour window.
      // E.g., if it runs at 24.1 hours and 23.1 hours, the second run will skip duplicates.

      try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userEmail = userDoc.data()?.email;
        const userName = userDoc.data()?.displayName || 'Student';

        if (userEmail) {
          await enqueueEmail({
            to: userEmail,
            template: 'EVENT_REMINDER',
            dedupeKey,
            data: {
              eventName: eventTitle,
              userName
            }
          });
          reminderCount++;
        }
      } catch (error) {
        console.error(`Error queuing reminder for user ${userId} event ${eventId}:`, error);
      }
    }
  }

  console.log(`Queued ${reminderCount} event reminders.`);
});
