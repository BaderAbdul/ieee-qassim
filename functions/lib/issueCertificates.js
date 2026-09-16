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
exports.issueCertificates = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.issueCertificates = functions.https.onCall(async (data, context) => {
    const adminUid = (0, auth_1.verifyAuth)(context);
    const { role } = await (0, auth_1.verifyAdmin)(adminUid);
    if (role !== 'super_admin' && role !== 'event_organizer') {
        (0, errors_1.throwFailedPrecondition)('Insufficient permissions. Only Organizers or Super Admins can issue certificates.');
    }
    const { eventId, userIds } = data;
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Missing or invalid eventId.');
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
        (0, errors_1.throwFailedPrecondition)('Missing or invalid userIds array.');
    }
    const db = admin.firestore();
    // 1. Verify Event is Completed
    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
        (0, errors_1.throwFailedPrecondition)('Event not found.');
    }
    const eventData = eventSnap.data();
    if ((eventData === null || eventData === void 0 ? void 0 : eventData.state) !== 'Completed') {
        (0, errors_1.throwFailedPrecondition)('Certificates can only be issued for Completed events.');
    }
    // Determine queue service to call to trigger background worker.
    // In a real Gen2 environment, we would use Cloud Tasks or Google Cloud Pub/Sub.
    // Since we are creating a generic firebase background function using onDocumentCreated or onCall,
    // we will trigger the generation automatically when the certificate document is created with status = 'Generating'.
    const BATCH_SIZE = 50;
    let queuedCount = 0;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const chunk = userIds.slice(i, i + BATCH_SIZE);
        const chunkCount = await db.runTransaction(async (transaction) => {
            var _a, _b, _c;
            let count = 0;
            // Phase 1: All Reads
            const readResults = [];
            for (const userId of chunk) {
                const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
                const certificateId = `certificate_${eventId}_${userId}`;
                const certRef = db.collection('certificates').doc(certificateId);
                const userRef = db.collection('users').doc(userId);
                const [logSnap, certSnap, userSnap] = await Promise.all([
                    transaction.get(logRef),
                    transaction.get(certRef),
                    transaction.get(userRef)
                ]);
                readResults.push({
                    userId,
                    certificateId,
                    certRef,
                    logSnap,
                    certSnap,
                    userSnap
                });
            }
            // Phase 2: All Writes
            for (const data of readResults) {
                if (!data.logSnap.exists) {
                    continue; // Skip, no attendance found
                }
                if (data.certSnap.exists) {
                    const currentStatus = (_a = data.certSnap.data()) === null || _a === void 0 ? void 0 : _a.status;
                    if (currentStatus === 'Available' || currentStatus === 'Generating') {
                        continue; // Already processed
                    }
                }
                const studentName = ((_b = data.userSnap.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Student';
                // Create or overwrite as Generating
                transaction.set(data.certRef, {
                    id: data.certificateId,
                    eventId,
                    userId: data.userId,
                    status: 'Generating',
                    storagePath: `certificates/${eventId}/${data.certificateId}.pdf`,
                    studentName,
                    eventTitle: eventData.title,
                    eventType: eventData.type,
                    attendanceDate: ((_c = data.logSnap.data()) === null || _c === void 0 ? void 0 : _c.timestamp) || eventData.date,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    attemptCount: 0,
                    issuedBy: adminUid,
                }, { merge: true });
                count++;
            }
            return count;
        });
        queuedCount += chunkCount;
    }
    return { status: 'success', queuedCount };
});
//# sourceMappingURL=issueCertificates.js.map