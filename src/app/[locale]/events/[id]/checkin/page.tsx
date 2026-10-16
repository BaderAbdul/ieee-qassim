'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import { doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CheckCircle, XCircle, Loader2, Star, Sparkles, Award, Send } from 'lucide-react';
import { PlatformEvent } from '@/lib/types';
import { useFeedbackDraft } from '@/lib/useFeedbackDraft';
import { FeedbackPageFrame } from '@/components/events/RequiredFeedbackDialog';
import { eventCache } from '@/lib/eventCache';

export default function SelfCheckinPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [feedbackMode, setFeedbackMode] = useState(searchParams.get('feedback') === '1');
  const { user, login, loading: authLoading } = useAuth();
  const isAr = locale === 'ar';

  const [event, setEvent] = useState<PlatformEvent | null>(() => eventCache.get(eventId) || null);
  const [eventLoading, setEventLoading] = useState(() => !eventCache.has(eventId));

  // Form states
  const { rating, setRating, answers, setAnswers, clearDraft } = useFeedbackDraft(user ? `feedback:${user.uid}:${eventId}` : null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View status
  const [status, setStatus] = useState<'instructions' | 'idle_form' | 'submitting' | 'success' | 'already_attended' | 'error'>(
    !token && !feedbackMode ? 'instructions' : 'idle_form'
  );
  const [errorMessage, setErrorMessage] = useState(
    ''
  );
  const [formError, setFormError] = useState('');
  const [awardedPoints, setAwardedPoints] = useState<number>(0);

  const attendanceRequest = useRef<{ key: string; promise: Promise<unknown> } | null>(null);
  const ensureAttendance = useCallback(() => {
    if (!token || !user) return Promise.resolve();
    const key = `${eventId}:${user.uid}:${token}`;
    if (attendanceRequest.current?.key === key) return attendanceRequest.current.promise;
    const promise = httpsCallable(functions, 'submitCheckIn')({ eventId, token }).then(result => {
      setFeedbackMode(true);
      return result;
    }).catch(error => { attendanceRequest.current = null; throw error; });
    attendanceRequest.current = { key, promise };
    return promise;
  }, [eventId, token, user]);

  // Confirmation runs behind the visible, editable rating form.
  useEffect(() => {
    if (!token || !user) return;
    let active = true;
    void ensureAttendance().catch(() => {
      if (active) setFormError(isAr ? 'لم يتأكد الحضور بعد. اضغط إرسال لإعادة المحاولة؛ إجاباتك محفوظة.' : 'Attendance is not confirmed yet. Submit to retry; your answers are kept.');
    });
    return () => { active = false; };
  }, [ensureAttendance, token, user, isAr]);

  // Opening the instruction link after a manual scan should still expose feedback.
  useEffect(() => {
    if (!user || token || feedbackMode) return;
    let active = true;
    void getDoc(doc(db, 'registrations', `${eventId}_${user.uid}`)).then(registration => {
      if (active && registration.data()?.status === 'attended') {
        setFeedbackMode(true);
        setStatus('idle_form');
      }
    }).catch(() => { /* Instruction page remains available if this optional lookup fails. */ });
    return () => { active = false; };
  }, [user, token, feedbackMode, eventId]);

  // Fetch Event Details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const evSnap = await getDoc(doc(db, 'events', eventId));
        if (evSnap.exists()) {
          const current = { id: evSnap.id, ...evSnap.data() } as PlatformEvent;
          eventCache.set(eventId, current);
          setEvent(current);
        } else { setStatus('error'); setErrorMessage(isAr ? 'هذه الفعالية غير متاحة.' : 'This event is unavailable.'); }
      } catch (err) {
        console.error("Error loading event for check-in", err);
        setStatus('error'); setErrorMessage(isAr ? 'تعذر تحميل الفعالية. أعد المحاولة.' : 'Could not load the event. Please retry.');
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, isAr]);

  useEffect(() => {
    if (token || !feedbackMode || !user) return;
    let active = true;
    // Authorization is enforced by the feedback endpoint; avoid a redundant registration read.
    void getDoc(doc(db, 'event_feedback', `${eventId}_${user.uid}`)).then(feedback => {
      if (active && feedback.exists()) {
        setRating(feedback.data().rating || 5); setAnswers(feedback.data().answers || {});
      }
    }).catch(() => { /* The editable draft remains usable; submission validates eligibility. */ });
    return () => { active = false; };
  }, [token, feedbackMode, user, eventId, setRating, setAnswers]);

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
    if ((!feedbackMode && !token) || !user || isSubmitting || eventLoading) return;
    setFormError('');
    if (rating < 1 || rating > 5) { setFormError(isAr ? 'اختر تقييمك من نجمة إلى خمس نجوم.' : 'Choose a rating from one to five stars.'); return; }

    // Validate required questions
    if (event?.feedbackQuestions) {
      for (const q of event.feedbackQuestions) {
        if (q.required && (!answers[q.id] || answers[q.id].trim().length === 0)) {
          setFormError(isAr ? `يرجى الإجابة على السؤال الإجباري: "${q.title}"` : `Please answer required question: "${q.title}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setStatus('submitting');

    try {
      await ensureAttendance();
      const submitCheckInFn = httpsCallable(functions, 'submitEventFeedback');
      const response = await submitCheckInFn({
        eventId,
        ...(feedbackMode ? {} : { token }),
        feedbackData: {
          rating,
          answers
        }
      });

      clearDraft();
      const result = response.data as { status?: string; message?: string; awardedPoints?: number };

      if (result.status === 'already_checked_in') {
        setStatus('already_attended');
      } else {
        setAwardedPoints(result.awardedPoints ?? 0);
        setStatus('success');
      }
    } catch (error) {
      console.error('Check-in failed', error);
      setStatus('idle_form');
      setFormError(isAr ? 'تعذر حفظ التقييم. إجاباتك محفوظة؛ أعد الإرسال.' : 'Could not save feedback. Your answers are kept; submit again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const requiresRating = status !== 'success' && (!!token || feedbackMode) && (!!user || authLoading);
  return (
    <FeedbackPageFrame required={requiresRating} eventId={eventId}>
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        {status === 'instructions' && <div className="space-y-4 text-start">
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'كيف تسجل حضورك؟' : 'How do you check in?'}</h1>
          <p className="text-slate-600">{isAr ? 'يُفتح التحضير أثناء الفعالية للمقبولين. امسح رمز QR الذي يعرضه المنظم أو افتح رابط التحضير الذي يرسله لك. هذا الرابط التعريفي لا يتضمن رمز التحضير.' : 'Check-in opens during the event for approved registrations. Scan the organizer’s QR code or open their check-in link. This instruction page does not contain a check-in token.'}</p>
          <Link href={`/events/${eventId}`} className="block rounded-xl bg-blue-600 text-white px-4 py-3 text-center font-bold">{isAr ? 'عرض الفعالية وحالة التسجيل' : 'View event and registration status'}</Link>
          <Link href="/help" className="block text-blue-700 underline">{isAr ? 'المساعدة والأسئلة الشائعة' : 'Help and frequently asked questions'}</Link>
        </div>}
        {!user && !authLoading && status !== 'instructions' && (
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

        {(user || authLoading) && (status === 'idle_form' || status === 'submitting') && (
          <form onSubmit={handleConfirmCheckin} className="text-start">
            {/* Header & Event info */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" />
                {feedbackMode ? (isAr ? 'تم تسجيل الحضور — التقييم مطلوب' : 'Attendance recorded — feedback required') : (isAr ? 'التحضير السريع والانطباع' : 'Check-in & feedback')}
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-cairo mb-1">
                {(isAr ? event?.title : event?.titleEn || event?.title) || (isAr ? 'تحضير الفعالية' : 'Event Check-in')}
              </h2>
              {event?.points && !feedbackMode ? (
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
                      aria-label={isAr ? `${starVal} من 5 نجوم` : `${starVal} out of 5 stars`}
                      aria-pressed={rating === starVal}
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-2 transition-transform transform active:scale-95 hover:scale-110 rounded-lg"
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
                {rating === 0 && (isAr ? 'لم تختر تقييمًا بعد' : 'No rating selected yet')}
                {rating === 5 && (isAr ? 'ممتازة جداً 🌟' : 'Excellent 🌟')}
                {rating === 4 && (isAr ? 'جيدة جداً 👍' : 'Very Good 👍')}
                {rating === 3 && (isAr ? 'جيدة 👌' : 'Good 👌')}
                {rating === 2 && (isAr ? 'مقبولة 😐' : 'Fair 😐')}
                {rating === 1 && (isAr ? 'تحتاج تحسين 👎' : 'Needs Improvement 👎')}
              </div>
            </div>

            {eventLoading && <p role="status" className="mb-4 text-sm text-slate-500">{isAr ? 'جاري تحميل أسئلة الفعالية؛ يمكنك تعديل النجوم الآن.' : 'Loading event questions; you can adjust your stars now.'}</p>}
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
                              aria-pressed={selected}
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
                          aria-label={q.title}
                          aria-required={q.required}
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
              disabled={isSubmitting || eventLoading || !user}
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
                  <span>{feedbackMode ? (isAr ? 'حفظ التقييم' : 'Save feedback') : (isAr ? 'تأكيد التحضير والحصول على النقاط' : 'Confirm check-in')}</span>
                </>
              )}
            </button>
            {formError && <p role="alert" className="mt-4 text-red-700 text-sm">{formError}</p>}
          </form>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-cairo mb-2">
              {feedbackMode ? (isAr ? 'حُفظ تقييمك بنجاح' : 'Feedback saved successfully') : (isAr ? 'تم تحضيرك بنجاح! 🎉' : 'Checked in successfully! 🎉')}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {feedbackMode ? (isAr ? 'شكراً لانطباعك. تعديل التقييم لا يضيف نقاط حضور جديدة.' : 'Thank you. Editing feedback does not award attendance points again.') : locale === 'ar'
                ? `شكراً لمشاركتك انطباعك. تم إضافة ${awardedPoints} نقطة إلى رصيدك.`
                : `Thank you for your feedback. ${awardedPoints} points added to your balance.`}
            </p>
            {!feedbackMode && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 w-full mb-6 text-center">
              <div className="text-xs font-bold text-emerald-800 mb-1">{locale === 'ar' ? 'نقاط الحضور' : 'Attendance Points'}</div>
              <div className="text-3xl font-black text-emerald-600">+{awardedPoints}</div>
            </div>}
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
            <button onClick={() => { setStatus('idle_form'); setErrorMessage(''); }} className="mb-3 w-full rounded-xl bg-blue-600 text-white p-3 font-bold">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
            {!requiresRating && <Link
              href={`/events/${eventId}`}
              className="w-full bg-slate-100 text-slate-800 py-3 px-6 rounded-xl font-bold hover:bg-slate-200 transition-colors block text-center text-sm"
            >
              {locale === 'ar' ? 'العودة لصفحة الفعالية' : 'Back to Event Page'}
            </Link>}
          </div>
        )}
      </div>
    </FeedbackPageFrame>
  );
}
