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
exports.registerForEvent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.registerForEvent = functions.https.onCall(async (data, context) => {
    const uid = (0, auth_1.verifyAuth)(context);
    const { eventId } = data;
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid eventId.');
    }
    const db = admin.firestore();
    const eventRef = db.collection('events').doc(eventId);
    const regId = `${eventId}_${uid}`;
    const regRef = db.collection('registrations').doc(regId);
    return db.runTransaction(async (transaction) => {
        var _a;
        // 1. Read event and existing registration
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists) {
            (0, errors_1.throwNotFound)('Event not found.');
        }
        const eventData = eventSnap.data();
        if (eventData.state !== 'Registration Open' && eventData.state !== 'Published') {
            (0, errors_1.throwFailedPrecondition)('Registration is not open for this event.');
        }
        const regSnap = await transaction.get(regRef);
        if (regSnap.exists) {
            const currentStatus = (_a = regSnap.data()) === null || _a === void 0 ? void 0 : _a.status;
            if (currentStatus !== 'cancelled') {
                (0, errors_1.throwFailedPrecondition)('You are already registered or pending for this event.');
            }
        }
        // 2. Count active attendees securely to avoid phantom reads (Race Condition)
        // We rely on a counter stored directly on the event document to ensure the transaction locks correctly.
        let attendeeCount = eventData.registeredCount || 0;
        // 3. Determine status
        let status = 'approved';
        if (eventData.registrationMode === 'Manual') {
            status = 'pending';
        }
        else if (attendeeCount >= eventData.capacity) {
            status = 'waitlisted';
        }
        // 4. Write the registration
        const regData = {
            userId: uid,
            eventId: eventId,
            status: status,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(regRef, regData);
        // 5. Update the event document's registeredCount to ensure strict serialization
        transaction.update(eventRef, {
            registeredCount: attendeeCount + 1
        });
        return { status, attendeeCount: attendeeCount + 1 };
    });
});
//# sourceMappingURL=registerForEvent.js.map