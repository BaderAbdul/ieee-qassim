'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { doc, getDoc, collection, query, where, getDocs, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import DigitalMemberCard from '@/components/ui/DigitalMemberCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle, Star, Sparkles, Award, Send, LogIn, Loader2, Smartphone } from 'lucide-react';
import { User } from 'firebase/auth';
import { useAuth, UserData } from '@/context/AuthContext';
import { toJsDate } from '@/lib/dateUtils';
import { PlatformEvent } from '@/lib/types';

export default function PublicPassPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const [userId, setUserId] = useState<string | null>(null);
  const { user: currentUser, userData: currentUserData, login } = useAuth();
  
  useEffect(() => {
    params.then(p => setUserId(p.id));
  }, [params]);

  const locale = useLocale();
  const isAr = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<(UserData & { name?: string }) | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Ongoing Events & Checkin State
  const [ongoingEvents, setOngoingEvents] = useState<PlatformEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PlatformEvent | null>(null);
  const [isAttended, setIsAttended] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  // Survey Form State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [checkinError, setCheckinError] = useState<string>('');

  const isOrganizer = ['organizer', 'admin', 'super_admin'].includes(currentUserData?.role || '');
  const isSelf = currentUser?.uid === userId;

  // Live Sync to student phone state
  const [waitingForStudentLive, setWaitingForStudentLive] = useState(false);
  const [initiatingLive, setInitiatingLive] = useState(false);

  useEffect(() => {
    if (!waitingForStudentLive || !selectedEvent || !userId) return;
    const unsub = onSnapshot(doc(db, 'pending_checkins', `${selectedEvent.id}_${userId}`), (snap) => {
      if (snap.exists() && snap.data()?.status === 'completed') {
        const pts = snap.data()?.points ?? selectedEvent.points ?? 0;
        setAwardedPoints(pts);
        setCheckinSuccess(true);
        setIsAttended(true);
        setWaitingForStudentLive(false);
        setUserData(prev => prev ? { ...prev, totalPoints: (prev.totalPoints || 0) + pts } : prev);
      }
    });
    return () => unsub();
  }, [waitingForStudentLive, selectedEvent, userId]);

  const handleSendToStudentPhone = async () => {
    if (!selectedEvent || !userId || initiatingLive) return;
    setInitiatingLive(true);
    setCheckinError('');
    try {
      const initiateFn = httpsCallable<{ eventId: string; targetUserId: string }, { status: string; points: number }>(functions, 'initiatePendingCheckIn');
      const resp = await initiateFn({ eventId: selectedEvent.id, targetUserId: userId });
      if (resp.data.status === 'already_checked_in') {
        setIsAttended(true);
      } else {
        setWaitingForStudentLive(true);
      }
    } catch (err: unknown) {
      console.error(err);
      setCheckinError(err instanceof Error ? err.message : (isAr ? 'تعذر إرسال الاستبيان لجوال الطالب.' : 'Could not send survey to student device.'));
    } finally {
      setInitiatingLive(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userDocRef = doc(db, 'public_profiles', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          setError(isAr ? 'لم يتم العثور على هذا العضو.' : 'Member not found.');
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        setUserData(data as UserData);

        // Fetch rank
        const myPoints = data?.totalPoints || 0;
        const higherPointsQuery = query(
          collection(db, 'public_profiles'),
          where('totalPoints', '>', myPoints)
        );
        const rankCountSnap = await getCountFromServer(higherPointsQuery);
        setUserRank(rankCountSnap.data().count + 1);

        // Fetch Ongoing Events for Check-in & Survey
        try {
          const eventsQuery = query(
            collection(db, 'events'),
            where('state', '==', 'Ongoing')
          );
          const eventsSnap = await getDocs(eventsQuery);
          const eventsList = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformEvent));
          setOngoingEvents(eventsList);
          if (eventsList.length > 0) {
            setSelectedEvent(eventsList[0]);
          }
        } catch (evErr) {
          console.warn('Could not load ongoing events:', evErr);
        }

      } catch (err) {
        console.error('Error fetching public pass:', err);
        setError(isAr ? 'حدث خطأ أثناء تحميل البطاقة.' : 'Failed to load pass.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, isAr]);

  // Check attendance when selected event or userId changes
  useEffect(() => {
    if (!userId || !selectedEvent) return;
    let active = true;

    const checkLog = async () => {
      setCheckingAttendance(true);
      try {
        const logSnap = await getDoc(doc(db, 'attendance_logs', `${selectedEvent.id}_${userId}`));
        if (active) {
          setIsAttended(logSnap.exists());
        }
      } catch {
        // Attendance logs might be restricted to organizers or owners, ignore error
      } finally {
        if (active) setCheckingAttendance(false);
      }
    };

    checkLog();
    return () => { active = false; };
  }, [userId, selectedEvent]);

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

  const handleSubmitCheckinWithSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !userId || submittingCheckin) return;

    setCheckinError('');

    if (rating < 1 || rating > 5) {
      setCheckinError(isAr ? 'يرجى اختيار تقييم للفعالية من 1 إلى 5 نجوم.' : 'Please select a rating from 1 to 5 stars.');
      return;
    }

    // Validate required questions
    if (selectedEvent.feedbackQuestions) {
      for (const q of selectedEvent.feedbackQuestions) {
        if (q.required && (!answers[q.id] || answers[q.id].trim().length === 0)) {
          setCheckinError(isAr ? `يرجى الإجابة على السؤال الإجباري: "${q.title}"` : `Please answer required question: "${q.title}"`);
          return;
        }
      }
    }

    setSubmittingCheckin(true);

    try {
      const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
      const response = await submitCheckInFn({
        eventId: selectedEvent.id,
        targetUserId: isOrganizer ? userId : undefined,
        feedbackData: {
          rating,
          answers
        }
      });

      const result = response.data as { status?: string; message?: string; awardedPoints?: number };

      if (result.status === 'already_checked_in') {
        setIsAttended(true);
      } else {
        const pts = result.awardedPoints ?? selectedEvent.points ?? 0;
        setAwardedPoints(pts);
        setCheckinSuccess(true);
        setIsAttended(true);
        // Increment displayed points in card
        setUserData(prev => prev ? { ...prev, totalPoints: (prev.totalPoints || 0) + pts } : prev);
      }
    } catch (err: unknown) {
      console.error('Check-in failed:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already_checked_in') || msg.includes('attended')) {
        setIsAttended(true);
      } else {
        setCheckinError(isAr
          ? 'تعذر تسجيل الحضور. تأكد من صلاحية الحساب وحالة الفعالية ثم أعد المحاولة.'
          : 'Could not record attendance. Please retry or contact the organizer.');
      }
    } finally {
      setSubmittingCheckin(false);
    }
  };

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" color="border-indigo-600" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-100">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error}</h2>
          <Link href="/" className="inline-block mt-4 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
            {isAr ? 'العودة للرئيسية' : 'Return Home'}
          </Link>
        </div>
      </div>
    );
  }

  // Mock User object for the component
  const mockUser = {
    uid: userId,
    photoURL: userData.publicProfile?.avatar || null,
    displayName: userData.arabicFullName || userData.name || '',
    metadata: {
      creationTime: toJsDate(userData.createdAt)?.toISOString() || new Date().toISOString()
    }
  } as User;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 mt-16 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black font-cairo text-slate-900 mb-2">
            {isAr ? 'البطاقة الرقمية للعضو' : 'Digital Member Pass'}
          </h1>
          <p className="text-slate-500">
            {isAr ? 'مجتمع التقنية الهندسي بجامعة القصيم' : 'IEEE Qassim University Student Branch'}
          </p>
        </div>

        {/* ----------------- ONGOING EVENT CHECK-IN & SURVEY SECTION ----------------- */}
        {ongoingEvents.length > 0 && selectedEvent && (
          <div className="mb-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 p-6 text-white text-center sm:text-start flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? 'فعالية جارية الآن' : 'Ongoing Event Check-In'}</span>
                </div>
                <h2 className="text-2xl font-black font-cairo drop-shadow-sm">
                  {isAr ? selectedEvent.title : (selectedEvent.titleEn || selectedEvent.title)}
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">
                  {isAr
                    ? `تحضير الطالب: ${userData.arabicFullName || userData.name || 'العضو'} مع استبيان التقييم`
                    : `Check-in for: ${userData.arabicFullName || userData.name || 'Member'} with feedback survey`}
                </p>
              </div>

              {selectedEvent.points ? (
                <div className="shrink-0 bg-amber-400 text-slate-900 px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-1.5 shadow-lg shadow-black/10">
                  <Award className="w-4 h-4" />
                  <span>+{selectedEvent.points} {isAr ? 'نقطة تميز' : 'Points'}</span>
                </div>
              ) : null}
            </div>

            {/* Event Tabs if more than 1 ongoing event */}
            {ongoingEvents.length > 1 && (
              <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex gap-2 overflow-x-auto">
                {ongoingEvents.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => { setSelectedEvent(ev); setCheckinSuccess(false); setCheckinError(''); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedEvent.id === ev.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isAr ? ev.title : (ev.titleEn || ev.title)}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 sm:p-8">
              {/* SUCCESS STATE */}
              {checkinSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-cairo mb-1">
                    {isAr ? 'تم التحضير بنجاح! 🎉' : 'Checked In Successfully! 🎉'}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    {isAr
                      ? `شكراً لمشاركتك التقييم. تم تسجيل حضور ${userData.arabicFullName || userData.name || 'العضو'} وإضافة ${awardedPoints} نقطة إلى الرصيد.`
                      : `Thank you for the feedback. Attendance confirmed for ${userData.arabicFullName || userData.name || 'Member'}, +${awardedPoints} points awarded.`}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20">
                    <Award className="w-4 h-4" />
                    <span>+{awardedPoints} {isAr ? 'نقطة تميز مضافة' : 'Points Added'}</span>
                  </div>
                </div>
              )}

              {/* ALREADY ATTENDED STATE */}
              {isAttended && !checkinSuccess && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-cairo mb-1">
                    {isAr ? 'الطالب محضر مسبقاً في هذه الفعالية ✅' : 'Already Checked In ✅'}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm">
                    {isAr
                      ? `تم تأكيد حضور ${userData.arabicFullName || userData.name || 'العضو'} مسبقاً وتم احتساب النقاط.`
                      : `Attendance has already been recorded for this event.`}
                  </p>
                </div>
              )}

              {/* SURVEY FORM WHEN NOT ATTENDED */}
              {!isAttended && !checkinSuccess && (
                <div>
                  {!currentUser ? (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <LogIn className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 font-cairo mb-1">
                        {isAr ? 'سجّل الدخول لتأكيد التحضير والتقييم' : 'Sign in to confirm check-in'}
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mb-4 max-w-md mx-auto">
                        {isAr
                          ? 'يتطلب تسجيل الحضور تسجيل الدخول بحسابك كمنظم لتحضير الطالب، أو بحساب الطالب نفسه.'
                          : 'Sign in as an organizer to check in this member, or sign in as the member.'}
                      </p>
                      <button
                        type="button"
                        onClick={login}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{isAr ? 'تسجيل الدخول بجوجل' : 'Sign in with Google'}</span>
                      </button>
                    </div>
                  ) : !isOrganizer && !isSelf ? (
                    <div className="text-center py-4 text-slate-600 text-sm">
                      <p>{isAr ? 'تسجيل حضور الأعضاء متاح للمنظمين أو لحساب العضو نفسه.' : 'Attendance check-in is available to organizers or the member.'}</p>
                    </div>
                  ) : (
                    <div>
                      {isOrganizer && !isSelf && (
                        waitingForStudentLive ? (
                          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-indigo-50 border-2 border-blue-200 text-center animate-in fade-in duration-200 shadow-sm">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 animate-pulse">
                              <Smartphone className="w-6 h-6" />
                            </div>
                            <h4 className="font-black text-slate-900 font-cairo text-base mb-1">
                              {isAr ? 'تم إرسال الاستبيان لجوال الطالب بنجاح! 📱' : 'Survey Sent to Student Device! 📱'}
                            </h4>
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 mb-3">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{isAr ? 'ظهر منبثق التقييم في جوال الطالب الآن.. بانتظار إرساله' : 'Awaiting student feedback submission...'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWaitingForStudentLive(false)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                            >
                              {isAr ? 'أو قيّم وحضّر الطالب من هذا الجهاز' : 'Or submit on this device'}
                            </button>
                          </div>
                        ) : (
                          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-center sm:text-start">
                              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 justify-center sm:justify-start">
                                <Smartphone className="w-4 h-4 text-blue-600" />
                                <span>{isAr ? 'إرسال الاستبيان لجوال الطالب لحظياً' : 'Live Sync to Student Device'}</span>
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {isAr ? 'ينبثق الاستبيان فوراً في جوال الطالب ليتمم التحضير بنفسه' : 'Pops up feedback survey directly on the student’s phone screen'}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={initiatingLive}
                              onClick={handleSendToStudentPhone}
                              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 shrink-0 transition-all"
                            >
                              {initiatingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                              <span>{isAr ? 'إرسال لجوال الطالب 📱' : 'Send to Student Phone 📱'}</span>
                            </button>
                          </div>
                        )
                      )}

                      <form onSubmit={handleSubmitCheckinWithSurvey} className="space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-bold text-slate-900 font-cairo flex items-center gap-2">
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          <span>{isAr ? 'استبيان تقييم الفعالية (مطلوب للتحضير)' : 'Event Feedback Survey (Required)'}</span>
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">
                          {isAr
                            ? 'يرجى إكمال التقييم لتأكيد حضور الطالب ومنحه نقاط الفعالية.'
                            : 'Please complete the feedback rating to record attendance and points.'}
                        </p>
                      </div>

                      {/* 1. Star Rating */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <label className="block text-sm font-bold text-slate-800 mb-2">
                          {isAr ? 'كيف كانت التجربة في الفعالية؟ ⭐' : 'How was the experience? ⭐'}
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
                          {rating === 0 && (isAr ? 'اختر تقييماً من نجمة إلى خمس نجوم' : 'Select a rating from 1 to 5 stars')}
                          {rating === 5 && (isAr ? 'ممتازة جداً 🌟' : 'Excellent 🌟')}
                          {rating === 4 && (isAr ? 'جيدة جداً 👍' : 'Very Good 👍')}
                          {rating === 3 && (isAr ? 'جيدة 👌' : 'Good 👌')}
                          {rating === 2 && (isAr ? 'مقبولة 😐' : 'Fair 😐')}
                          {rating === 1 && (isAr ? 'تحتاج تحسين 👎' : 'Needs Improvement 👎')}
                        </div>
                      </div>

                      {/* 2. Custom Event Questions */}
                      {selectedEvent.feedbackQuestions && selectedEvent.feedbackQuestions.length > 0 && (
                        <div className="space-y-4">
                          {selectedEvent.feedbackQuestions.map((q) => (
                            <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                              <label className="block text-sm font-bold text-slate-800 mb-2">
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
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
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
                                    placeholder={q.placeholder || (isAr ? 'اكتب انطباعك أو اقتراحك...' : 'Type feedback...')}
                                    className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                  />
                                  {q.quickChips && q.quickChips.length > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'مقترحات سريعة:' : 'Quick:'}</span>
                                      {q.quickChips.map((chip) => (
                                        <button
                                          key={chip}
                                          type="button"
                                          onClick={() => handleQuickChipClick(q.id, chip)}
                                          className="px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
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

                      {/* Error Banner */}
                      {checkinError && (
                        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{checkinError}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submittingCheckin}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                      >
                        {submittingCheckin ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{isAr ? 'جاري تأكيد التحضير...' : 'Confirming...'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>
                              {isAr
                                ? `تأكيد تحضير الطالب والحصول على النقاط (+${selectedEvent.points || 0})`
                                : `Confirm Attendance & Points (+${selectedEvent.points || 0})`}
                            </span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- MEMBER PASS CARD ----------------- */}
        <DigitalMemberCard 
          user={mockUser}
          userData={userData}
          rank={userRank}
          totalPoints={userData.totalPoints || 0}
          isPublicView={true}
        />

        <div className="text-center mt-8">
          <Link href="/" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            {isAr ? 'العودة للرئيسية' : 'Return Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
