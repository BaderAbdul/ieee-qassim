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
exports.manualAttendanceOverride = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.manualAttendanceOverride = functions.https.onCall(async (data, context) => {
    const adminUid = (0, auth_1.verifyAuth)(context);
    await (0, auth_1.verifyAdmin)(adminUid); // Only admins can do manual overrides
    const { studentUid, eventId } = data;
    if (!studentUid || typeof studentUid !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing studentUid.');
    }
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing eventId.');
    }
    const db = admin.firestore();
    // Use a transaction to ensure idempotency and verify state securely
    return db.runTransaction(async (transaction) => {
        var _a;
        // 1. Verify Event Exists
        const eventRef = db.collection('events').doc(eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('Event not found.');
        }
        // We don't enforce 'Ongoing' for manual override because admins might correct attendance after the fact.
        // 2. Verify User Registration
        const regId = `${eventId}_${studentUid}`;
        const regRef = db.collection('registrations').doc(regId);
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('Student is not registered for this event.');
        }
        if (((_a = regSnap.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'approved') {
            (0, errors_1.throwFailedPrecondition)('Student registration is not approved.');
        }
        // 3. Check for existing attendance (Idempotency)
        const logId = `${eventId}_${studentUid}`;
        const logRef = db.collection('attendance_logs').doc(logId);
        const logSnap = await transaction.get(logRef);
        if (logSnap.exists) {
            return { status: 'already_checked_in' };
        }
        // 4. Write attendance log
        transaction.set(logRef, {
            userId: studentUid,
            eventId: eventId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            verifiedByQR: false,
            manualOverride: true,
            overriddenBy: adminUid,
            overrideTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { status: 'success' };
    });
});
//# sourceMappingURL=manualAttendanceOverride.js.map