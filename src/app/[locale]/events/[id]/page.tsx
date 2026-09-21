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
    <div className="min-h-screen bg-slate-50 pb-20 pt-24">
      
      {/* Hero Banner with Cover */}
      <div className="w-full h-72 sm:h-96 bg-slate-900 relative overflow-hidden">
        {event.coverUrl ? (
          <Image 
            src={event.coverUrl} 
            alt={title} 
            fill
            priority
            quality={85}
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-700 to-indigo-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-0 inset-x-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full mb-4 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
            <span>{t('backToEvents')}</span>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="bg-blue-600/80 text-white backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold">
              {event.type}
            </span>
            <span className="bg-white/20 text-white backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-medium">
              {event.state}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-cairo shadow-xs leading-tight max-w-4xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Details (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* About Section */}
            <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100 text-start">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5 font-cairo text-slate-900 flex items-center gap-3">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-600 rounded-full" />
                <span>{t('about')}</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-lg leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </section>
            
            {/* Learning Gains */}
            {gains && gains.length > 0 && (
              <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100 text-start">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5 font-cairo text-slate-900 flex items-center gap-3">
                  <span className="w-1.5 h-5 sm:h-6 bg-emerald-500 rounded-full" />
                  <span>{t('whatYouWillLearn')}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {gains.map((gain, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <span className="text-slate-700 text-sm font-medium">{gain}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100 text-start">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5 font-cairo text-slate-900 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-purple-600 rounded-full" />
                  <span>{t('speakers')}</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  {event.speakers.map((speaker, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-50 text-slate-800 px-5 py-2.5 rounded-2xl font-bold text-sm border border-slate-200 shadow-xs"
                    >
                      {speaker}
                    </span>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar CTA & Event Snapshot (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100 sticky top-24 space-y-6 text-start">
              
              {/* Event Metadata list */}
              <div className="space-y-5">
                
                {/* Date */}
                <div className="flex items-start gap-3.5 text-slate-700">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">{t('date')}</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatDateSafe(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours} {t('hours')})
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3.5 text-slate-700">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">{t('location')}</span>
                    <span className="font-bold text-slate-900 text-sm">{location}</span>
                  </div>
                </div>

                {/* Capacity & Registrations */}
                <div className="flex items-start gap-3.5 text-slate-700">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">{t('capacity')}</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {t('registeredCount', { count: attendeeCount, total: event.capacity })}
                    </span>
                    {isFull && (
                      <span className="text-xs text-amber-600 font-bold block mt-0.5">
                        {t('fullWaitlist')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Points Reward */}
                <div className="flex items-start gap-3.5 text-slate-700">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'المكافأة' : 'Reward'}</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {t('pointsReward', { points: event.points })}
                    </span>
                  </div>
                </div>

                {/* Certificate */}
                {event.hasCertificate && (
                  <div className="flex items-start gap-3.5 text-slate-700">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'الشهادة' : 'Certificate'}</span>
                      <span className="font-bold text-emerald-800 text-sm">
                        {t('certifiedCertificate')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Registration CTA Actions */}
              <div className="pt-6 border-t border-slate-100">
                {!user ? (
                  <button 
                    onClick={login} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-2xl font-bold shadow-md shadow-blue-500/20 transition-all text-base transform hover:-translate-y-0.5"
                  >
                    {t('loginToRegister')}
                  </button>
                ) : (
                  <>
                    {!registrationStatus || registrationStatus === 'cancelled' ? (
                      <button 
                        onClick={handleRegister} 
                        disabled={!isRegistrationOpen || isRegistering}
                        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center ${
                          !isRegistrationOpen 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : isFull 
                              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-lg transform hover:-translate-y-0.5'
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
                      <div className="space-y-4">
                        <div className={`flex flex-col items-center justify-center p-5 rounded-2xl text-center border ${
                          registrationStatus === 'approved' 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                            : registrationStatus === 'waitlisted' 
                              ? 'bg-amber-50 text-amber-900 border-amber-200' 
                              : 'bg-blue-50 text-blue-900 border-blue-200'
                        }`}>
                          <span className="font-bold text-base mb-1">
                            {registrationStatus === 'approved' 
                              ? ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'انتهت الفعالية' : 'Event Ended') : t('registeredSuccess')) :
                             registrationStatus === 'waitlisted' ? t('waitlistedTitle') :
                             ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'انتهت الفعالية' : 'Event Ended') : t('pendingTitle'))}
                          </span>
                          <span className="text-xs opacity-80">
                            {registrationStatus === 'approved' 
                              ? ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'شكراً لاهتمامك بهذه الفعالية' : 'Thank you for your interest in this event') : t('registeredNotice')) :
                             registrationStatus === 'waitlisted' ? t('waitlistedNotice') :
                             ((event.state === 'Completed' || event.state === 'Archived') ? (isAr ? 'تم الانتهاء من الفعالية' : 'Event has concluded') : t('pendingNotice'))}
                          </span>
                        </div>

                        {/* Direct Check-In Link button if event is Ongoing or user registered */}
                        <Link
                          href={`/check-in/${event.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold shadow-xs transition-colors"
                        >
                          <QrCode className="h-4 w-4 text-blue-400" />
                          <span>{t('checkInCTA')}</span>
                        </Link>
                        
                        {event.state === 'Registration Open' && (
                          <button 
                            onClick={handleCancelRegistration}
                            disabled={isRegistering}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                          >
                            {isRegistering ? (
                              <>
                                <LoadingSpinner size="sm" color="border-red-600" className="me-2" />
                                <span>{t('cancelling')}</span>
                              </>
                            ) : (
                              t('cancelRegistration')
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
