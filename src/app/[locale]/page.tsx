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
  
  const [stats, setStats] = useState({ membersCount: '+500', eventsCount: '+25', tracksCount: '4' });
  const [latestEvent, setLatestEvent] = useState<PlatformEvent | null>(null);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        // Fetch Stats
        const statsDoc = await getDoc(doc(db, 'settings', 'homepage'));
        if (statsDoc.exists()) {
          setStats(statsDoc.data() as any);
        }

        // Fetch Latest Event
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
      } catch (error) {
        console.error("Error fetching homepage data:", error);
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
          
          {/* Right Column: Visual Ecosystem */}
          <div className="relative hidden lg:block h-full min-h-[450px]">
            {/* Main Event Card (Float) */}
            <div className="absolute top-10 rtl:left-8 ltr:right-8 w-72 bg-white rounded-2xl p-5 shadow-2xl shadow-slate-200/50 border border-slate-100 text-slate-900 animate-float z-20">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{t('Hero.cardEvent')}</div>
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <div className="w-full h-24 bg-gradient-to-br from-[#00629B] to-blue-800 rounded-xl mb-4 flex items-center justify-center overflow-hidden shadow-inner relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                 <span className="text-white font-bold text-lg font-cairo relative z-10">IEEE QU</span>
              </div>
              <div className="h-4 w-3/4 bg-slate-100 rounded-md mb-3"></div>
              <div className="h-3 w-1/2 bg-slate-50 rounded-md"></div>
            </div>

            {/* Points Card (Float Delayed) */}
            <div className="absolute top-56 rtl:right-0 ltr:left-0 w-64 bg-white rounded-2xl p-5 shadow-2xl shadow-slate-200/60 border border-slate-100 text-slate-800 animate-float-delayed z-10">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-3 rounded-full text-amber-600 ring-4 ring-white shadow-sm">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-800 mb-1 font-cairo">{t('Hero.cardPoints')}</div>
                  <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 w-3/4 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Card (Float) */}
            <div className="absolute bottom-4 rtl:left-24 ltr:right-24 w-72 bg-white rounded-2xl p-5 shadow-2xl shadow-slate-200/60 border border-slate-100 text-slate-800 animate-float z-30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-emerald-100 to-green-100 p-2 rounded-full text-emerald-600 ring-4 ring-white shadow-sm">
                    <UserCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{t('Hero.cardActivity')}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">IEEE Qassim</div>
                  </div>
                </div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 w-full rounded-full"></div>
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
    </div>
  );
}
