"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailRegistrations = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const email_1 = require("../utils/email");
exports.emailRegistrations = (0, firestore_1.onDocumentWritten)('registrations/{registrationId}', async (event) => {
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
    const db = admin.firestore();
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
    switch (newStatus) {
        case 'pending':
            template = 'REGISTRATION_RECEIVED';
            dedupeKey = `registration_received_${eventId}_${userId}`;
            break;
        case 'approved':
            template = 'REGISTRATION_APPROVED';
            dedupeKey = `registration_approved_${eventId}_${userId}`;
            break;
        case 'waitlisted':
            template = 'REGISTRATION_WAITLISTED';
            dedupeKey = `registration_waitlisted_${eventId}_${userId}`;
            break;
        case 'rejected':
            template = 'REGISTRATION_REJECTED';
            dedupeKey = `registration_rejected_${eventId}_${userId}`;
            break;
        case 'cancelled':
            template = 'REGISTRATION_CANCELLED';
            dedupeKey = `registration_cancelled_${eventId}_${userId}`;
            break;
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
//# sourceMappingURL=emailRegistrations.js.map