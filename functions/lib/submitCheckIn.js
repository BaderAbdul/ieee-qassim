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
exports.submitCheckIn = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const callerUid = (0, auth_1.verifyAuth)(context);
    const { eventId, token, targetUserId, feedbackData } = data;
    if (!eventId || typeof eventId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'رقم الفعالية مفقود أو غير صالح');
    }
    const db = admin.firestore();
    // 1. Fetch Event first
    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'الفعالية غير موجودة');
    }
    const eventData = eventSnap.data();
    // 2. Determine caller role
    const callerUserSnap = await db.collection('users').doc(callerUid).get();
    const callerData = callerUserSnap.data();
    const callerRole = callerData === null || callerData === void 0 ? void 0 : callerData.role;
    const callerEmail = (callerData === null || callerData === void 0 ? void 0 : callerData.email) || ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || '';
    const isAdmin = callerRole === 'super_admin' || callerRole === 'event_organizer';
    // 3. Determine target user ID to check-in
    let uidToCheckIn = callerUid;
    if (isAdmin && targetUserId) {
        uidToCheckIn = targetUserId.replace('ieee-qu-user:', '');
    }
    else {
        if (!token || typeof token !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'رمز التحضير مفقود أو غير صالح');
        }
        if ((eventData === null || eventData === void 0 ? void 0 : eventData.checkinToken) !== token) {
            throw new functions.https.HttpsError('permission-denied', 'رابط التحضير غير صالح أو منتهي الصلاحية');
        }
    }
    // 4. Check Event state
    if ((eventData === null || eventData === void 0 ? void 0 : eventData.state) !== 'Ongoing' && !isAdmin) {
        throw new functions.https.HttpsError('failed-precondition', `الفعالية ليست قيد التحضير حالياً (حالتها الحالية: ${(eventData === null || eventData === void 0 ? void 0 : eventData.state) || 'غير محددة'}). يرجى التأكد من المنظمين لتفعيل حالة الفعالية إلى Ongoing.`);
    }
    // 5. Verify User Registration
    const regId = `${eventId}_${uidToCheckIn}`;
    const regRef = db.collection('registrations').doc(regId);
    const regSnap = await regRef.get();
    if (!regSnap.exists) {
        throw new functions.https.HttpsError('failed-precondition', isAdmin ? 'المستخدم غير مسجل في هذه الفعالية' : 'عذراً، يجب التسجيل في الفعالية أولاً قبل التحضير');
    }
    const currentRegStatus = (_c = regSnap.data()) === null || _c === void 0 ? void 0 : _c.status;
    if (currentRegStatus !== 'approved' && currentRegStatus !== 'attended') {
        throw new functions.https.HttpsError('failed-precondition', 'طلب تسجيلك في الفعالية لم يتم قبوله بعد');
    }
    // 6. Transaction for Attendance, Feedback, and Points
    try {
        return await db.runTransaction(async (transaction) => {
            // Re-verify log in transaction to avoid race conditions
            const logId = `${eventId}_${uidToCheckIn}`;
            const logRef = db.collection('attendance_logs').doc(logId);
            const logSnap = await transaction.get(logRef);
            if (logSnap.exists) {
                return { status: 'already_checked_in', userId: uidToCheckIn };
            }
            // Record Attendance Log
            transaction.set(logRef, {
                userId: uidToCheckIn,
                eventId: eventId,
                timestamp: firestore_1.FieldValue.serverTimestamp(),
                verifiedByAdmin: isAdmin && targetUserId ? callerUid : false,
            });
            // Update Registration Status
            transaction.update(regRef, {
                status: 'attended',
                attended: true,
                attendedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            // Increment event attendance count
            transaction.update(eventRef, {
                attendanceCount: firestore_1.FieldValue.increment(1),
            });
            // Save Feedback if provided
            if (feedbackData && typeof feedbackData === 'object') {
                const feedbackId = `${eventId}_${uidToCheckIn}`;
                const feedbackRef = db.collection('event_feedback').doc(feedbackId);
                const ratingVal = typeof feedbackData.rating === 'number' ? Math.max(1, Math.min(5, feedbackData.rating)) : 5;
                transaction.set(feedbackRef, {
                    id: feedbackId,
                    eventId,
                    userId: uidToCheckIn,
                    userEmail: callerEmail,
                    rating: ratingVal,
                    answers: feedbackData.answers || {},
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            // Award Points
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
                    timestamp: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            return { status: 'success', userId: uidToCheckIn, awardedPoints: pointsToAward };
        });
    }
    catch (error) {
        console.error('Error executing checkin transaction:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'حدث خطأ غير متوقع أثناء التحضير');
    }
});
//# sourceMappingURL=submitCheckIn.js.map