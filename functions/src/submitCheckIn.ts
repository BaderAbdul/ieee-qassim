import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuth } from './utils/auth';

export const submitCheckIn = functions.https.onCall(async (data, context) => {
  const callerUid = verifyAuth(context);
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
  const callerRole = callerData?.role;
  const callerEmail = callerData?.email || context.auth?.token?.email || '';
  const isAdmin = callerRole === 'super_admin' || callerRole === 'event_organizer';

  // 3. Determine target user ID to check-in
  let uidToCheckIn = callerUid;

  if (isAdmin && targetUserId) {
    uidToCheckIn = targetUserId.replace('ieee-qu-user:', '');
  } else {
    if (!token || typeof token !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'رمز التحضير مفقود أو غير صالح');
    }
    if (eventData?.checkinToken !== token) {
      throw new functions.https.HttpsError('permission-denied', 'رابط التحضير غير صالح أو منتهي الصلاحية');
    }
  }

  // 4. Check Event state
  if (eventData?.state !== 'Ongoing' && !isAdmin) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `الفعالية ليست قيد التحضير حالياً (حالتها الحالية: ${eventData?.state || 'غير محددة'}). يرجى التأكد من المنظمين لتفعيل حالة الفعالية إلى Ongoing.`
    );
  }

  // 5. Verify User Registration
  const regId = `${eventId}_${uidToCheckIn}`;
  const regRef = db.collection('registrations').doc(regId);
  const regSnap = await regRef.get();

  if (!regSnap.exists) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      isAdmin ? 'المستخدم غير مسجل في هذه الفعالية' : 'عذراً، يجب التسجيل في الفعالية أولاً قبل التحضير'
    );
  }

  const currentRegStatus = regSnap.data()?.status;
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
        timestamp: FieldValue.serverTimestamp(),
        verifiedByAdmin: isAdmin && targetUserId ? callerUid : false,
      });

      // Update Registration Status
      transaction.update(regRef, {
        status: 'attended',
        attended: true,
        attendedAt: FieldValue.serverTimestamp(),
      });

      // Increment event attendance count
      transaction.update(eventRef, {
        attendanceCount: FieldValue.increment(1),
      });

      // Save Feedback if provided
      if (feedbackData && typeof feedbackData === 'object') {
        const feedbackId = `${eventId}_${uidToCheckIn}`;
        const feedbackRef = db.collection('event_feedback').doc(feedbackId);
        const ratingVal = typeof feedbackData.rating === 'number' ? Math.max(1, Math.min(5, feedbackData.rating)) : 5;

        transaction.set(
          feedbackRef,
          {
            id: feedbackId,
            eventId,
            userId: uidToCheckIn,
            userEmail: callerEmail,
            rating: ratingVal,
            answers: feedbackData.answers || {},
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Award Points
      const pointsToAward = typeof eventData?.points === 'number' ? eventData.points : 0;

      if (pointsToAward > 0) {
        const pointTxId = `attendance_${eventId}_${uidToCheckIn}`;
        const pointTxRef = db.collection('point_transactions').doc(pointTxId);

        transaction.set(pointTxRef, {
          userId: uidToCheckIn,
          amount: pointsToAward,
          source: 'attendance',
          reason: `حضور فعالية: ${eventData?.title || 'Unknown'}`,
          sourceEventId: eventId,
          createdBy: isAdmin ? callerUid : 'system',
          createdAt: FieldValue.serverTimestamp(),
          type: 'earned',
          points: pointsToAward,
          description: `حضور فعالية: ${eventData?.title || 'Unknown'}`,
          timestamp: FieldValue.serverTimestamp(),
        });
      }

      return { status: 'success', userId: uidToCheckIn, awardedPoints: pointsToAward };
    });
  } catch (error: any) {
    console.error('Error executing checkin transaction:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'حدث خطأ غير متوقع أثناء التحضير');
  }
});
