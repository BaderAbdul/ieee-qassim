'use client';

import React, { useEffect, useState, use } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from '@/lib/backend';
import { db, functions } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  Award, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  QrCode
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EventDetailsSkeleton from '@/components/skeletons/EventDetailsSkeleton';
import EventPoster from '@/components/ui/EventPoster';
import { formatDateSafe } from '@/lib/dateUtils';
import { eventCapacityLabel, eventStateLabel, eventTypeLabel, registrationLabel } from '@/lib/studentExperience';

export default function EventDetailsPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;
  
  const locale = useLocale();
  const t = useTranslations('EventDetails');
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;
  
  const { user, login, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [registrationKey, setRegistrationKey] = useState<string | null>(null);
  const [registrationErrorKey, setRegistrationErrorKey] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [actionError, setActionError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const registrationReady = !user || registrationKey === `${eventId}:${user.uid}`;

  useEffect(() => {
    return onSnapshot(doc(db, 'events', eventId), snapshot => {
      const current = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as PlatformEvent : null;
      setEvent(current); setAttendeeCount(current?.registeredCount ?? 0); setLoadError(null); setLoading(false);
    }, error => { setLoadError(error); setLoading(false); });
  }, [eventId]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'registrations', `${eventId}_${user.uid}`), snapshot => {
      setRegistrationStatus(snapshot.exists() ? snapshot.data().status : null);
      setRegistrationKey(`${eventId}:${user.uid}`);
      setRegistrationErrorKey(null);
    }, () => { setRegistrationKey(null); setRegistrationErrorKey(`${eventId}:${user.uid}`); });
  }, [user, eventId, isAr]);

  const handleRegister = async () => {
    if (!user) { await login(); return; }
    if (!event || isRegistering) return;
    setIsRegistering(true);
    setActionError('');
    try {
      const register = httpsCallable<{ eventId: string }, { status: string; attendeeCount: number }>(functions, 'registerForEvent');
      const { data } = await register({ eventId });
      setRegistrationStatus(data.status);
      setAttendeeCount(data.attendeeCount);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : (isAr ? 'تعذر التسجيل. حاول مرة أخرى.' : 'Registration failed. Please retry.'));
    } finally { setIsRegistering(false); }
  };

  const handleCancelRegistration = async () => {
    if (!user || !event || isRegistering) return;
    setIsRegistering(true);
    setActionError('');
    try {
      const cancel = httpsCallable<{ eventId: string }, { status: string; attendeeCount: number }>(functions, 'cancelRegistration');
      const { data } = await cancel({ eventId });
      setRegistrationStatus(data.status);
      setAttendeeCount(data.attendeeCount);
      setConfirmCancel(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : (isAr ? 'تعذر إلغاء التسجيل.' : 'Cancellation failed.'));
    } finally { setIsRegistering(false); }
  };

  if (loadError) throw loadError;

  if (loading || (event && event.id !== eventId)) {
    return <EventDetailsSkeleton />;
  }

  if (!event) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-cairo mb-2">{t('notFound')}</h2>
        <Link 
          href="/events"
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 underline"
        >
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          <span>{t('backToEvents')}</span>
        </Link>
      </div>
    );
  }

  const isFull = !event.isUnlimitedCapacity && attendeeCount >= event.capacity;
  const isRegistrationOpen = event.state === 'Registration Open';
  const eventDate = event.date;
  
  const title = isAr ? event.title : event.titleEn || event.title;
  const description = isAr ? event.description : event.descriptionEn || event.description;
  const location = isAr ? event.location : event.locationEn || event.location;
  const gains = isAr ? event.gains : event.gainsEn || event.gains;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 pt-24 lg:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-6">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-1 py-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
            <span>{t('backToEvents')}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column (Poster) - 5 Cols */}
          {event.coverUrl && <div className="hidden lg:col-span-5 lg:block">
            <div className="lg:sticky lg:top-24"><EventPoster url={event.coverUrl} title={title} /></div>
          </div>}

          {/* Right Column (Content) - 7 Cols */}
          <div className={`${event.coverUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5 pb-6`}>
             
             {/* Title & Header Info */}
             <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  <span className="bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-blue-100">
                    {eventTypeLabel(event.type, isAr)}
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
                    {eventStateLabel(event.state, isAr)}
                  </span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-thmanyah leading-snug mb-5">
                  {title}
                </h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3.5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-600 font-semibold block mb-0.5">{t('date')}</span>
                      <span className="text-base font-bold text-slate-900 block">{formatDateSafe(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}</span>
                      <span className="text-sm text-slate-600"><bdi>{formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })}</bdi> · {event.durationHours} {isAr ? 'ساعة' : 'hours'} · {isAr ? 'توقيت الرياض' : 'Riyadh time'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3.5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-600 font-semibold block mb-0.5">{t('location')}</span>
                      <span className="text-base font-bold text-slate-900 block break-words">{location}</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* Registration CTA Card */}
             <div id="registration" className="bg-blue-950 rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden text-white scroll-mt-24">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {/* Capacity */}
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-300" />
                        <div>
                          <div className="text-sm text-blue-100">{t('capacity')}</div>
                          <div className="text-sm font-bold text-white">{eventCapacityLabel({ ...event, registeredCount: attendeeCount }, isAr)}</div>
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="text-sm text-amber-100">{isAr ? 'نقاط الحضور' : 'Attendance points'}</div>
                          <div className="text-sm font-bold text-white">{t('pointsReward', { points: event.points })}</div>
                        </div>
                      </div>

                      {/* Certificate */}
                      {event.hasCertificate && (
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-400" />
                          <div>
                            <div className="text-sm text-emerald-100">{isAr ? 'الشهادة' : 'Certificate'}</div>
                            <div className="text-sm font-bold text-white">{t('certifiedCertificate')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 sm:w-64 space-y-3">
                    {user && registrationErrorKey === `${eventId}:${user.uid}` ? <div role="alert" className="rounded-xl bg-white/10 p-4 text-sm leading-6"><p>{isAr ? 'تعذر تحميل حالة مشاركتك.' : 'Your participation status could not be loaded.'}</p><button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 rounded-lg border border-white/30 px-3 py-2 font-bold">{isAr ? 'تحديث الصفحة' : 'Reload page'}</button></div> : authLoading || !registrationReady ? <p role="status" className="rounded-xl bg-white/10 p-4 text-sm text-white">{isAr ? 'جارٍ تحميل حالة مشاركتك…' : 'Loading your participation status…'}</p> : !user ? (
                      <button 
                        onClick={login} 
                        className="w-full bg-white hover:bg-blue-50 text-blue-900 py-3.5 px-6 rounded-2xl font-bold shadow-lg transition-transform transform hover:-translate-y-1"
                      >
                        {isRegistrationOpen ? t('loginToRegister') : (isAr ? 'سجّل دخولك لعرض مشاركتك' : 'Sign in to view your participation')}
                      </button>
                    ) : (
                      <>
                        {!registrationStatus || registrationStatus === 'cancelled' ? (
                          <button 
                            onClick={handleRegister} 
                            disabled={!isRegistrationOpen || isRegistering}
                            className={`w-full py-3.5 px-6 rounded-2xl font-bold transition-all flex items-center justify-center shadow-lg ${
                              !isRegistrationOpen 
                                ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                                : isFull 
                                  ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600 transform hover:-translate-y-1'
                            }`}
                          >
                            {isRegistering ? (
                              <>
                                <LoadingSpinner size="sm" color="border-white" className="me-2" />
                                <span>{t('registering')}</span>
                              </>
                            ) : event.state === 'Published' ? (
                              isAr ? 'التسجيل قريباً' : 'Registration Soon'
                            ) : !isRegistrationOpen ? (
                              t('registrationClosed')
                            ) : isFull ? (
                              t('joinWaitlist')
                            ) : (
                              t('registerNow')
                            )}
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className={`p-4 rounded-2xl text-center border ${
                              registrationStatus === 'attended' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-50' :
                              registrationStatus === 'approved' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-50' : 
                              registrationStatus === 'waitlisted' ? 'bg-amber-500/20 border-amber-500/30 text-amber-50' : 
                              'bg-blue-500/20 border-blue-500/30 text-blue-50'
                            }`}>
                              <div className="font-bold text-sm mb-0.5">
                                {registrationLabel(registrationStatus, isAr)}
                              </div>
                              <div className="text-sm leading-6">
                                {registrationStatus === 'rejected' ? (isAr ? 'تواصل مع المنظم إذا أردت الاستفسار عن القرار.' : 'Contact the organizer if you need to ask about this decision.') : registrationStatus === 'attended'
                                  ? (isAr ? 'حضورك موثّق. يمكنك مراجعة نقاطك وشهادتك من حسابك.' : 'Attendance confirmed. View points and certificates in your account.')
                                  : registrationStatus === 'approved' 
                                    ? ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'شكراً لاهتمامك بهذه الفعالية' : 'Thank you for your interest in this event') : t('registeredNotice')) :
                                   registrationStatus === 'waitlisted' ? t('waitlistedNotice') :
                                   ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'تم الانتهاء من الفعالية' : 'Event has concluded') : t('pendingNotice'))}
                              </div>
                            </div>
                            
                            {['approved', 'attended'].includes(registrationStatus) && <Link
                              href={`/events/${event.id}/checkin${registrationStatus === 'attended' ? '?feedback=1' : ''}`}
                              className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-xl text-sm font-bold shadow-md transition-colors"
                            >
                              <QrCode className="h-4 w-4 text-blue-600" />
                              <span>{registrationStatus === 'attended' ? (isAr ? 'تقييم الفعالية' : 'Rate this event') : (isAr ? 'تعليمات تسجيل الحضور' : 'Check-in instructions')}</span>
                            </Link>}
                            {registrationStatus === 'attended' && event.hasCertificate && <Link href="/profile?tab=certificates" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><Award size={18} aria-hidden="true" />{isAr ? 'شهاداتي' : 'My certificates'}</Link>}
                            
                            {['approved', 'pending', 'waitlisted'].includes(registrationStatus) && (event.state === 'Registration Open' || event.state === 'Ongoing') && (
                              <button 
                                onClick={() => setConfirmCancel(true)}
                                disabled={isRegistering}
                                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
                              >
                                {isRegistering ? <LoadingSpinner size="sm" color="border-white" className="me-2" /> : null}
                                {t('cancelRegistration')}
                              </button>
                            )}
                            {confirmCancel && <div role="group" aria-label={isAr ? 'تأكيد إلغاء التسجيل' : 'Confirm cancellation'} className="p-3 bg-white/10 rounded-xl text-sm">
                              <p>{isAr ? 'هل تريد إلغاء التسجيل؟ قد يُمنح مقعدك لشخص آخر.' : 'Cancel registration? Your seat may be offered to another student.'}</p>
                              <div className="mt-3 flex flex-wrap gap-3"><button disabled={isRegistering} onClick={handleCancelRegistration} className="min-h-11 rounded-lg bg-red-600 px-3 py-3 disabled:opacity-50">{isAr ? 'نعم، إلغاء التسجيل' : 'Confirm cancellation'}</button><button onClick={() => setConfirmCancel(false)} className="min-h-11 rounded-lg px-3 py-3 underline">{isAr ? 'الاحتفاظ بالتسجيل' : 'Keep registration'}</button></div>
                            </div>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {actionError && <p role="alert" className="mt-4 rounded-xl bg-red-950/40 p-3 text-sm text-red-100">{actionError}</p>}
             </div>

             {event.coverUrl && <div className="lg:hidden"><EventPoster url={event.coverUrl} title={title} compact /></div>}

             {/* About Section */}
             <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-cairo text-slate-900 flex items-center gap-3">
                  <span className="w-2 h-6 sm:h-8 bg-blue-600 rounded-full" />
                  <span>{t('about')}</span>
                </h2>
                <p className="text-slate-700 text-base leading-8 whitespace-pre-wrap">
                  {description}
                </p>
             </div>
            
             {/* Learning Gains */}
             {gains && gains.length > 0 && (
               <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100">
                 <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-cairo text-slate-900 flex items-center gap-3">
                   <span className="w-2 h-6 sm:h-8 bg-emerald-500 rounded-full" />
                   <span>{t('whatYouWillLearn')}</span>
                 </h2>
                 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {gains.map((gain, idx) => (
                     <li key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                       <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl flex-shrink-0 mt-0.5 shadow-sm">
                         <CheckCircle className="h-4 w-4" />
                       </div>
                       <span className="text-slate-700 text-sm font-bold leading-relaxed">{gain}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             )}

             {/* Speakers */}
             {event.speakers && event.speakers.length > 0 && (
               <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100">
                 <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-cairo text-slate-900 flex items-center gap-3">
                   <span className="w-2 h-6 sm:h-8 bg-purple-600 rounded-full" />
                   <span>{t('speakers')}</span>
                 </h2>
                 <div className="flex flex-wrap gap-3 sm:gap-4">
                   {event.speakers.map((speaker, idx) => (
                     <span 
                       key={idx} 
                       className="bg-slate-50 text-slate-800 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base border border-slate-200 shadow-xs flex items-center gap-2"
                     >
                       <div className="w-2 h-2 rounded-full bg-purple-400" />
                       {speaker}
                     </span>
                   ))}
                 </div>
               </div>
             )}
             
          </div>
        </div>
      </div>
    </div>
  );
}
