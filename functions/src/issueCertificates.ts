import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth, verifyAdmin } from './utils/auth';
import { throwFailedPrecondition } from './utils/errors';

export const issueCertificates = functions.https.onCall(async (data, context) => {
  const adminUid = verifyAuth(context);
  const { role } = await verifyAdmin(adminUid);
  
  if (role !== 'super_admin' && role !== 'event_organizer') {
    throwFailedPrecondition('Insufficient permissions. Only Organizers or Super Admins can issue certificates.');
  }

  const { eventId, userIds } = data;

  if (!eventId || typeof eventId !== 'string') {
    throwFailedPrecondition('Missing or invalid eventId.');
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throwFailedPrecondition('Missing or invalid userIds array.');
  }

  const db = admin.firestore();
  
  // 1. Verify Event is Completed
  const eventRef = db.collection('events').doc(eventId);
  const eventSnap = await eventRef.get();
  
  if (!eventSnap.exists) {
    throwFailedPrecondition('Event not found.');
  }
  
  const eventData = eventSnap.data();
  if (eventData?.state !== 'Completed') {
    throwFailedPrecondition('Certificates can only be issued for Completed events.');
  }

  // Determine queue service to call to trigger background worker.
  // In a real Gen2 environment, we would use Cloud Tasks or Google Cloud Pub/Sub.
  // Since we are creating a generic firebase background function using onDocumentCreated or onCall,
  // we will trigger the generation automatically when the certificate document is created with status = 'Generating'.
  
  const queuedCount = await db.runTransaction(async (transaction) => {
    let count = 0;
    
    // Phase 1: All Reads
    const readResults = [];
    for (const userId of userIds) {
      const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
      const certificateId = `certificate_${eventId}_${userId}`;
      const certRef = db.collection('certificates').doc(certificateId);
      const userRef = db.collection('users').doc(userId);
      
      const [logSnap, certSnap, userSnap] = await Promise.all([
        transaction.get(logRef),
        transaction.get(certRef),
        transaction.get(userRef)
      ]);
      
      readResults.push({
        userId,
        certificateId,
        certRef,
        logSnap,
        certSnap,
        userSnap
      });
    }
    
    // Phase 2: All Writes
    for (const data of readResults) {
      if (!data.logSnap.exists) {
        continue; // Skip, no attendance found
      }
      
      if (data.certSnap.exists) {
        const currentStatus = data.certSnap.data()?.status;
        if (currentStatus === 'Available' || currentStatus === 'Generating') {
          continue; // Already processed
        }
      }
      
      const studentName = data.userSnap.data()?.displayName || 'Student';

      // Create or overwrite as Generating
      transaction.set(data.certRef, {
        id: data.certificateId,
        eventId,
        userId: data.userId,
        status: 'Generating',
        storagePath: `certificates/${eventId}/${data.certificateId}.pdf`,
        studentName,
        eventTitle: eventData!.title,
        eventType: eventData!.type,
        attendanceDate: data.logSnap.data()?.timestamp || eventData!.date,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attemptCount: 0,
        issuedBy: adminUid,
      }, { merge: true });
      
      count++;
    }
    
    return count;
  });

  return { status: 'success', queuedCount };
});
