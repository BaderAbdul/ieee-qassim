import * as functions from 'firebase-functions/v1';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export const onRegistrationCancelled = functions.firestore
  .document('registrations/{registrationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed from approved/pending to cancelled
    if (
      (before.status === 'approved' || before.status === 'pending') &&
      after.status === 'cancelled'
    ) {
      const eventId = after.eventId;
      if (!eventId) return null;

      const db = getFirestore();

      await db.runTransaction(async (transaction) => {
        // 1. Read event doc to check mode and capacity
        const eventRef = db.collection('events').doc(eventId);
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists) return null;

        const eventData = eventDoc.data() || {};
        if (eventData.state !== 'Registration Open') return null;
        const capacity = typeof eventData.capacity === 'number' ? eventData.capacity : 0;
        const currentCount = typeof eventData.registeredCount === 'number' ? eventData.registeredCount : 0;

        // If capacity is defined (> 0) and already at or above capacity, do not promote to avoid oversubscribing
        if (!eventData.isUnlimitedCapacity && currentCount >= capacity) {
          console.warn(`Capacity full for event ${eventId} (${currentCount}/${capacity}). Skipping waitlist promotion.`);
          return null;
        }

        // 2. Query earliest waitlisted registration (FIFO)
        const waitlistQuery = db.collection('registrations')
          .where('eventId', '==', eventId)
          .where('status', '==', 'waitlisted')
          .orderBy('timestamp', 'asc')
          .limit(1);

        const waitlistSnap = await transaction.get(waitlistQuery);
        if (waitlistSnap.empty) {
          // No waitlisted candidate to promote.
          // Note: Client-side cancellation already decremented registeredCount.
          return null;
        }

        const candidateDoc = waitlistSnap.docs[0];
        const newStatus = eventData.registrationMode === 'Manual' ? 'pending' : 'approved';

        // 3. Atomically promote the candidate
        transaction.update(candidateDoc.ref, {
          status: newStatus,
          promotedAt: FieldValue.serverTimestamp()
        });

        // 4. Since the client decremented registeredCount when the previous user cancelled,
        // and we just filled that spot with the promoted candidate, increment registeredCount by 1.
        transaction.update(eventRef, {
          registeredCount: FieldValue.increment(1)
        });

        console.log(`Auto-promoted user ${candidateDoc.data()?.userId} to ${newStatus} for event ${eventId}`);
        return null;
      });
    }

    return null;
  });
