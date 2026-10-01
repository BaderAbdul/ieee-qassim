'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CheckCircle, XCircle, Loader2, Star, Sparkles, Award, Send } from 'lucide-react';
import { PlatformEvent, CustomQuestion } from '@/lib/types';

export default function SelfCheckinPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, login, loading: authLoading } = useAuth();
  const isAr = locale === 'ar';

  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(true);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View status
  const [status, setStatus] = useState<'idle_form' | 'submitting' | 'success' | 'already_attended' | 'error'>(
    !token ? 'error' : 'idle_form'
  );
  const [errorMessage, setErrorMessage] = useState(
    !token ? (isAr ? 'الرابط غير صالح أو مفقود رمزه السري' : 'Invalid link or missing token') : ''
  );
  const [awardedPoints, setAwardedPoints] = useState<number>(0);

  // Fetch Event Details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const evSnap = await getDoc(doc(db, 'events', eventId));
        if (evSnap.exists()) {
          setEvent({ id: evSnap.id, ...evSnap.data() } as PlatformEvent);
        }
      } catch (err) {
        console.error("Error loading event for check-in", err);
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSelectChoice = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleTextAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleQuickChipClick = (questionId: string, chipText: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || '';
      if (current.includes(chipText)) return prev;
      return { ...prev, [questionId]: current ? `${current} - ${chipText}` : chipText };
    });
  };

  const handleConfirmCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user || isSubmitting) return;

    // Validate required questions
    if (event?.feedbackQuestions) {
      for (const q of event.feedbackQuestions) {
        if (q.required && (!answers[q.id] || answers[q.id].trim().length === 0)) {
          alert(isAr ? `يرجى الإجابة على السؤال الإجباري: "${q.title}"` : `Please answer required question: "${q.title}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setStatus('submitting');

    try {
      // 1. Try Cloud Function first
      const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
      const response = await submitCheckInFn({
        eventId,
        token,
        feedbackData: {
          rating,
          answers
        }
      });

      const result = response.data as { status?: string; message?: string; awardedPoints?: number };

      if (result.status === 'already_checked_in') {
        setStatus('already_attended');
      } else {
        setAwardedPoints(result.awardedPoints || event?.points || 0);
        setStatus('success');
      }
    } catch (cfError: any) {
      console.warn("Cloud function unavailable or returned error, attempting client fallback:", cfError);

      try {
        // Fallback: Perform check-in directly using Firestore Client SDK Transaction
        const points = event?.points || 0;
        const regId = `${eventId}_${user.uid}`;
        const logId = `${eventId}_${user.uid}`;
        const feedbackId = `${eventId}_${user.uid}`;
        const pointTxId = `attendance_${eventId}_${user.uid}`;

        const isAlreadyCheckedIn = await runTransaction(db, async (tx) => {
          // Verify Event state & token
          const evRef = doc(db, 'events', eventId);
          const evSnap = await tx.get(evRef);
          if (!evSnap.exists()) {
            throw new Error(isAr ? 'الفعالية غير موجودة' : 'Event not found');
          }
          const evData = evSnap.data();
          if (evData.checkinToken !== token) {
            throw new Error(isAr ? 'رابط التحضير غير صالح أو منتهي الصلاحية' : 'Invalid or expired check-in token');
          }

          // Check if log exists (idempotency guard)
          const logRef = doc(db, 'attendance_logs', logId);
          const logSnap = await tx.get(logRef);
          if (logSnap.exists()) {
            return true; // already checked in
          }

          // Check registration (read before writes)
          const regRef = doc(db, 'registrations', regId);
          const regSnap = await tx.get(regRef);

          // --- WRITES START HERE ---

          // Write attendance log (ID format: eventId_userId — matches security rule pattern)
          tx.set(logRef, {
            userId: user.uid,
            eventId: eventId,
            timestamp: serverTimestamp(),
            verifiedByAdmin: false,
          });

          // Update registration status if exists
          if (regSnap.exists() && regSnap.data().status !== 'attended') {
            tx.update(regRef, {
              status: 'attended',
              attended: true,
              attendedAt: serverTimestamp(),
            });
          }

          // Increment event attendanceCount (allowed for 'Ongoing' events)
          tx.update(evRef, {
            attendanceCount: increment(1)
          });

          // Write feedback
          const feedbackRef = doc(db, 'event_feedback', feedbackId);
          tx.set(feedbackRef, {
            id: feedbackId,
            eventId,
            userId: user.uid,
            userEmail: user.email || '',
            rating,
            answers,
            createdAt: serverTimestamp()
          }, { merge: true });

          // Write point transaction & update user 'points' field
          // (Security rules allow self-write of attendance point_transactions with id pattern attendance_*_uid)
          if (points > 0) {
            const pointTxRef = doc(db, 'point_transactions', pointTxId);
            tx.set(pointTxRef, {
              userId: user.uid,
              amount: points,
              points: points,
              source: 'attendance',
              type: 'earned',
              createdBy: 'system',
              reason: `حضور فعالية: ${evData.title || ''}`,
              description: `حضور فعالية: ${evData.title || ''}`,
              sourceEventId: eventId,
              createdAt: serverTimestamp(),
              timestamp: serverTimestamp()
            });

            // Update user 'points' field (rules allow self-increment of 'points' field)
            const userRef = doc(db, 'users', user.uid);
            tx.update(userRef, {
              points: increment(points)
            });
          }

          return false;
        });

        if (isAlreadyCheckedIn) {
          setStatus('already_attended');
        } else {
          setAwardedPoints(points);
          setStatus('success');
        }
      } catch (fallbackError: any) {
        console.error("Fallback check-in failed:", fallbackError);
        setStatus('error');
        setErrorMessage(fallbackError.message || (isAr ? 'حدث خطأ أثناء التحضير' : 'Error during check-in'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold text-sm">{isAr ? 'جاري تجهيز صفحة التحضير...' : 'Loading check-in page...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        {!user && !authLoading && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-cairo mb-2">
              {locale === 'ar' ? 'سجّل دخولك للتحضير' : 'Log in to Check-In'}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {locale === 'ar' ? 'يتطلب تحضير الفعالية تسجيل الدخول بحسابك أولاً.' : 'Self check-in requires signing in to your account first.'}
            </p>
            <button
              onClick={login}
              className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors text-sm"
            >
              {locale === 'ar' ? 'تسجيل الدخول بجوجل' : 'Sign in with Google'}
            </button>
          </div>
        )}

        {user && (status === 'idle_form' || status === 'submitting') && (
          <form onSubmit={handleConfirmCheckin} className="text-right">
            {/* Header & Event info */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? 'التحضير السريع والانطباع' : 'Instant Check-in & Feedback'}
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-cairo mb-1">
                {event?.title || (isAr ? 'تحضير الفعالية' : 'Event Check-in')}
              </h2>
              {event?.points ? (
                <div className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 mt-1">
                  <Award className="w-4 h-4" />
                  <span>+{event.points} {isAr ? 'نقطة تميز' : 'Points'}</span>
                </div>
              ) : null}
            </div>

            {/* 1. Overall Star Rating */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <label className="block text-sm font-bold text-slate-800 mb-3">
                {isAr ? 'كيف كانت تجربتك في الفعالية؟ ⭐' : 'How was your experience? ⭐'}
              </label>
              <div className="flex items-center justify-center gap-2 dir-ltr">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const active = (hoverRating || rating) >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`p-2 transition-transform transform active:scale-95 hover:scale-110 focus:outline-none`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          active
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-bold text-slate-500 mt-2">
                {rating === 5 && (isAr ? 'ممتازة جداً 🌟' : 'Excellent 🌟')}
                {rating === 4 && (isAr ? 'جيدة جداً 👍' : 'Very Good 👍')}
                {rating === 3 && (isAr ? 'جيدة 👌' : 'Good 👌')}
                {rating === 2 && (isAr ? 'مقبولة 😐' : 'Fair 😐')}
                {rating === 1 && (isAr ? 'تحتاج تحسين 👎' : 'Needs Improvement 👎')}
              </div>
            </div>

            {/* 2. Custom Configured Questions */}
            {event?.feedbackQuestions && event.feedbackQuestions.length > 0 && (
              <div className="space-y-4 mb-6">
                {event.feedbackQuestions.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      {q.title}
                      {q.required && <span className="text-red-500 font-normal mr-1">*</span>}
                    </label>

                    {/* CHOICE PILLS */}
                    {q.type === 'choice' && q.options && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.options.map((opt) => {
                          const selected = answers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectChoice(q.id, opt)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30 scale-105'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* TEXT INPUT WITH CHIPS */}
                    {q.type === 'text' && (
                      <div>
                        <textarea
                          rows={2}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                          placeholder={q.placeholder || (isAr ? 'اكتب انطباعك أو اقتراحك...' : 'Type feedback...')}
                          className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                        {/* Quick Auto-suggestion Chips */}
                        {q.quickChips && q.quickChips.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'مقترحات سريعة:' : 'Quick suggestions:'}</span>
                            {q.quickChips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => handleQuickChipClick(q.id, chip)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-6 rounded-2xl font-black shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isAr ? 'جاري التحضير...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد التحضير والحصول على النقاط' : 'Confirm Check-In & Get Points'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-cairo mb-2">
              {locale === 'ar' ? 'تم تحضيرك بنجاح! 🎉' : 'Checked In Successfully! 🎉'}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {locale === 'ar'
                ? `شكراً لمشاركتك انطباعك. تم إضافة ${awardedPoints} نقطة إلى رصيدك.`
                : `Thank you for your feedback. ${awardedPoints} points added to your balance.`}
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 w-full mb-6 text-center">
              <div className="text-xs font-bold text-emerald-800 mb-1">{locale === 'ar' ? 'نقاط الحضور' : 'Attendance Points'}</div>
              <div className="text-3xl font-black text-emerald-600">+{awardedPoints}</div>
            </div>
            <Link
              href={`/events/${eventId}`}
              className="w-full bg-slate-900 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors block text-center text-sm"
            >
              {locale === 'ar' ? 'العودة لصفحة الفعالية' : 'Back to Event Page'}
            </Link>
          </div>
        )}

        {status === 'already_attended' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-cairo mb-2">
              {locale === 'ar' ? 'أنت محضر بالفعل!' : 'Already Checked In!'}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {locale === 'ar' ? 'تم تسجيل حضورك في هذه الفعالية مسبقاً.' : 'Your attendance has already been recorded.'}
            </p>
            <Link
              href={`/events/${eventId}`}
              className="w-full bg-slate-100 text-slate-800 py-3 px-6 rounded-xl font-bold hover:bg-slate-200 transition-colors block text-center text-sm"
            >
              {locale === 'ar' ? 'العودة لصفحة الفعالية' : 'Back to Event Page'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-red-600 font-cairo mb-2">
              {locale === 'ar' ? 'فشل التحضير' : 'Check-in Failed'}
            </h2>
            <p className="text-slate-700 text-sm mb-6 font-medium">
              {errorMessage}
            </p>
            <Link
              href={`/events/${eventId}`}
              className="w-full bg-slate-100 text-slate-800 py-3 px-6 rounded-xl font-bold hover:bg-slate-200 transition-colors block text-center text-sm"
            >
              {locale === 'ar' ? 'العودة لصفحة الفعالية' : 'Back to Event Page'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
