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
exports.hasCapacity = exports.reserved = void 0;
exports.documentId = documentId;
exports.changeRegistration = changeRegistration;
exports.recordAttendance = recordAttendance;
const node_crypto_1 = require("node:crypto");
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
function documentId(value, label) {
    if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid ${label}.`);
    }
    return value;
}
const reserved = (status) => ['pending', 'approved', 'attended'].includes(status);
exports.reserved = reserved;
const hasCapacity = (event, count) => event.isUnlimitedCapacity === true || count < Math.max(0, Number(event.capacity) || 0);
exports.hasCapacity = hasCapacity;
/** The event document serializes registration, cancellation, and FIFO promotion. */
async function changeRegistration(uid, eventId, action, actorUid = uid) {
    const db = (0, firestore_1.getFirestore)();
    const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
    const regRef = db.collection('registrations').doc(`${eventId}_${documentId(uid, 'userId')}`);
    return db.runTransaction(async (tx) => {
        var _a;
        // Always acquire the common event document before user-specific documents.
        const eventSnap = await tx.get(eventRef);
        const [regSnap, userSnap] = await Promise.all([
            tx.get(regRef), tx.get(db.collection('users').doc(uid)),
        ]);
        if (!eventSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Event not found.');
        const event = eventSnap.data();
        const user = userSnap.data();
        const before = (_a = regSnap.data()) === null || _a === void 0 ? void 0 : _a.status;
        let count = Math.max(0, event.registeredCount || 0);
        const initialCount = count;
        let status;
        if (action === 'register') {
            if (!user || user.isRestricted || (user.role !== 'super_admin' && user.profileCompleted !== true)) {
                throw new functions.https.HttpsError('failed-precondition', 'Complete your profile before registering.');
            }
            if (event.state !== 'Registration Open')
                throw new functions.https.HttpsError('failed-precondition', 'Registration is closed.');
            if (regSnap.exists && before !== 'cancelled')
                throw new functions.https.HttpsError('already-exists', 'Already registered.');
            let queueHasPriority = false;
            if ((0, exports.hasCapacity)(event, count) && event.isUnlimitedCapacity !== true) {
                const waiting = await tx.get(db.collection('registrations').where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp').limit(1));
                queueHasPriority = !waiting.empty;
            }
            status = (0, exports.hasCapacity)(event, count) && !queueHasPriority ? (event.registrationMode === 'Manual' ? 'pending' : 'approved') : 'waitlisted';
        }
        else {
            if (!regSnap.exists)
                throw new functions.https.HttpsError('not-found', 'Registration not found.');
            if (before === 'attended')
                throw new functions.https.HttpsError('failed-precondition', 'Attendance cannot be reversed through registration.');
            if (action === 'cancel') {
                if (before === 'cancelled')
                    return { status: before, attendeeCount: count };
                status = 'cancelled';
            }
            else if (action === 'approve') {
                if (!['pending', 'waitlisted', 'approved'].includes(before))
                    throw new functions.https.HttpsError('failed-precondition', 'Registration is not awaiting approval.');
                if (!(0, exports.reserved)(before) && !(0, exports.hasCapacity)(event, count))
                    throw new functions.https.HttpsError('resource-exhausted', 'Event is full.');
                status = 'approved';
            }
            else {
                status = 'rejected';
            }
        }
        count += ((0, exports.reserved)(status) ? 1 : 0) - ((0, exports.reserved)(before) ? 1 : 0);
        let candidate;
        if ((0, exports.reserved)(before) && !(0, exports.reserved)(status) && event.state === 'Registration Open' && (0, exports.hasCapacity)(event, count)) {
            const waiting = await tx.get(db.collection('registrations').where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp').limit(1));
            candidate = waiting.docs[0];
            if (candidate)
                count++;
        }
        // All reads precede writes.
        if (action === 'register') {
            tx.set(regRef, Object.assign({ eventId, userId: uid, status, timestamp: firestore_1.FieldValue.serverTimestamp(), userName: (user === null || user === void 0 ? void 0 : user.arabicFullName) || (user === null || user === void 0 ? void 0 : user.displayName) || 'Student', userEmail: (user === null || user === void 0 ? void 0 : user.email) || '' }, ((user === null || user === void 0 ? void 0 : user.universityId) ? { universityId: user.universityId } : {})));
        }
        else {
            tx.update(regRef, Object.assign({ status, updatedBy: actorUid }, (status === 'cancelled' ? { cancelledAt: firestore_1.FieldValue.serverTimestamp() } : {})));
        }
        if (candidate)
            tx.update(candidate.ref, { status: event.registrationMode === 'Manual' ? 'pending' : 'approved', promotedAt: firestore_1.FieldValue.serverTimestamp() });
        if (count !== initialCount)
            tx.update(eventRef, { registeredCount: Math.max(0, count) });
        return { status, attendeeCount: Math.max(0, count) };
    }, { maxAttempts: 10 });
}
async function recordAttendance(input) {
    const { eventId, userId, actorUid } = input;
    const db = (0, firestore_1.getFirestore)();
    const eventRef = db.collection('events').doc(documentId(eventId, 'eventId'));
    const regRef = db.collection('registrations').doc(`${eventId}_${documentId(userId, 'userId')}`);
    const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
    const pointRef = db.collection('point_transactions').doc(`attendance_${eventId}_${userId}`);
    // Badge history is advisory; keep range-query locks out of the admission transaction.
    const pastAttendance = await db.collection('attendance_logs').where('userId', '==', userId).limit(4).get();
    return db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e;
        const eventSnap = await tx.get(eventRef);
        const [regSnap, logSnap, pointSnap, userSnap, secretSnap] = await Promise.all([
            tx.get(regRef), tx.get(logRef), tx.get(pointRef), tx.get(db.collection('users').doc(userId)),
            tx.get(db.collection('event_secrets').doc(eventId)),
        ]);
        const event = eventSnap.data();
        if (!event)
            throw new functions.https.HttpsError('not-found', 'Event not found.');
        if (!userSnap.exists || ((_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.isRestricted))
            throw new functions.https.HttpsError('permission-denied', 'Student account is unavailable.');
        if (!input.admin && event.state !== 'Ongoing')
            throw new functions.https.HttpsError('failed-precondition', 'Event is not accepting attendance.');
        if (input.admin && !['Ongoing', 'Completed'].includes(event.state))
            throw new functions.https.HttpsError('failed-precondition', 'Start the event before recording attendance.');
        const secret = secretSnap.data();
        if (!input.admin && (!input.token || (secret === null || secret === void 0 ? void 0 : secret.token) !== input.token || !secret.expiresAt || secret.expiresAt.toMillis() <= Date.now()))
            throw new functions.https.HttpsError('permission-denied', 'Invalid or expired check-in token.');
        if (!regSnap.exists || !['approved', 'attended'].includes((_b = regSnap.data()) === null || _b === void 0 ? void 0 : _b.status))
            throw new functions.https.HttpsError('failed-precondition', 'An approved registration is required.');
        if (logSnap.exists)
            return { status: 'already_checked_in', userId, awardedPoints: 0 };
        const feedback = input.admin ? undefined : input.feedback;
        if (feedback) {
            if (!Number.isFinite(feedback.rating) || feedback.rating < 1 || feedback.rating > 5)
                throw new functions.https.HttpsError('invalid-argument', 'Invalid rating.');
            for (const [key, value] of Object.entries(feedback.answers || {})) {
                if (key.length > 128 || typeof value !== 'string' || value.length > 3000)
                    throw new functions.https.HttpsError('invalid-argument', 'Invalid feedback.');
            }
            for (const question of event.feedbackQuestions || []) {
                if (question.required && !((_d = (_c = feedback.answers) === null || _c === void 0 ? void 0 : _c[question.id]) === null || _d === void 0 ? void 0 : _d.trim()))
                    throw new functions.https.HttpsError('invalid-argument', 'Answer the required feedback questions.');
            }
        }
        const points = Number.isSafeInteger(event.points) && event.points > 0 ? event.points : 0;
        const badges = ['ieee_starter'];
        if (pastAttendance.size + 1 >= 3)
            badges.push('active_engineer');
        if (pastAttendance.size + 1 >= 5)
            badges.push('tech_pioneer');
        tx.update(db.collection('users').doc(userId), { badges: firestore_1.FieldValue.arrayUnion(...badges) });
        tx.create(logRef, { eventId, userId, timestamp: firestore_1.FieldValue.serverTimestamp(), verifiedByAdmin: input.admin ? actorUid : false });
        tx.update(regRef, { status: 'attended', attended: true, attendedAt: firestore_1.FieldValue.serverTimestamp() });
        const shard = String((0, node_crypto_1.createHash)('sha256').update(userId).digest()[0] % 64);
        tx.set(eventRef.collection('attendance_shards').doc(shard), { count: firestore_1.FieldValue.increment(1) }, { merge: true });
        tx.set(db.collection('pending_checkins').doc(`${eventId}_${userId}`), { eventId, userId, eventTitle: event.title, eventTitleEn: event.titleEn || null, points, feedbackQuestions: event.feedbackQuestions || [], attendanceRecorded: true, status: feedback ? 'completed' : 'pending', scannedAt: firestore_1.FieldValue.serverTimestamp() });
        if (feedback)
            tx.set(db.collection('event_feedback').doc(`${eventId}_${userId}`), { eventId, userId, userEmail: ((_e = userSnap.data()) === null || _e === void 0 ? void 0 : _e.email) || '', rating: feedback.rating, answers: feedback.answers || {}, createdAt: firestore_1.FieldValue.serverTimestamp() });
        if (points > 0 && !pointSnap.exists)
            tx.create(pointRef, { userId, amount: points, source: 'attendance', reason: `Attendance: ${event.title || eventId}`, sourceEventId: eventId, createdBy: input.admin ? actorUid : 'system', createdAt: firestore_1.FieldValue.serverTimestamp() });
        return { status: 'success', userId, awardedPoints: pointSnap.exists ? 0 : points };
    }, { maxAttempts: 10 });
}
//# sourceMappingURL=eventLifecycle.js.map