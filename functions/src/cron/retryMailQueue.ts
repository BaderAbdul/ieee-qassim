import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const retryMailQueue = onSchedule('every 5 minutes', async (event) => {
  const db = admin.firestore();
  
  // Find PENDING emails where nextAttemptAt is in the past
  const snapshot = await db.collection('mail')
    .where('status', '==', 'PENDING')
    .where('nextAttemptAt', '<=', admin.firestore.Timestamp.now())
    .limit(100)
    .get();

  if (snapshot.empty) {
    console.log('No pending emails require retry at this time.');
    return;
  }

  console.log(`Found ${snapshot.size} emails to retry. Waking up workers...`);

  // Touch the document to trigger `processMailQueue` (onDocumentWritten)
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { updatedAt: FieldValue.serverTimestamp() });
  });

  await batch.commit();
  console.log(`Successfully triggered retries for ${snapshot.size} emails.`);
});
