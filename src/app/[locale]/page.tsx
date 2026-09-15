'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Trophy, ArrowRight, UserCircle, Users, LayoutList } from 'lucide-react';
import { collection, query, getDocs, where, limit, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';

export default function HomePage() {
  const t = useTranslations('Index');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { user, userData, login } = useAuth();
  
  const [stats, setStats] = useState({ membersCount: '+500', eventsCount: '+25', tracksCount: '4', featuredEventId: '', showStructure: true, heroTitle: '', heroSubtitleAr: '', heroSubtitleEn: '', committees: [] as any[] });
  const [latestEvent, setLatestEvent] = useState<PlatformEvent | null>(null);
  const [eventsList, setEventsList] = useState<PlatformEvent[]>([]);
  const [latestEventRegStatus, setLatestEventRegStatus] = useState<string | null>(null);
  const [latestCert, setLatestCert] = useState<{title: string, date: string} | null>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const handleCardClick = (cardId: number, path: string) => {
    if (activeCard === cardId || window.innerWidth >= 1024) {
      if (path.startsWith('http')) {
        window.location.href = path;
      } else {
        router.push(path);
      }
    } else {
      setActiveCard(cardId);
    }
  };

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        let featuredId = '';
        const statsDoc = await getDoc(doc(db, 'settings', 'homepage'));
        if (statsDoc.exists()) {
          const data = statsDoc.data() as any;
          setStats(data);
          featuredId = data.featuredEventId;
        }

        // Fetch up to 3 recent events for carousel
        const eventsQ = query(
          collection(db, 'events'),
          where('state', 'in', ['Published', 'Registration Open', 'Ongoing', 'Completed']),
          orderBy('date', 'desc'),
          limit(3)
        );
        const eventsSnap = await getDocs(eventsQ);
        const evs = eventsSnap.docs.map(d => ({id: d.id, ...d.data()} as PlatformEvent));
        setEventsList(evs);

        if (featuredId) {
          const evDoc = await getDoc(doc(db, 'events', featuredId));
          if (evDoc.exists()) {
            setLatestEvent({ id: evDoc.id, ...evDoc.data() } as PlatformEvent);
          } else if (evs.length > 0) {
            setLatestEvent(evs[0]);
          }
        } else if (evs.length > 0) {
          setLatestEvent(evs[0]);
        }
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    };

    fetchHomepageData();
  }, []);

  useEffect(() => {
    if (user && latestEvent) {
      const fetchRegStatus = async () => {
        try {
          const regDoc = await getDoc(doc(db, 'registrations', `${latestEvent.id}_${user.uid}`));
          if (regDoc.exists()) {
            setLatestEventRegStatus(regDoc.data().status);
          }
        } catch(e) {}
      }
      fetchRegStatus();
    }
  }, [user, latestEvent]);

  useEffect(() => {
    if (user) {
      const fetchCerts = async () => {
        try {
          const certQ = query(
            collection(db, 'certificates'),
            where('userId', '==', user.uid),
            orderBy('issuedAt', 'desc'),
            limit(1)
          );
          const certSnap = await getDocs(certQ);
          if (!certSnap.empty) {
            const data = certSnap.docs[0].data();
            setLatestCert({ title: data.eventTitle, date: 'تم توثيق حضورك بنجاح' });
          }
        } catch (e) {
          console.error('Error fetching cert', e);
        }
      };
      fetchCerts();
    }
  }, [user]);

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen">
      {/* Light Mode Premium Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-12 lg:pb-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Wordmark & Buttons */}
          <div className="flex flex-col space-y-6 text-center lg:text-start lg:rtl:text-right lg:ltr:text-left">
            <div>
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
                  {t('Hero.identityLabel')}
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-4 font-thmanyah text-slate-900 drop-shadow-sm uppercase tracking-tight">
                {t('Hero.headline')}
              </h1>
              <p className="text-slate-600 font-medium text-sm sm:text-base max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                {t('Hero.description')}
              </p>
            </div>
            
            <div className="flex flex-row flex-wrap items-center gap-4 justify-center lg:justify-start pt-6">
              <Link 
                href="/events"
                className="group inline-flex items-center justify-center bg-[#00629B]/80 backdrop-blur-xl border border-white/20 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold hover:bg-[#004b78]/90 transition-all shadow-md shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-900/30 hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <span>{t('Hero.exploreEvents')}</span>
                <ArrowRight className="ms-2 h-4 w-4 sm:h-5 sm:w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              
              {!user ? (
                <button 
                  onClick={login} 
                  className="inline-flex items-center justify-center bg-white/50 backdrop-blur-xl border border-white/40 text-slate-700 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold transition-all shadow-sm hover:bg-white/70 hover:border-white/60 hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  {t('Hero.login')}
                </button>
              ) : (
                <Link 
                  href="/profile" 
                  className="inline-flex items-center justify-center bg-white/50 backdrop-blur-xl border border-white/40 text-slate-700 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold transition-all shadow-sm hover:bg-white/70 hover:border-white/60 hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  {t('Hero.joinCommunity')}
                </Link>
              )}
            </div>
          </div>
          
          {/* Right Column: Visual Ecosystem (Overlapping Cards) */}
          <div className="relative block w-full h-[320px] lg:h-full lg:min-h-[500px] mt-4 lg:mt-0 flex items-center justify-center lg:block">
            
            <div className="relative w-full max-w-sm lg:max-w-none h-full">
              {/* Card 1: Featured Event (Top Right) */}
              <div 
                className={`absolute top-0 lg:top-4 rtl:left-2 lg:rtl:left-0 lg:ltr:right-0 ltr:-right-2 w-72 lg:w-80 bg-white/60 backdrop-blur-2xl rounded-3xl p-4 lg:p-5 shadow-2xl shadow-blue-900/15 border border-white/50 transform hover:-translate-y-2 lg:hover:z-50 transition-all duration-300 group cursor-pointer ${activeCard === 1 ? 'z-50 scale-105' : 'z-30'}`}
                onClick={() => { if(latestEvent) handleCardClick(1, `/events/${latestEvent.id}`) }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full">{latestEvent?.state === 'Ongoing' ? (isAr ? 'جاري الآن' : 'Ongoing') : (latestEvent?.state === 'Registration Open' ? (isAr ? 'التسجيل مفتوح' : 'Open') : (isAr ? 'قريباً' : 'Soon'))}</div>
                  <div className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">{latestEvent ? (latestEvent.date as any)?.toDate?.()?.toLocaleDateString(isAr ? 'ar-SA' : 'en-US') || new Date(latestEvent.date as any).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '---'}</div>
                </div>
                <div className="w-full h-24 lg:h-32 bg-gradient-to-br from-[#00629B] to-indigo-700 rounded-2xl mb-4 relative overflow-hidden">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                   <div className="absolute bottom-3 right-3 left-3">
                     <h4 className="text-white font-bold text-sm lg:text-base leading-tight truncate">{latestEvent ? (isAr ? latestEvent.title : (latestEvent.titleEn || latestEvent.title)) : (isAr ? 'لا توجد فعاليات' : 'No Events')}</h4>
                     <p className="text-blue-100 text-[10px] lg:text-xs mt-1">{latestEvent ? `${latestEvent.registeredCount || 0} ${isAr ? 'مسجل' : 'Registered'}` : ''}</p>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-100"></div>
                    <div className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100"></div>
                    <div className="h-6 w-6 rounded-full border-2 border-white bg-purple-100"></div>
                  </div>
                  <span className="text-[10px] lg:text-xs font-bold text-slate-500">{latestEvent ? `+${latestEvent.registeredCount || 0} ${isAr ? 'انضموا' : 'Joined'}` : ''}</span>
                </div>
              </div>

              {/* Card 2: Points / Leaderboard (Middle Left, Overlapping) */}
              <div 
                className={`absolute top-20 lg:top-32 rtl:-right-2 lg:rtl:-right-8 ltr:-left-2 lg:ltr:-left-8 w-56 lg:w-64 bg-white/60 backdrop-blur-2xl rounded-3xl p-4 lg:p-5 shadow-xl shadow-slate-200/50 border border-white/50 transform -rotate-2 hover:rotate-0 hover:-translate-y-1 lg:hover:z-50 transition-all duration-300 cursor-pointer ${activeCard === 2 ? 'z-50 scale-105 rotate-0' : 'z-20'}`}
                onClick={() => handleCardClick(2, '/leaderboard')}
              >
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-2.5 lg:p-3.5 rounded-2xl text-amber-600 shadow-sm">
                    <Trophy className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'نقاطك' : 'Your Points'}</div>
                    <div className="text-lg lg:text-2xl font-black text-slate-800 font-cairo flex items-baseline gap-1">
                      {user && userData ? userData.totalPoints : 0} <span className="text-[10px] font-bold text-emerald-500">Pts</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 w-[75%] rounded-full relative">
                        <div className="absolute top-0 right-0 bottom-0 w-full bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-[8px] lg:text-[9px] font-bold text-slate-400 mt-1.5 text-end">{user ? (isAr ? 'استمر بجمع النقاط!' : 'Keep earning points!') : (isAr ? 'سجل دخولك الآن' : 'Login to earn points')}</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Activity/Certificate (Bottom Right, Overlapping) */}
              <div 
                className={`absolute top-40 lg:top-auto lg:bottom-10 rtl:left-6 lg:rtl:left-12 ltr:right-6 lg:ltr:right-12 w-60 lg:w-72 bg-[#002855]/70 backdrop-blur-2xl rounded-3xl p-4 lg:p-5 shadow-2xl shadow-blue-900/40 border border-white/10 transform rotate-2 hover:rotate-0 hover:-translate-y-1 lg:hover:z-50 transition-all duration-300 cursor-pointer ${activeCard === 3 ? 'z-50 scale-105 rotate-0' : 'z-40'}`}
                onClick={() => handleCardClick(3, '/profile')}
              >
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="bg-blue-500/20 p-2 lg:p-2.5 rounded-2xl text-blue-300 ring-1 ring-white/10">
                      <UserCircle className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <div>
                      <div className="text-xs lg:text-sm font-bold text-white tracking-wide">{isAr ? 'نشاطك' : 'Activity'}</div>
                      <div className="text-[8px] lg:text-[9px] text-blue-300 font-medium">
                        {latestCert 
                          ? (isAr ? 'شهادة معتمدة صدرت' : 'Certificate Issued') 
                          : latestEventRegStatus === 'approved'
                            ? (isAr ? 'تم تأكيد تسجيلك' : 'Registration Confirmed')
                            : latestEventRegStatus === 'pending'
                              ? (isAr ? 'تسجيلك قيد المراجعة' : 'Registration Pending')
                              : latestEventRegStatus === 'waitlisted'
                                ? (isAr ? 'أنت في قائمة الانتظار' : 'You are Waitlisted')
                                : user
                                  ? (isAr ? 'لا يوجد نشاط حديث' : 'No recent activity') 
                                  : (isAr ? 'مجتمع تقني تفاعلي' : 'Interactive Community')}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 lg:p-3 border border-white/10 flex items-center gap-2.5 lg:gap-3">
                  <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-inner flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="truncate">
                    <div className="text-[9px] lg:text-[10px] font-bold text-white truncate">
                      {latestCert 
                        ? latestCert.title 
                        : latestEventRegStatus
                          ? latestEvent?.title
                          : (user ? (isAr ? 'حضور الفعاليات يمنحك شهادات' : 'Attend events to earn certificates') : (isAr ? 'اكتشف فعالياتنا وانضم إلينا' : 'Discover and join our events'))}
                    </div>
                    <div className="text-[8px] lg:text-[9px] text-emerald-400 font-medium mt-0.5 truncate">{latestCert ? latestCert.date : latestEventRegStatus ? (isAr ? 'الفعالية القادمة' : 'Upcoming Event') : ''}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Hero Stats Strip */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-8 mb-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-slate-100">
          
          <div className="flex items-center gap-4 justify-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-3xl font-black text-slate-900">{stats.membersCount}</span>
              <span className="text-sm font-bold text-slate-500">{isAr ? 'عضو في المجتمع' : 'Community Members'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center px-4 pt-6 md:pt-0">
            <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-7 w-7" />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-3xl font-black text-slate-900">{stats.eventsCount}</span>
              <span className="text-sm font-bold text-slate-500">{isAr ? 'فعالية وورشة عمل' : 'Events & Workshops'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center px-4 pt-6 md:pt-0">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <LayoutList className="h-7 w-7" />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-3xl font-black text-slate-900">{stats.tracksCount}</span>
              <span className="text-sm font-bold text-slate-500">{isAr ? 'مسارات ولجان' : 'Tracks & Committees'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* Events Carousel Section */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{isAr ? 'أحدث الفعاليات' : 'Latest Events'}</h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">{isAr ? 'اكتشف وسجل في أحدث فعاليات وورش عمل النادي' : 'Discover and register for the latest club events and workshops'}</p>
          </div>
          <Link 
            href="/events"
            className="hidden sm:inline-flex items-center justify-center bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-colors"
          >
            {isAr ? 'استعرض الكل' : 'View All'}
            <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>

        {eventsList.length > 0 ? (
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory hide-scrollbar gap-6">
            {eventsList.map((event) => {
              const isCompleted = event.state === 'Completed' || event.state === 'Archived';
              return (
                <Link 
                  href={`/events/${event.id}`} 
                  key={event.id}
                  className={`min-w-[280px] sm:min-w-[340px] max-w-[340px] flex-shrink-0 snap-start bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 hover:shadow-xl transition-all flex flex-col overflow-hidden group ${isCompleted ? 'grayscale-[40%] opacity-90' : ''}`}
                >
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    {event.coverUrl ? (
                      <img src={event.coverUrl} alt={isAr ? event.title : (event.titleEn || event.title)} loading="lazy" className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isCompleted ? 'blur-sm brightness-90' : ''}`} />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br from-[#00629B] to-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ${isCompleted ? 'blur-sm brightness-90' : ''}`}>
                        <span className="text-white/30 font-black text-4xl uppercase tracking-widest">IEEE QU</span>
                      </div>
                    )}
                    <div className="absolute top-4 rtl:right-4 ltr:left-4">
                      <span className={`bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black px-3 py-1.5 rounded-full shadow-sm ${isCompleted ? 'opacity-80' : ''}`}>
                        {event.state === 'Registration Open' ? (isAr ? 'التسجيل مفتوح' : 'Registration Open') : 
                         event.state === 'Completed' ? (isAr ? 'منتهية' : 'Completed') :
                         event.state === 'Archived' ? (isAr ? 'مؤرشفة' : 'Archived') :
                         event.state === 'Ongoing' ? (isAr ? 'جاري الآن' : 'Ongoing') :
                         (isAr ? 'قريباً' : 'Coming Soon')}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col relative bg-white/60">
                    <div className="flex items-center text-xs font-bold text-slate-500 mb-3 gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        {new Date(event.date as any).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2">
                      {isAr ? event.title : (event.titleEn || event.title)}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                      {isAr ? event.description : (event.descriptionEn || event.description)}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        {isAr ? 'التفاصيل' : 'Details'}
                      </span>
                      <ArrowRight className="h-5 w-5 text-blue-600 rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200 border-dashed">
            <p className="text-slate-500 font-medium">{isAr ? 'لا توجد فعاليات حالياً' : 'No events available right now'}</p>
          </div>
        )}
        
        <div className="mt-2 text-center sm:hidden">
          <Link 
            href="/events"
            className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-5 py-3.5 rounded-xl font-bold hover:bg-blue-100 transition-colors w-full shadow-sm"
          >
            {isAr ? 'استعرض الكل' : 'View All'}
            <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>

      {/* Gamification Loop Section */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 font-cairo">{t('Gamification.title')}</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center relative">
              {/* Connection lines (desktop only) */}
              <div className="hidden lg:block absolute top-12 rtl:right-1/6 ltr:left-1/6 rtl:left-1/6 ltr:right-1/6 h-0.5 bg-gradient-to-r rtl:from-blue-500 rtl:via-emerald-500 rtl:to-amber-500 ltr:from-blue-500 ltr:via-emerald-500 ltr:to-amber-500 opacity-30 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/20 border border-blue-400/30 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-[0_0_30px_rgba(59,130,246,0.15)] backdrop-blur-sm">
                  🎯
                </div>
                <h3 className="text-white font-bold text-lg max-w-[200px]">{t('Gamification.step1')}</h3>
              </div>
              
              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-500/20 border border-amber-400/30 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-sm">
                  ⭐
                </div>
                <h3 className="text-white font-bold text-lg max-w-[200px]">{t('Gamification.step2')}</h3>
              </div>
              
              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-purple-500/20 border border-purple-400/30 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-sm">
                  🏆
                </div>
                <h3 className="text-white font-bold text-lg max-w-[200px]">{t('Gamification.step3')}</h3>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/20 border border-emerald-400/30 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-sm">
                  🎓
                </div>
                <h3 className="text-white font-bold text-lg max-w-[200px]">{t('Gamification.step4')}</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links / Feature Highlights */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Events (Dynamic) */}
          <Link href={latestEvent ? `/events/${latestEvent.id}` : "/events"} className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg transition-all flex flex-col overflow-hidden group">
            {latestEvent ? (
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {latestEvent.coverUrl ? (
                  <img src={latestEvent.coverUrl} alt={isAr ? latestEvent.title : (latestEvent.titleEn || latestEvent.title)} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#00629B] to-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <span className="text-white/30 font-black text-4xl uppercase tracking-widest">IEEE QU</span>
                  </div>
                )}
                <div className="absolute top-4 rtl:right-4 ltr:left-4">
                  <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-black px-3 py-1.5 rounded-full shadow-sm">
                    {latestEvent.state === 'Registration Open' ? (isAr ? 'التسجيل مفتوح' : 'Registration Open') : (isAr ? 'قريباً' : 'Coming Soon')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 pb-4">
                <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Calendar className="h-7 w-7" />
                </div>
              </div>
            )}
            
            <div className="p-8 pt-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black mb-3 font-cairo text-slate-900">{latestEvent ? (isAr ? latestEvent.title : (latestEvent.titleEn || latestEvent.title)) : t('upcomingEvents')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                  {t('upcomingEventsDesc')}
                </p>
              </div>
              <div className="flex items-center">
                <div className="inline-flex items-center gap-2 bg-slate-50 text-blue-700 px-5 py-2.5 rounded-full font-bold text-sm transition-colors group-hover:bg-slate-100">
                  <span>{t('viewAll')}</span>
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
          
          {/* Card 2: Leaderboard */}
          <Link href="/leaderboard" className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg transition-all flex flex-col justify-between p-8 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 h-40 w-40 bg-amber-50 rounded-full blur-3xl group-hover:bg-amber-100 transition-colors pointer-events-none"></div>
            <div className="relative z-10">
              <div className="h-14 w-14 bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-amber-200/50">
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black mb-3 font-cairo text-slate-900">{t('leaderboard')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                {t('leaderboardDesc')}
              </p>
            </div>
            <div className="relative z-10 flex items-center">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-5 py-2.5 rounded-full font-bold text-sm transition-colors group-hover:bg-amber-100">
                <span>{t('discoverLeaders')}</span>
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Card 3: Activity & Certificates */}
          <Link href="/my-activity" className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg transition-all flex flex-col justify-between p-8 relative overflow-hidden group">
            <div className="absolute -left-8 -bottom-8 h-40 w-40 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors pointer-events-none"></div>
            <div className="relative z-10">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-emerald-200/50">
                <UserCircle className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black mb-3 font-cairo text-slate-900">{t('activityAndCerts')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                {t('activityAndCertsDesc')}
              </p>
            </div>
            <div className="relative z-10 flex items-center">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-full font-bold text-sm transition-colors group-hover:bg-emerald-100">
                <span>{t('goToActivity')}</span>
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* IEEE QU Structure (Admin Controlled) */}
      {stats.showStructure !== false && (
        <section className="py-16 bg-white border-t border-slate-100 mt-8 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-50 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black font-cairo text-slate-900 mb-4">هيكلة النادي</h2>
              <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                يتكون الفرع الطلابي لجمعية مهندسي الكهرباء والإلكترونيات (IEEE) بجامعة القصيم من عدة لجان ومسارات تعمل بتكامل لتحقيق أهداف النادي.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {stats.committees && stats.committees.length > 0 ? (
                stats.committees.map((committee: any, index: number) => {
                  const colors = ['blue', 'indigo', 'emerald', 'pink', 'amber', 'purple'];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={committee.id || index} className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className={`h-16 w-16 bg-${color}-100 text-${color}-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner`}>
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black font-cairo text-slate-900 mb-2">{committee.name}</h3>
                      <p className="text-sm text-slate-500 mb-4">{committee.description}</p>
                      
                      {committee.members && committee.members.length > 0 && (
                        <div className="flex -space-x-2 rtl:space-x-reverse justify-center mt-2">
                          {committee.members.slice(0, 4).map((member: any) => (
                            <div key={member.userId} className={`h-8 w-8 rounded-full border-2 border-white bg-${color}-200 flex items-center justify-center text-xs font-bold text-${color}-700 overflow-hidden relative group`} title={member.name}>
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <span>{member.name.charAt(0)}</span>
                              )}
                              <div className="absolute hidden group-hover:block bottom-full mb-1 w-max px-2 py-1 bg-gray-900 text-white text-[10px] rounded z-50">
                                {member.name} - {member.role}
                              </div>
                            </div>
                          ))}
                          {committee.members.length > 4 && (
                            <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              +{committee.members.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  {isAr ? 'لم يتم إضافة لجان بعد.' : 'No committees added yet.'}
                </div>
              )}

            </div>
          </div>
        </section>
      )}

    </div>
  );
}
