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
exports.processCheckIn = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const jwt = __importStar(require("jsonwebtoken"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.processCheckIn = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (0, auth_1.verifyAuth)(context);
    const { token, eventId } = data;
    if (!token || typeof token !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing token.');
    }
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing eventId.');
    }
    const JWT_SECRET = process.env.JWT_SECRET || ((_a = functions.config().jwt) === null || _a === void 0 ? void 0 : _a.secret);
    if (!JWT_SECRET) {
        (0, errors_1.throwFailedPrecondition)('JWT_SECRET is not configured. Please set it in Firebase Secret Manager.');
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        (0, errors_1.throwFailedPrecondition)('Token is invalid or expired.');
    }
    // Verify the token belongs to the event being checked into
    if (decodedToken.eventId !== eventId) {
        (0, errors_1.throwFailedPrecondition)('Token does not match the event.');
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
        if (((_a = eventSnap.data()) === null || _a === void 0 ? void 0 : _a.state) !== 'Ongoing') {
            (0, errors_1.throwFailedPrecondition)('Event is not currently accepting attendance.');
        }
        // 2. Verify User Registration
        const regId = `${eventId}_${uid}`;
        const regRef = db.collection('registrations').doc(regId);
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('You are not registered for this event.');
        }
        if (((_b = regSnap.data()) === null || _b === void 0 ? void 0 : _b.status) !== 'approved') {
            (0, errors_1.throwFailedPrecondition)('Your registration is not approved.');
        }
        // 3. Check for existing attendance (Idempotency)
        const logId = `${eventId}_${uid}`;
        const logRef = db.collection('attendance_logs').doc(logId);
        const logSnap = await transaction.get(logRef);
        if (logSnap.exists) {
            // Already checked in. Return success without writing again.
            return { status: 'already_checked_in' };
        }
        // 4. Write attendance log
        transaction.set(logRef, {
            userId: uid,
            eventId: eventId,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            verifiedByQR: true,
            tokenNonce: decodedToken.nonce,
        });
        // 5. Award Points Atomically
        const eventData = eventSnap.data();
        const pointsToAward = typeof (eventData === null || eventData === void 0 ? void 0 : eventData.points) === 'number' ? eventData.points : 0;
        if (pointsToAward > 0) {
            const pointTxId = `attendance_${eventId}_${uid}`;
            const pointTxRef = db.collection('point_transactions').doc(pointTxId);
            transaction.set(pointTxRef, {
                userId: uid,
                amount: pointsToAward,
                source: 'attendance',
                reason: `Attended event: ${(eventData === null || eventData === void 0 ? void 0 : eventData.title) || 'Unknown'}`,
                sourceEventId: eventId,
                createdBy: 'system',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        return { status: 'success' };
    });
});
//# sourceMappingURL=processCheckIn.js.map