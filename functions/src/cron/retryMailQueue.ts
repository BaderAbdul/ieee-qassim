import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

export const retryMailQueue = onSchedule('every 5 minutes', async (event) => {
  const db = getFirestore();
  const staleBefore = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
  const stale = await db.collection('mail').where('status', '==', 'PROCESSING')
    .where('updatedAt', '<=', staleBefore).limit(100).get();
  for (const candidate of stale.docs) {
    await db.runTransaction(async tx => {
      const current = await tx.get(candidate.ref);
      if (current.data()?.status === 'PROCESSING' && current.data()?.updatedAt?.toMillis() <= staleBefore.toMillis()) {
        tx.update(candidate.ref, { status: 'PENDING', nextAttemptAt: Timestamp.now(), updatedAt: FieldValue.serverTimestamp() });
      }
    });
  }
  
  // Find PENDING emails where nextAttemptAt is in the past
  const snapshot = await db.collection('mail')
    .where('status', '==', 'PENDING')
    .where('nextAttemptAt', '<=', Timestamp.now())
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
