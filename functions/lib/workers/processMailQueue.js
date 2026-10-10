"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMailQueue = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const resend_1 = require("resend");
const emailTemplates_1 = require("../utils/emailTemplates");
function getSubject(template) {
    switch (template) {
        case 'REGISTRATION_RECEIVED': return 'Registration Received - IEEE QU';
        case 'REGISTRATION_APPROVED': return 'Registration Approved - IEEE QU';
        case 'REGISTRATION_WAITLISTED': return 'Added to Waitlist - IEEE QU';
        case 'REGISTRATION_REJECTED': return 'Registration Update - IEEE QU';
        case 'REGISTRATION_CANCELLED': return 'Registration Cancelled - IEEE QU';
        case 'ATTENDANCE_CONFIRMATION': return 'Attendance Confirmed - IEEE QU';
        case 'CERTIFICATE_AVAILABLE': return 'Certificate Available - IEEE QU';
        case 'CERTIFICATE_REVOKED': return 'Certificate Revoked - IEEE QU';
        case 'EVENT_REMINDER': return 'Upcoming Event Reminder - IEEE QU';
        default: return 'IEEE QU Notification';
    }
}
function calculateNextAttempt(attemptCount) {
    const delays = [1, 5, 15, 60, 360]; // minutes: 1m, 5m, 15m, 1h, 6h
    const delayMinutes = delays[Math.min(attemptCount, delays.length - 1)];
    const next = new Date();
    next.setMinutes(next.getMinutes() + delayMinutes);
    return next;
}
exports.processMailQueue = (0, firestore_1.onDocumentWritten)({
    document: 'mail/{mailId}',
    secrets: ['RESEND_API_KEY']
}, async (event) => {
    var _a, _b;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after;
    if (!after || !after.exists)
        return; // Document deleted
    const data = after.data();
    if ((data === null || data === void 0 ? void 0 : data.status) !== 'PENDING')
        return; // Only process PENDING emails
    // If there's a scheduled next attempt in the future, do not process yet
    if (data.nextAttemptAt && data.nextAttemptAt.toDate() > new Date()) {
        return;
    }
    const db = (0, firestore_2.getFirestore)();
    const mailRef = after.ref;
    // Use a transaction to grab the email safely and avoid duplicate execution
    const grabbed = await db.runTransaction(async (transaction) => {
        var _a;
        const doc = await transaction.get(mailRef);
        if (!doc.exists)
            return false;
        if (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'PENDING')
            return false;
        transaction.update(mailRef, {
            status: 'PROCESSING',
            updatedAt: firestore_2.FieldValue.serverTimestamp()
        });
        return true;
    });
    if (!grabbed) {
        console.log(`Skipped mail ${mailRef.id} - already processing or not pending.`);
        return;
    }
    try {
        const html = (0, emailTemplates_1.getEmailHtml)(data.template, data.data || {});
        const subject = getSubject(data.template);
        let response;
        // Mock for emulators
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            console.log(`[EMULATOR] Sending mocked email to ${data.to} with subject "${subject}"`);
            // Simulate failure if data contains a specific flag
            if ((_b = data.data) === null || _b === void 0 ? void 0 : _b.simulateFailure) {
                throw new Error('Simulated email delivery failure');
            }
            response = { data: { id: 'mock_id' }, error: null };
        }
        else {
            // Call Resend API
            if (!process.env.RESEND_API_KEY || !process.env.SENDER_EMAIL)
                throw new Error('Email credentials and sender must be configured.');
            const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
            response = await resend.emails.send({
                from: process.env.SENDER_EMAIL,
                to: data.to,
                subject: subject,
                html: html,
            }, { idempotencyKey: mailRef.id });
        }
        if (response.error) {
            throw new Error(response.error.message);
        }
        // Success
        await mailRef.update({
            status: 'DELIVERED',
            deliveredAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            lastError: firestore_2.FieldValue.delete()
        });
        console.log(`Successfully sent mail ${mailRef.id}`);
    }
    catch (error) {
        console.error(`Failed to send mail ${mailRef.id}:`, error);
        const attemptCount = (data.attemptCount || 0) + 1;
        const errorMessage = error.message || String(error);
        if (attemptCount >= 5) {
            // Max retries reached
            await mailRef.update({
                status: 'FAILED',
                lastError: errorMessage,
                attemptCount,
                lastAttemptAt: firestore_2.FieldValue.serverTimestamp(),
                updatedAt: firestore_2.FieldValue.serverTimestamp()
            });
            console.log(`Mail ${mailRef.id} marked as FAILED after ${attemptCount} attempts.`);
        }
        else {
            // Schedule retry
            const nextAttemptAt = calculateNextAttempt(attemptCount);
            await mailRef.update({
                status: 'PENDING',
                lastError: errorMessage,
                attemptCount,
                lastAttemptAt: firestore_2.FieldValue.serverTimestamp(),
                nextAttemptAt: firestore_2.Timestamp.fromDate(nextAttemptAt),
                updatedAt: firestore_2.FieldValue.serverTimestamp()
            });
            console.log(`Mail ${mailRef.id} scheduled for retry ${attemptCount} at ${nextAttemptAt.toISOString()}`);
        }
    }
});
//# sourceMappingURL=processMailQueue.js.map