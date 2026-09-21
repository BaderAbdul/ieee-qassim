'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { 
  doc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction, 
  increment,
  DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
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
import { formatDateSafe } from '@/lib/dateUtils';

export default function EventDetailsPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;
  
  const locale = useLocale();
  const t = useTranslations('EventDetails');
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;
  
  const { user, userData, login } = useAuth();
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && active) {
          const evData = { id: docSnap.id, ...docSnap.data() } as PlatformEvent;
          setEvent(evData);
          
          // Fetch current active registrations
          // NOTE: We do not use '!=' 'cancelled' in a query because it requires an index. 
          // Instead we can just read the registeredCount field from the event itself which is updated via transactions.
          setAttendeeCount(evData.registeredCount || 0);
        }
      } catch (error) {
        console.error("Error fetching event details", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    let active = true;

    const checkRegistration = async () => {
      if (!user || !event) return;
      try {
        const regId = `${eventId}_${user.uid}`;
        const regRef = doc(db, 'registrations', regId);
        const regSnap = await getDoc(regRef);
        
        if (active) {
          if (regSnap.exists()) {
            setRegistrationStatus(regSnap.data().status);
          } else {
            setRegistrationStatus(null);
          }
        }
      } catch (error) {
        console.error("Error checking registration", error);
      }
    };
    
    checkRegistration();

    return () => {
      active = false;
    };
  }, [user, event, eventId]);

  const handleRegister = async () => {
    if (!user) {
      login();
      return;
    }
    
    if (!event) return;
    
    setIsRegistering(true);
    try {
      const regId = `${eventId}_${user.uid}`;
      const regRef = doc(db, 'registrations', regId);
      const eventRef = doc(db, 'events', eventId);

      const result = await runTransaction(db, async (transaction) => {
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) {
          throw new Error(isAr ? 'الفعالية غير موجودة' : 'Event not found.');
        }

        const eventData = eventSnap.data() as PlatformEvent;
        if (eventData.state !== 'Registration Open') {
          throw new Error(isAr ? 'التسجيل مغلق لهذه الفعالية' : 'Registration is not open for this event.');
        }

        const regSnap = await transaction.get(regRef);
        if (regSnap.exists()) {
          const currentStatus = regSnap.data().status;
          if (currentStatus !== 'cancelled') {
            throw new Error(isAr ? 'أنت مسجل بالفعل في هذه الفعالية' : 'You are already registered or pending for this event.');
          }
        }

        const currentAttendeeCount = eventData.registeredCount || 0;
        let newStatus = 'approved';
        if (eventData.registrationMode === 'Manual') {
          newStatus = 'pending';
        } else if (currentAttendeeCount >= (eventData.capacity || 0)) {
          newStatus = 'waitlisted';
        }

        const regData: Record<string, unknown> = {
          userId: user.uid,
          eventId: eventId,
          status: newStatus,
          timestamp: serverTimestamp(),
          userName: userData?.arabicFullName || userData?.displayName || user.displayName || 'Student',
          userEmail: userData?.email || user.email || '',
        };
        if (userData?.universityId) {
          regData.universityId = userData.universityId;
        }

        transaction.set(regRef, regData);
        
        if (newStatus !== 'waitlisted') {
          transaction.update(eventRef, {
            registeredCount: increment(1)
          });
        }

        return { 
          status: newStatus, 
          attendeeCount: newStatus !== 'waitlisted' ? currentAttendeeCount + 1 : currentAttendeeCount 
        };
      });
      
      setRegistrationStatus(result.status);
      setAttendeeCount(result.attendeeCount);
    } catch (error: unknown) {
      console.error("Error registering", error);
      const msg = error instanceof Error ? error.message : (isAr ? "حدث خطأ أثناء التسجيل. حاول مرة أخرى." : "Registration failed. Try again.");
      alert(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!user || !event) return;
    if (!confirm(t('confirmCancel'))) return;
    
    setIsRegistering(true);
    try {
      const regId = `${eventId}_${user.uid}`;
      const regRef = doc(db, 'registrations', regId);
      const eventRef = doc(db, 'events', eventId);

      // Query waitlisted candidates to auto-promote FIFO
      const waitlistQ = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId),
        where('status', '==', 'waitlisted')
      );
      const waitlistSnap = await getDocs(waitlistQ);
      let candidateToPromote: DocumentReference | null = null;
      if (!waitlistSnap.empty) {
        const sortedWaitlist = [...waitlistSnap.docs].sort((a, b) => {
          const getTs = (d: typeof a): number => {
            const data = d.data();
            const ts = data.timestamp as { toMillis?: () => number; seconds?: number } | undefined;
            if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
            if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
            return 0;
          };
          return getTs(a) - getTs(b);
        });
        candidateToPromote = sortedWaitlist[0].ref;
      }

      await runTransaction(db, async (transaction) => {
        const regDoc = await transaction.get(regRef);
        const prevStatus = regDoc.exists() ? regDoc.data().status : null;
        const wasApproved = prevStatus === 'approved' || prevStatus === 'pending';

        transaction.set(regRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        }, { merge: true });

        if (wasApproved) {
          let promoted = false;
          if (candidateToPromote) {
            const promDoc = await transaction.get(candidateToPromote);
            if (promDoc.exists() && promDoc.data().status === 'waitlisted') {
              transaction.update(candidateToPromote, {
                status: 'approved',
                promotedAt: serverTimestamp()
              });
              promoted = true;
            }
          }

          if (!promoted) {
            const eventDoc = await transaction.get(eventRef);
            if (eventDoc.exists()) {
              const currentCount = (eventDoc.data() as PlatformEvent).registeredCount || 0;
              if (currentCount > 0) {
                transaction.update(eventRef, {
                  registeredCount: increment(-1)
                });
              }
            }
          }
        }
      });
      
      setRegistrationStatus('cancelled');
      setAttendeeCount(prev => Math.max(0, prev - 1));
      alert(isAr ? 'تم إلغاء التسجيل بنجاح.' : 'Registration cancelled successfully.');
    } catch (error: unknown) {
      console.error("Error cancelling registration", error);
      alert(isAr ? 'حدث خطأ أثناء إلغاء التسجيل.' : 'Error cancelling registration.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" color="border-blue-600" />
        <p className="mt-4 text-slate-600 font-medium text-sm">{t('loading')}</p>
      </div>
    );
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

  const isFull = attendeeCount >= event.capacity;
  const isRegistrationOpen = event.state === 'Registration Open';
  const eventDate = event.date;
  
  const title = isAr ? event.title : event.titleEn || event.title;
  const description = isAr ? event.description : event.descriptionEn || event.description;
  const location = isAr ? event.location : event.locationEn || event.location;
  const gains = isAr ? event.gains : event.gainsEn || event.gains;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-24 sm:pt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm"
          >
            <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
            <span>{t('backToEvents')}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          
          {/* Left Column (Poster) - 5 Cols */}
          <div className="lg:col-span-5 relative">
            <div className="lg:sticky lg:top-28 w-full bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/20 border-4 sm:border-8 border-white group">
              <div className="aspect-[3/4] relative w-full bg-slate-800">
                {event.coverUrl ? (
                  <Image 
                    src={event.coverUrl} 
                    alt={title} 
                    fill
                    priority
                    quality={95}
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-700 to-indigo-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                
                {event.coverUrl && (
                  <a 
                    href={event.coverUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="absolute bottom-4 sm:bottom-6 start-4 sm:start-6 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all sm:opacity-0 sm:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 flex items-center gap-2 shadow-lg border border-white/10"
                  >
                    عرض البوستر بالكامل
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Content) - 7 Cols */}
          <div className="lg:col-span-7 space-y-8 pb-10">
             
             {/* Title & Header Info */}
             <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  <span className="bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-blue-100">
                    {event.type}
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
                    {event.state}
                  </span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-cairo leading-tight mb-6">
                  {title}
                </h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3.5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold block mb-0.5">{t('date')}</span>
                      <span className="text-sm font-bold text-slate-900 block">{formatDateSafe(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}</span>
                      <span className="text-xs font-semibold text-slate-500">{formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours}h)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3.5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold block mb-0.5">{t('location')}</span>
                      <span className="text-sm font-bold text-slate-900 block truncate max-w-[200px]">{location}</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* Registration CTA Card */}
             <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-[2rem] p-6 sm:p-10 shadow-xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {/* Capacity */}
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-300" />
                        <div>
                          <div className="text-[10px] text-blue-200 font-bold">{t('capacity')}</div>
                          <div className="text-sm font-bold text-white">{t('registeredCount', { count: attendeeCount, total: event.capacity })}</div>
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="text-[10px] text-amber-200 font-bold">{isAr ? 'المكافأة' : 'Reward'}</div>
                          <div className="text-sm font-bold text-white">{t('pointsReward', { points: event.points })}</div>
                        </div>
                      </div>

                      {/* Certificate */}
                      {event.hasCertificate && (
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-400" />
                          <div>
                            <div className="text-[10px] text-emerald-200 font-bold">{isAr ? 'الشهادة' : 'Certificate'}</div>
                            <div className="text-sm font-bold text-white">{t('certifiedCertificate')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 sm:w-64 space-y-3">
                    {!user ? (
                      <button 
                        onClick={login} 
                        className="w-full bg-white hover:bg-blue-50 text-blue-900 py-3.5 px-6 rounded-2xl font-bold shadow-lg transition-transform transform hover:-translate-y-1"
                      >
                        {t('loginToRegister')}
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
                              registrationStatus === 'approved' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-50' : 
                              registrationStatus === 'waitlisted' ? 'bg-amber-500/20 border-amber-500/30 text-amber-50' : 
                              'bg-blue-500/20 border-blue-500/30 text-blue-50'
                            }`}>
                              <div className="font-bold text-sm mb-0.5">
                                {registrationStatus === 'approved' 
                                  ? ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'انتهت الفعالية' : 'Event Ended') : t('registeredSuccess')) :
                                 registrationStatus === 'waitlisted' ? t('waitlistedTitle') :
                                 ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'تم الانتهاء من الفعالية' : 'Event has concluded') : t('pendingTitle'))}
                              </div>
                              <div className="text-[10px] opacity-80">
                                {registrationStatus === 'approved' 
                                  ? ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'شكراً لاهتمامك بهذه الفعالية' : 'Thank you for your interest in this event') : t('registeredNotice')) :
                                 registrationStatus === 'waitlisted' ? t('waitlistedNotice') :
                                 ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'تم الانتهاء من الفعالية' : 'Event has concluded') : t('pendingNotice'))}
                              </div>
                            </div>
                            
                            <Link
                              href={`/check-in/${event.id}`}
                              className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-xl text-sm font-bold shadow-md transition-colors"
                            >
                              <QrCode className="h-4 w-4 text-blue-600" />
                              <span>{t('checkInCTA')}</span>
                            </Link>
                            
                            {event.state === 'Registration Open' && (
                              <button 
                                onClick={handleCancelRegistration}
                                disabled={isRegistering}
                                className="w-full text-white/60 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                              >
                                {isRegistering ? <LoadingSpinner size="sm" color="border-white" className="me-2" /> : null}
                                {t('cancelRegistration')}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
             </div>

             {/* About Section */}
             <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-cairo text-slate-900 flex items-center gap-3">
                  <span className="w-2 h-6 sm:h-8 bg-blue-600 rounded-full" />
                  <span>{t('about')}</span>
                </h2>
                <p className="text-slate-600 text-sm sm:text-lg leading-relaxed whitespace-pre-wrap">
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
