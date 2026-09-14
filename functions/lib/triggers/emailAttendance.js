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
exports.emailAttendance = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const email_1 = require("../utils/email");
exports.emailAttendance = (0, firestore_1.onDocumentCreated)('attendance_logs/{logId}', async (event) => {
    var _a, _b, _c;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const eventId = data.eventId;
    const userId = data.userId;
    if (!eventId || !userId)
        return;
    const db = admin.firestore();
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