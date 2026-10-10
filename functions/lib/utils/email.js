"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueEmail = enqueueEmail;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Enqueues an email into the `mail` collection for asynchronous processing.
 * Uses `dedupeKey` as the document ID to guarantee idempotency.
 */
async function enqueueEmail(payload) {
    const db = (0, firestore_1.getFirestore)();
    const mailRef = db.collection('mail').doc(payload.dedupeKey);
    try {
        await mailRef.create({
            to: payload.to,
            template: payload.template,
            data: payload.data,
            status: 'PENDING',
            dedupeKey: payload.dedupeKey,
            attemptCount: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log(`Successfully enqueued email ${payload.template} with dedupeKey ${payload.dedupeKey}`);
    }
    catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
            console.log(`Email with dedupeKey ${payload.dedupeKey} already exists. Skipping.`);
        }
        else {
            console.error(`Failed to enqueue email with dedupeKey ${payload.dedupeKey}:`, error);
            throw error;
        }
    }
}
//# sourceMappingURL=email.js.map