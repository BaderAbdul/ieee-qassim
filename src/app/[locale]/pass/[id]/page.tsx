'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { apiGet, httpsCallable } from '@/lib/backend';
import DigitalMemberCard from '@/components/ui/DigitalMemberCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle, Sparkles, Award, LogIn } from 'lucide-react';
import { useAuth, UserData, type AuthUser } from '@/context/AuthContext';
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
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Ongoing Events & Checkin State
  const [ongoingEvents, setOngoingEvents] = useState<PlatformEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PlatformEvent | null>(null);
  const [isAttended, setIsAttended] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [checkinError, setCheckinError] = useState<string>('');

  const isOrganizer = ['event_organizer', 'super_admin'].includes(currentUserData?.role || '');
  const isSelf = currentUser?.uid === userId;

  const [initiatingLive, setInitiatingLive] = useState(false);

  const handleSendToStudentPhone = async () => {
    if (!selectedEvent || !userId || initiatingLive) return;
    setInitiatingLive(true);
    setCheckinError('');
    try {
      const initiateFn = httpsCallable<{ eventId: string; targetUserId: string }, { status: string; awardedPoints: number }>(null, 'initiatePendingCheckIn');
      const resp = await initiateFn({ eventId: selectedEvent.id, targetUserId: userId });
      if (resp.data.status === 'already_checked_in') {
        setIsAttended(true);
      } else {
        setIsAttended(true);
        setCheckinSuccess(true);
        setAwardedPoints(resp.data.awardedPoints || 0);
      }
    } catch (err: unknown) {
      console.error(err);
      setCheckinError(err instanceof Error ? err.message : (isAr ? 'تعذر تسجيل حضور الطالب.' : 'Could not record attendance.'));
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

        let profile: (UserData & { rank: number | null }) | null = null;
        try {
          profile = await apiGet<UserData & { rank: number | null }>(`/api/public/profiles/${encodeURIComponent(userId)}`);
        } catch {
          profile = null;
        }

        if (!profile) {
          setError(isAr ? 'لم يتم العثور على هذا العضو.' : 'Member not found.');
          setLoading(false);
          return;
        }

        setUserData(profile);
        setUserRank(profile.rank);

        // Ongoing-event check-in only works for organizers (the backend endpoint is admin-only).
        if (isOrganizer) {
          try {
            const eventsList = await apiGet<PlatformEvent[]>('/api/admin/events/ongoing');
            setOngoingEvents(eventsList);
            if (eventsList.length > 0) {
              setSelectedEvent(eventsList[0]);
            }
          } catch (evErr) {
            console.warn('Could not load ongoing events:', evErr);
          }
        }

      } catch (err) {
        console.error('Error fetching public pass:', err);
        setError(isAr ? 'حدث خطأ أثناء تحميل البطاقة.' : 'Failed to load pass.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, isAr, isOrganizer]);

  // Check attendance when selected event or userId changes (organizer-only endpoint)
  useEffect(() => {
    if (!userId || !selectedEvent || !isOrganizer) { setIsAttended(false); return; }
    let active = true;

    const checkLog = async () => {
      setCheckingAttendance(true);
      try {
        const status = await apiGet<{ attended: boolean }>(`/api/admin/events/${encodeURIComponent(selectedEvent.id)}/attendance/${encodeURIComponent(userId)}`);
        if (active) {
          setIsAttended(status.attended);
        }
      } catch {
        // Attendance logs might be restricted to organizers or owners, ignore error
      } finally {
        if (active) setCheckingAttendance(false);
      }
    };

    checkLog();
    return () => { active = false; };
  }, [userId, selectedEvent, isOrganizer]);

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

  // Mock user object for the component
  const mockUser: AuthUser = {
    uid: userId,
    email: userData.email ?? null,
    photoURL: userData.publicProfile?.avatar || null,
    displayName: userData.arabicFullName || userData.displayName || '',
    metadata: {
      creationTime: toJsDate(userData.createdAt)?.toISOString() || new Date().toISOString()
    },
    getIdToken: async () => { throw new Error('Not available for a viewed profile.'); },
  };

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
                    ? `تحضير الطالب: ${userData.arabicFullName || userData.displayName || 'العضو'}`
                    : `Check-in for: ${userData.arabicFullName || userData.displayName || 'Member'}`}
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
                      ? `شكراً لمشاركتك التقييم. تم تسجيل حضور ${userData.arabicFullName || userData.displayName || 'العضو'} وإضافة ${awardedPoints} نقطة إلى الرصيد.`
                      : `Attendance confirmed for ${userData.arabicFullName || userData.displayName || 'Member'}, +${awardedPoints} points awarded.`}
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
                      ? `تم تأكيد حضور ${userData.arabicFullName || userData.displayName || 'العضو'} مسبقاً وتم احتساب النقاط.`
                      : `Attendance has already been recorded for this event.`}
                  </p>
                </div>
              )}

              {isAttended && isSelf && <Link href={`/events/${selectedEvent.id}/checkin?feedback=1`} className="mt-4 block text-center font-bold text-blue-700 underline">{isAr ? 'إكمال تقييم الفعالية' : 'Complete event feedback'}</Link>}
              {/* Immediate organizer check-in */}
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
                      {isOrganizer ? (
                        <button type="button" disabled={initiatingLive || checkingAttendance} onClick={handleSendToStudentPhone} className="w-full rounded-xl bg-blue-600 px-6 py-4 font-bold text-white disabled:opacity-50">
                          {initiatingLive ? (isAr ? 'جاري تسجيل الحضور...' : 'Recording attendance...') : (isAr ? 'تسجيل الحضور فوراً' : 'Record attendance now')}
                        </button>
                      ) : (
                        <p className="text-center text-sm text-slate-600">{isAr ? 'أبرز بطاقتك للمنظم أو امسح رمز الفعالية لتسجيل الحضور. سيظهر التقييم المطلوب بصورة مستقلة.' : 'Show your pass to an organizer or scan the event QR. Required feedback opens independently.'}</p>
                      )}
                      {checkinError && <p role="alert" className="mt-3 text-sm text-red-700">{checkinError}</p>}

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
