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
exports.onRegistrationCancelled = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
exports.onRegistrationCancelled = functions.firestore
    .document('registrations/{registrationId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Only trigger if status changed from approved/pending to cancelled
    if ((before.status === 'approved' || before.status === 'pending') &&
        after.status === 'cancelled') {
        const eventId = after.eventId;
        if (!eventId)
            return null;
        const db = (0, firestore_1.getFirestore)();
        await db.runTransaction(async (transaction) => {
            var _a;
            // 1. Read event doc to check mode and capacity
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists)
                return null;
            const eventData = eventDoc.data() || {};
            if (eventData.state !== 'Registration Open')
                return null;
            const capacity = typeof eventData.capacity === 'number' ? eventData.capacity : 0;
            const currentCount = typeof eventData.registeredCount === 'number' ? eventData.registeredCount : 0;
            // If capacity is defined (> 0) and already at or above capacity, do not promote to avoid oversubscribing
            if (!eventData.isUnlimitedCapacity && currentCount >= capacity) {
                console.warn(`Capacity full for event ${eventId} (${currentCount}/${capacity}). Skipping waitlist promotion.`);
                return null;
            }
            // 2. Query earliest waitlisted registration (FIFO)
            const waitlistQuery = db.collection('registrations')
                .where('eventId', '==', eventId)
                .where('status', '==', 'waitlisted')
                .orderBy('timestamp', 'asc')
                .limit(1);
            const waitlistSnap = await transaction.get(waitlistQuery);
            if (waitlistSnap.empty) {
                // No waitlisted candidate to promote.
                // Note: Client-side cancellation already decremented registeredCount.
                return null;
            }
            const candidateDoc = waitlistSnap.docs[0];
            const newStatus = eventData.registrationMode === 'Manual' ? 'pending' : 'approved';
            // 3. Atomically promote the candidate
            transaction.update(candidateDoc.ref, {
                status: newStatus,
                promotedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // 4. Since the client decremented registeredCount when the previous user cancelled,
            // and we just filled that spot with the promoted candidate, increment registeredCount by 1.
            transaction.update(eventRef, {
                registeredCount: firestore_1.FieldValue.increment(1)
            });
            console.log(`Auto-promoted user ${(_a = candidateDoc.data()) === null || _a === void 0 ? void 0 : _a.userId} to ${newStatus} for event ${eventId}`);
            return null;
        });
    }
    return null;
});
//# sourceMappingURL=onRegistrationCancelled.js.map