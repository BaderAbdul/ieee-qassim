"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryMailQueue = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
exports.retryMailQueue = (0, scheduler_1.onSchedule)('every 5 minutes', async (event) => {
    const db = (0, firestore_1.getFirestore)();
    const staleBefore = firestore_1.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    const stale = await db.collection('mail').where('status', '==', 'PROCESSING')
        .where('updatedAt', '<=', staleBefore).limit(100).get();
    for (const candidate of stale.docs) {
        await db.runTransaction(async (tx) => {
            var _a, _b, _c;
            const current = await tx.get(candidate.ref);
            if (((_a = current.data()) === null || _a === void 0 ? void 0 : _a.status) === 'PROCESSING' && ((_c = (_b = current.data()) === null || _b === void 0 ? void 0 : _b.updatedAt) === null || _c === void 0 ? void 0 : _c.toMillis()) <= staleBefore.toMillis()) {
                tx.update(candidate.ref, { status: 'PENDING', nextAttemptAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
            }
        });
    }
    // Find PENDING emails where nextAttemptAt is in the past
    const snapshot = await db.collection('mail')
        .where('status', '==', 'PENDING')
        .where('nextAttemptAt', '<=', firestore_1.Timestamp.now())
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
        batch.update(doc.ref, { updatedAt: firestore_1.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log(`Successfully triggered retries for ${snapshot.size} emails.`);
});
//# sourceMappingURL=retryMailQueue.js.map