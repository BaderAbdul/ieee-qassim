'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Trophy, ArrowRight, UserCircle } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('Index');
  const { user, login } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Typography & Action */}
          <div className="flex flex-col space-y-6 text-center lg:text-start lg:rtl:text-right lg:ltr:text-left">
            <div>
              <div className="inline-flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-6">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm font-medium text-blue-200 tracking-wide uppercase">
                  {t('Hero.identityLabel')}
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-black mb-4 font-thmanyah text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 drop-shadow-sm uppercase tracking-tight">
                {t('Hero.wordmark')}
              </h1>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-cairo mb-4 text-white leading-tight">
                {t('Hero.headline')}
              </h2>
              
              <p className="text-xl sm:text-2xl font-cairo text-blue-100/90 font-medium mb-4">
                {t('Hero.subheadline')}
              </p>
              
              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed">
                {t('Hero.description')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link 
                href="/events" 
                className="group inline-flex items-center justify-center w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-[0_0_30px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.7)]"
              >
                <span>{t('Hero.exploreEvents')}</span>
                <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              
              {!user ? (
                <button 
                  onClick={login} 
                  className="inline-flex items-center justify-center w-full sm:w-auto bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all"
                >
                  {t('Hero.login')}
                </button>
              ) : (
                <Link 
                  href="/my-activity" 
                  className="inline-flex items-center justify-center w-full sm:w-auto bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all"
                >
                  {t('Hero.joinCommunity')}
                </Link>
              )}
            </div>
          </div>
          
          {/* Right Column: Visual Ecosystem */}
          <div className="relative hidden lg:block h-full min-h-[450px]">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none" />
            
            {/* Main Event Card (Float) */}
            <div className="absolute top-10 rtl:left-8 ltr:right-8 w-72 bg-white rounded-2xl p-5 shadow-2xl shadow-black/50 border border-slate-200 text-slate-900 animate-float z-20">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{t('Hero.cardEvent')}</div>
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <div className="w-full h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border border-slate-100 mb-4 flex items-center justify-center">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <span className="w-4 h-4 bg-blue-600 rounded-sm"></span>
                </div>
              </div>
              <div className="h-4 w-3/4 bg-slate-200 rounded-md mb-3"></div>
              <div className="h-3 w-1/2 bg-slate-100 rounded-md"></div>
            </div>

            {/* Points Card (Float Delayed) */}
            <div className="absolute top-56 rtl:right-0 ltr:left-0 w-64 bg-slate-800 rounded-2xl p-5 shadow-2xl shadow-black/60 border border-slate-700 text-white animate-float-delayed z-10 backdrop-blur-sm bg-slate-800/90">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-500/20 p-3 rounded-full text-yellow-400 ring-1 ring-yellow-500/30">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white mb-1 font-cairo">{t('Hero.cardPoints')}</div>
                  <div className="h-1.5 w-20 bg-slate-700 rounded-full">
                    <div className="h-full bg-yellow-400 w-3/4 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Card (Float) */}
            <div className="absolute bottom-4 rtl:left-24 ltr:right-24 w-72 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-black/60 border border-slate-700/80 text-white animate-float z-30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                    <UserCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{t('Hero.cardActivity')}</div>
                    <div className="text-xs text-slate-400 mt-0.5">IEEE Qassim</div>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Quick Links / Feature Highlights */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Events */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-cairo text-slate-900">{t('upcomingEvents')}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {t('upcomingEventsDesc')}
              </p>
            </div>
            <Link href="/events" className="text-blue-600 font-bold text-sm hover:text-blue-700 inline-flex items-center group">
              <span>{t('viewAll')}</span>
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
          
          {/* Card 2: Leaderboard */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-cairo text-slate-900">{t('leaderboard')}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {t('leaderboardDesc')}
              </p>
            </div>
            <Link href="/leaderboard" className="text-blue-600 font-bold text-sm hover:text-blue-700 inline-flex items-center group">
              <span>{t('discoverLeaders')}</span>
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>

          {/* Card 3: Activity & Certificates */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <UserCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-cairo text-slate-900">{t('activityAndCerts')}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {t('activityAndCertsDesc')}
              </p>
            </div>
            <Link href="/my-activity" className="text-blue-600 font-bold text-sm hover:text-blue-700 inline-flex items-center group">
              <span>{t('goToActivity')}</span>
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
