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
exports.submitCheckIn = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.submitCheckIn = functions.https.onCall(async (data, context) => {
    const callerUid = (0, auth_1.verifyAuth)(context);
    const { eventId, token, targetUserId } = data;
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing eventId.');
    }
    const db = admin.firestore();
    // Use a transaction to ensure idempotency and verify state securely
    return db.runTransaction(async (transaction) => {
        var _a, _b;
        // 1. Verify Event State
        const eventRef = db.collection('events').doc(eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('Event not found.');
        }
        const eventData = eventSnap.data();
        // Check if the caller is an Admin (can bypass some restrictions)
        const callerUserSnap = await transaction.get(db.collection('users').doc(callerUid));
        const callerRole = (_a = callerUserSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
        const isAdmin = callerRole === 'super_admin' || callerRole === 'event_organizer';
        // Determine WHO is being checked in
        let uidToCheckIn = callerUid;
        if (isAdmin && targetUserId) {
            uidToCheckIn = targetUserId.replace('ieee-qu-user:', ''); // Strip prefix if scanned from QR
        }
        else {
            // If it's a student checking themselves in, they MUST provide the static token
            if (!token || typeof token !== 'string') {
                (0, errors_1.throwFailedPrecondition)('Invalid or missing token.');
            }
            if ((eventData === null || eventData === void 0 ? void 0 : eventData.checkinToken) !== token) {
                (0, errors_1.throwFailedPrecondition)('Check-in link is invalid or expired.');
            }
        }
        if ((eventData === null || eventData === void 0 ? void 0 : eventData.state) !== 'Ongoing' && !isAdmin) {
            (0, errors_1.throwFailedPrecondition)('Event is not currently accepting attendance.');
        }
        // 2. Verify User Registration
        const regId = `${eventId}_${uidToCheckIn}`;
        const regRef = db.collection('registrations').doc(regId);
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists) {
            if (isAdmin) {
                (0, errors_1.throwFailedPrecondition)('User is not registered for this event.');
            }
            else {
                (0, errors_1.throwFailedPrecondition)('You are not registered for this event.');
            }
        }
        const currentRegStatus = (_b = regSnap.data()) === null || _b === void 0 ? void 0 : _b.status;
        if (currentRegStatus !== 'approved' && currentRegStatus !== 'attended') {
            (0, errors_1.throwFailedPrecondition)('Registration is not approved.');
        }
        // 3. Check for existing attendance (Idempotency)
        const logId = `${eventId}_${uidToCheckIn}`;
        const logRef = db.collection('attendance_logs').doc(logId);
        const logSnap = await transaction.get(logRef);
        if (logSnap.exists) {
            // Already checked in. Return success without writing again.
            return { status: 'already_checked_in', userId: uidToCheckIn };
        }
        // 4. Write attendance log
        transaction.set(logRef, {
            userId: uidToCheckIn,
            eventId: eventId,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            verifiedByAdmin: isAdmin && targetUserId ? callerUid : false,
        });
        // 4b. Update registration status to attended
        transaction.update(regRef, {
            status: 'attended',
            attended: true,
            attendedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // 5. Award Points Atomically
        const pointsToAward = typeof (eventData === null || eventData === void 0 ? void 0 : eventData.points) === 'number' ? eventData.points : 0;
        if (pointsToAward > 0) {
            const pointTxId = `attendance_${eventId}_${uidToCheckIn}`;
            const pointTxRef = db.collection('point_transactions').doc(pointTxId);
            transaction.set(pointTxRef, {
                userId: uidToCheckIn,
                amount: pointsToAward,
                source: 'attendance',
                reason: `حضور فعالية: ${(eventData === null || eventData === void 0 ? void 0 : eventData.title) || 'Unknown'}`,
                sourceEventId: eventId,
                createdBy: isAdmin ? callerUid : 'system',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                type: 'earned',
                points: pointsToAward,
                description: `حضور فعالية: ${(eventData === null || eventData === void 0 ? void 0 : eventData.title) || 'Unknown'}`,
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
            // User total points will be updated by the onPointTransactionCreated trigger
            // to maintain a single source of truth and prevent double-counting.
        }
        return { status: 'success', userId: uidToCheckIn, awardedPoints: pointsToAward };
    });
});
//# sourceMappingURL=submitCheckIn.js.map