"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAttendance = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const email_1 = require("../utils/email");
exports.emailAttendance = (0, firestore_2.onDocumentCreated)('attendance_logs/{logId}', async (event) => {
    var _a, _b, _c;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const eventId = data.eventId;
    const userId = data.userId;
    if (!eventId || !userId)
        return;
    const db = (0, firestore_1.getFirestore)();
    const [userDoc, eventDoc] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('events').doc(eventId).get()
    ]);
    const userEmail = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
    const userName = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Student';
    const eventTitle = ((_c = eventDoc.data()) === null || _c === void 0 ? void 0 : _c.title) || 'Event';
    if (!userEmail)
        return;
    const dedupeKey = `attendance_confirmation_${eventId}_${userId}`;
    await (0, email_1.enqueueEmail)({
        to: userEmail,
        template: 'ATTENDANCE_CONFIRMATION',
        dedupeKey,
        data: {
            eventName: eventTitle,
            userName
        }
    });
});
//# sourceMappingURL=emailAttendance.js.map