"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailCertificates = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const email_1 = require("../utils/email");
exports.emailCertificates = (0, firestore_2.onDocumentWritten)('certificates/{certificateId}', async (event) => {
    var _a, _b, _c, _d, _e;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before;
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after;
    if (!after || !after.exists)
        return; // Document deleted
    const afterData = after.data();
    const eventId = afterData === null || afterData === void 0 ? void 0 : afterData.eventId;
    const userId = afterData === null || afterData === void 0 ? void 0 : afterData.userId;
    const newStatus = afterData === null || afterData === void 0 ? void 0 : afterData.status;
    if (before && before.exists) {
        const beforeData = before.data();
        if ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) === newStatus) {
            // Status didn't change, do nothing
            return;
        }
    }
    if (!eventId || !userId || !newStatus)
        return;
    // Only trigger on Available or Revoked
    if (newStatus !== 'Available' && newStatus !== 'Revoked') {
        return;
    }
    const certificateId = event.params.certificateId;
    const db = (0, firestore_1.getFirestore)();
    const [userDoc, eventDoc] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('events').doc(eventId).get()
    ]);
    const userEmail = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.email;
    const userName = ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.displayName) || 'Student';
    const eventTitle = ((_e = eventDoc.data()) === null || _e === void 0 ? void 0 : _e.title) || 'Event';
    if (!userEmail)
        return;
    let template = null;
    let dedupeKey = '';
    if (newStatus === 'Available') {
        template = 'CERTIFICATE_AVAILABLE';
        dedupeKey = `certificate_available_${certificateId}`;
    }
    else if (newStatus === 'Revoked') {
        template = 'CERTIFICATE_REVOKED';
        dedupeKey = `certificate_revoked_${certificateId}`;
    }
    if (template) {
        await (0, email_1.enqueueEmail)({
            to: userEmail,
            template,
            dedupeKey,
            data: {
                eventName: eventTitle,
                userName
            }
        });
    }
});
//# sourceMappingURL=emailCertificates.js.map