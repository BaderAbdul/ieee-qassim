'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import { useLocale } from 'next-intl';
import { Star, Sparkles, Award, Send, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface PendingCheckinDoc {
  id: string;
  eventId: string;
  eventTitle: string;
  eventTitleEn?: string;
  points?: number;
  feedbackQuestions?: {
    id: string;
    title: string;
    type: 'choice' | 'text';
    options?: string[];
    placeholder?: string;
    required?: boolean;
    quickChips?: string[];
  }[];
  status: 'pending' | 'completed' | 'cancelled';
  expiresAt?: { toMillis?: () => number } | string;
}

export default function PendingAttendanceModal() {
  const { user } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [pendingDoc, setPendingDoc] = useState<PendingCheckinDoc | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Real-time listener for pending attendance scans on student's device
  useEffect(() => {
    if (!user) {
      setPendingDoc(null);
      return;
    }

    const q = query(
      collection(db, 'pending_checkins'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as PendingCheckinDoc;
        setPendingDoc({ ...data, id: docSnap.id });
        setIsSuccess(false);
        setErrorMessage('');
        setRating(5);
        setAnswers({});

        // Subtle haptic vibration if supported on mobile
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {
            // Haptics optional
          }
        }
      } else {
        setPendingDoc(null);
      }
    }, (error) => {
      console.warn('Pending checkins listener:', error);
    });

    return () => unsubscribe();
  }, [user]);

  if (!pendingDoc) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDoc || isSubmitting) return;

    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage(isAr ? 'يرجى اختيار تقييم من نجمة إلى خمس نجوم.' : 'Please choose a rating from 1 to 5 stars.');
      return;
    }

    if (pendingDoc.feedbackQuestions) {
      for (const q of pendingDoc.feedbackQuestions) {
        if (q.required && (!answers[q.id] || answers[q.id].trim().length === 0)) {
          setErrorMessage(isAr ? `يرجى الإجابة على السؤال الإجباري: "${q.title}"` : `Please answer required question: "${q.title}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
      const response = await submitCheckInFn({
        eventId: pendingDoc.eventId,
        feedbackData: {
          rating,
          answers
        }
      });

      const result = response.data as { status?: string; message?: string; awardedPoints?: number };
      const pts = result.awardedPoints ?? pendingDoc.points ?? 0;
      setAwardedPoints(pts);
      setIsSuccess(true);

      // Auto close after 3.5 seconds
      setTimeout(() => {
        setPendingDoc(null);
        setIsSuccess(false);
      }, 3500);

    } catch (err: unknown) {
      console.error('Failed to submit check-in with survey:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already_checked_in') || msg.includes('attended')) {
        setIsSuccess(true);
        setTimeout(() => setPendingDoc(null), 2500);
      } else {
        setErrorMessage(isAr
          ? 'تعذر تأكيد التحضير. أعد المحاولة أو تواصل مع المنظم في الموقع.'
          : 'Failed to confirm check-in. Please retry or contact the event organizer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventTitle = isAr ? pendingDoc.eventTitle : (pendingDoc.eventTitleEn || pendingDoc.eventTitle);

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[120] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAr ? 'تم مسح بطاقتك بنجاح! 🎯' : 'Card Scanned! 🎯'}</span>
          </div>

          <h2 className="text-2xl font-black font-cairo drop-shadow-sm mb-1">
            {eventTitle}
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm">
            {isAr
              ? 'أكمل التقييم السريع لتأكيد حضورك واستلام نقاط الفعالية ⭐'
              : 'Complete the quick feedback to confirm attendance and receive points ⭐'}
          </p>

          {pendingDoc.points ? (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-400 text-slate-900 px-4 py-1.5 rounded-full font-black text-xs shadow-md">
              <Award className="w-4 h-4" />
              <span>+{pendingDoc.points} {isAr ? 'نقطة تميز' : 'Points'}</span>
            </div>
          ) : null}
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8">
          {isSuccess ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-cairo mb-2">
                {isAr ? 'تم تأكيد حضورك بنجاح! 🎉' : 'Checked In Successfully! 🎉'}
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                {isAr
                  ? `شكراً لمشاركتك انطباعك. تمت إضافة ${awardedPoints} نقطة إلى رصيدك فوراً!`
                  : `Thank you for your feedback. ${awardedPoints} points have been added to your profile!`}
              </p>
              <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20">
                <Award className="w-4 h-4" />
                <span>+{awardedPoints} {isAr ? 'نقطة تميز مضافة' : 'Points Added'}</span>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setPendingDoc(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isAr ? 'إغلاق النافذة' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Star Rating */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  {isAr ? 'كيف كانت تجربتك في الفعالية؟ ⭐' : 'How was your experience? ⭐'}
                </label>
                <div className="flex items-center justify-center gap-2 dir-ltr my-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const active = (hoverRating || rating) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        aria-label={`${starVal} stars`}
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-2 transition-transform transform active:scale-95 hover:scale-110 rounded-xl"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-300 fill-slate-100'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-1">
                  {rating === 5 && (isAr ? 'ممتازة جداً 🌟' : 'Excellent 🌟')}
                  {rating === 4 && (isAr ? 'جيدة جداً 👍' : 'Very Good 👍')}
                  {rating === 3 && (isAr ? 'جيدة 👌' : 'Good 👌')}
                  {rating === 2 && (isAr ? 'مقبولة 😐' : 'Fair 😐')}
                  {rating === 1 && (isAr ? 'تحتاج تحسين 👎' : 'Needs Improvement 👎')}
                </div>
              </div>

              {/* Event Feedback Questions */}
              {pendingDoc.feedbackQuestions && pendingDoc.feedbackQuestions.length > 0 && (
                <div className="space-y-4 max-h-56 overflow-y-auto p-1">
                  {pendingDoc.feedbackQuestions.map((q) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-start">
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        {q.title}
                        {q.required && <span className="text-red-500 font-bold ms-1">*</span>}
                      </label>

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
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  selected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'text' && (
                        <div>
                          <textarea
                            rows={2}
                            value={answers[q.id] || ''}
                            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                            placeholder={q.placeholder || (isAr ? 'اكتب انطباعك أو مقترحك...' : 'Type feedback...')}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                          />
                          {q.quickChips && q.quickChips.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">{isAr ? 'مقترحات:' : 'Quick:'}</span>
                              {q.quickChips.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleQuickChipClick(q.id, chip)}
                                  className="px-2 py-0.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors"
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

              {/* Error Message */}
              {errorMessage && (
                <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isAr ? 'جاري تأكيد التحضير...' : 'Confirming...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isAr
                        ? `تأكيد التحضير واستلام النقاط (+${pendingDoc.points || 0})`
                        : `Confirm Attendance & Points (+${pendingDoc.points || 0})`}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
