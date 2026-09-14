'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Trophy, ArrowRight, UserCircle, Users, LayoutList } from 'lucide-react';
import { collection, query, getDocs, where, limit, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';

export default function HomePage() {
  const t = useTranslations('Index');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, login } = useAuth();
  
  const [stats, setStats] = useState({ membersCount: '+500', eventsCount: '+25', tracksCount: '4', featuredEventId: '', showStructure: true });
  const [latestEvent, setLatestEvent] = useState<PlatformEvent | null>(null);

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

        if (featuredId) {
          const evDoc = await getDoc(doc(db, 'events', featuredId));
          if (evDoc.exists()) {
            setLatestEvent({ id: evDoc.id, ...evDoc.data() } as PlatformEvent);
          } else {
            // Fallback if featured event was deleted
            fetchLatestEventFallback();
          }
        } else {
          fetchLatestEventFallback();
        }
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    };
    
    const fetchLatestEventFallback = async () => {
        const eventsQ = query(
          collection(db, 'events'),
          where('state', 'in', ['Published', 'Registration Open', 'Ongoing']),
          orderBy('date', 'desc'),
          limit(1)
        );
        const eventsSnap = await getDocs(eventsQ);
        if (!eventsSnap.empty) {
          const evDoc = eventsSnap.docs[0];
          setLatestEvent({ id: evDoc.id, ...evDoc.data() } as PlatformEvent);
        }
    };

    fetchHomepageData();
  }, []);

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen">
      {/* Light Mode Premium Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Typography & Action */}
          <div className="flex flex-col space-y-6 text-center lg:text-start lg:rtl:text-right lg:ltr:text-left">
            <div>
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
                  {t('Hero.identityLabel')}
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-black mb-4 font-thmanyah text-slate-900 drop-shadow-sm uppercase tracking-tight">
                {t('Hero.wordmark')}
              </h1>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-cairo mb-4 text-[#002855] leading-tight">
                {t('Hero.headline')}
              </h2>
              
              <p className="text-xl sm:text-2xl font-cairo text-slate-700 font-bold mb-4">
                {t('Hero.subheadline')}
              </p>
              
              <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed font-medium">
                {t('Hero.description')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
              <Link 
                href="/events" 
                className="group inline-flex items-center justify-center w-full sm:w-auto bg-[#00629B] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#004b78] transition-all shadow-md shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-900/30 hover:-translate-y-0.5"
              >
                <span>{t('Hero.exploreEvents')}</span>
                <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              
              {!user ? (
                <button 
                  onClick={login} 
                  className="inline-flex items-center justify-center w-full sm:w-auto bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold transition-all shadow-sm hover:border-slate-300"
                >
                  {t('Hero.login')}
                </button>
              ) : (
                <Link 
                  href="/my-activity" 
                  className="inline-flex items-center justify-center w-full sm:w-auto bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold transition-all shadow-sm hover:border-slate-300"
                >
                  {t('Hero.joinCommunity')}
                </Link>
              )}
            </div>
          </div>
          
          {/* Right Column: Visual Ecosystem (Overlapping Cards) */}
          <div className="relative hidden lg:block h-full min-h-[500px]">
            
            {/* Card 1: Featured Event (Top Right) */}
            <div className="absolute top-0 rtl:left-0 ltr:right-0 w-80 bg-white rounded-3xl p-5 shadow-2xl shadow-blue-900/10 border border-slate-100 z-30 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full">{t('Hero.cardEvent')}</div>
                <div className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">24 Oct</div>
              </div>
              <div className="w-full h-32 bg-gradient-to-br from-[#00629B] to-indigo-700 rounded-2xl mb-4 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                 <div className="absolute bottom-3 right-3 left-3">
                   <h4 className="text-white font-bold text-sm leading-tight">معسكر الذكاء الاصطناعي</h4>
                   <p className="text-blue-100 text-[10px] mt-1">150 مسجل • تبدأ قريباً</p>
                 </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-100"></div>
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100"></div>
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-purple-100"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500">+147 انضموا</span>
              </div>
            </div>

            {/* Card 2: Points / Leaderboard (Middle Left, Overlapping) */}
            <div className="absolute top-32 rtl:-right-8 ltr:-left-8 w-64 bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-100/50 z-20 transform -rotate-2 hover:rotate-0 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-3.5 rounded-2xl text-amber-600 shadow-sm">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">نقاطك</div>
                  <div className="text-2xl font-black text-slate-800 font-cairo flex items-baseline gap-1">
                    450 <span className="text-xs font-bold text-emerald-500">+50</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 w-[85%] rounded-full relative">
                      <div className="absolute top-0 right-0 bottom-0 w-full bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1.5 text-end">باقي 50 للمستوى القادم</div>
                </div>
              </div>
            </div>

            {/* Card 3: Activity/Certificate (Bottom Right, Overlapping) */}
            <div className="absolute bottom-10 rtl:left-12 ltr:right-12 w-72 bg-[#002855] rounded-3xl p-5 shadow-2xl shadow-blue-900/30 border border-blue-800 z-40 transform rotate-2 hover:rotate-0 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2.5 rounded-2xl text-blue-300 ring-1 ring-white/10">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white tracking-wide">{t('Hero.cardActivity')}</div>
                    <div className="text-[10px] text-blue-300 font-medium">شهادة معتمدة صدرت</div>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">أساسيات إنترنت الأشياء</div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-0.5">تم توثيق حضورك بنجاح</div>
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

      {/* Quick Links / Feature Highlights */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Events (Dynamic) */}
          <Link href={latestEvent ? `/events/${latestEvent.id}` : "/events"} className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg transition-all flex flex-col overflow-hidden group">
            {latestEvent ? (
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {latestEvent.coverUrl ? (
                  <img src={latestEvent.coverUrl} alt={isAr ? latestEvent.title : (latestEvent.titleEn || latestEvent.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
              
              {/* Committee 1 */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-center hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black font-cairo text-slate-900 mb-2">لجنة العلاقات العامة</h3>
                <p className="text-sm text-slate-500">حلقة الوصل بين النادي والجهات الخارجية والمجتمع الطلابي.</p>
              </div>

              {/* Committee 2 */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-center hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black font-cairo text-slate-900 mb-2">لجنة التنظيم</h3>
                <p className="text-sm text-slate-500">الإشراف اللوجستي وتنسيق سير الفعاليات وورش العمل بكفاءة عالية.</p>
              </div>

              {/* Committee 3 */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-center hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-black font-cairo text-slate-900 mb-2">المسار التقني</h3>
                <p className="text-sm text-slate-500">تقديم المحتوى العلمي وتجهيز المعسكرات والمسابقات التقنية.</p>
              </div>

              {/* Committee 4 */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-center hover:shadow-xl hover:shadow-pink-900/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-16 w-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black font-cairo text-slate-900 mb-2">المسار الإعلامي</h3>
                <p className="text-sm text-slate-500">التوثيق المرئي وصناعة المحتوى وإدارة حسابات التواصل الاجتماعي.</p>
              </div>

            </div>
          </div>
        </section>
      )}

    </div>
  );
}
