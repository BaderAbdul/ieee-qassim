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
exports.sendEventReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const email_1 = require("../utils/email");
exports.sendEventReminders = (0, scheduler_1.onSchedule)('every 1 hours', async (event) => {
    var _a, _b;
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMs = now.toMillis();
    // Calculate window: events starting between 23h30m and 24h30m from now
    const windowStartMs = nowMs + (23.5 * 60 * 60 * 1000);
    const windowEndMs = nowMs + (24.5 * 60 * 60 * 1000);
    const windowStart = admin.firestore.Timestamp.fromMillis(windowStartMs);
    const windowEnd = admin.firestore.Timestamp.fromMillis(windowEndMs);
    // Query events happening in this window
    // Assume events have a `date` field (Timestamp)
    const eventsSnapshot = await db.collection('events')
        .where('date', '>=', windowStart)
        .where('date', '<=', windowEnd)
        .get();
    if (eventsSnapshot.empty) {
        console.log('No events starting in ~24 hours.');
        return;
    }
    let reminderCount = 0;
    for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        const eventTitle = eventData.title || 'Event';
        // Get approved registrations
        const registrationsSnapshot = await db.collection('registrations')
            .where('eventId', '==', eventId)
            .where('status', '==', 'approved')
            .get();
        for (const regDoc of registrationsSnapshot.docs) {
            const regData = regDoc.data();
            const userId = regData.userId;
            if (!userId)
                continue;
            const dedupeKey = `event_reminder_24h_${eventId}_${userId}`;
            // Because we use enqueueEmail which catches ALREADY_EXISTS, 
            // it is safe to run this multiple times inside the 1-hour window.
            // E.g., if it runs at 24.1 hours and 23.1 hours, the second run will skip duplicates.
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                const userEmail = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
                const userName = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Student';
                if (userEmail) {
                    await (0, email_1.enqueueEmail)({
                        to: userEmail,
                        template: 'EVENT_REMINDER',
                        dedupeKey,
                        data: {
                            eventName: eventTitle,
                            userName
                        }
                    });
                    reminderCount++;
                }
            }
            catch (error) {
                console.error(`Error queuing reminder for user ${userId} event ${eventId}:`, error);
            }
        }
    }
    console.log(`Queued ${reminderCount} event reminders.`);
});
//# sourceMappingURL=sendEventReminders.js.map