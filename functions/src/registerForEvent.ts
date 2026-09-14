import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth } from './utils/auth';
import { throwNotFound, throwFailedPrecondition } from './utils/errors';

export const registerForEvent = functions.https.onCall(async (data, context) => {
  const uid = verifyAuth(context);
  const { eventId } = data;

  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Invalid eventId.');
  }

  const db = admin.firestore();
  const eventRef = db.collection('events').doc(eventId);
  const regId = `${eventId}_${uid}`;
  const regRef = db.collection('registrations').doc(regId);

  return db.runTransaction(async (transaction) => {
    // 1. Read event and existing registration
    const eventSnap = await transaction.get(eventRef);
    if (!eventSnap.exists) {
      throwNotFound('Event not found.');
    }

    const eventData = eventSnap.data()!;
    if (eventData.state !== 'Registration Open' && eventData.state !== 'Published') {
      throwFailedPrecondition('Registration is not open for this event.');
    }

    const regSnap = await transaction.get(regRef);
    if (regSnap.exists) {
      const currentStatus = regSnap.data()?.status;
      if (currentStatus !== 'cancelled') {
        throwFailedPrecondition('You are already registered or pending for this event.');
      }
    }

    // 2. Count active attendees (approved + pending + waitlisted) - simplified for V1
    // Note: Transactional count queries aren't natively supported like this in firestore transactions without aggregates,
    // but we can query them if we must, or better, use an aggregate query if it's outside the transaction, or keep a counter on the event doc!
    // Since we don't have a counter on the event doc yet, we'll query registrations inside the transaction.
    const activeRegsQuery = db.collection('registrations')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['approved', 'pending', 'waitlisted']);
    
    // In Firebase Admin SDK, we can get the query in a transaction
    const activeRegsSnap = await transaction.get(activeRegsQuery);
    const attendeeCount = activeRegsSnap.size;

    // 3. Determine status
    let status = 'approved';
    if (eventData.registrationMode === 'Manual') {
      status = 'pending';
    } else if (attendeeCount >= eventData.capacity) {
      status = 'waitlisted';
    }

    // 4. Write the registration
    const regData = {
      userId: uid,
      eventId: eventId,
      status: status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(regRef, regData);

    return { status, attendeeCount: attendeeCount + 1 };
  });
});
