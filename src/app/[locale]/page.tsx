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
      <section className="relative overflow-hidden bg-slate-900 text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-20 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-8 shadow-lg">
            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-blue-100">
              {t('badge')}
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-8 font-cairo leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-white to-blue-200 drop-shadow-xs">
            {t('title')}
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-blue-100/80 max-w-3xl mx-auto font-sans mb-12 leading-relaxed">
            {t('description')}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href="/events" 
              className="group inline-flex items-center justify-center w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.7)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.9)] transform hover:-translate-y-0.5"
            >
              <span>{t('exploreEvents')}</span>
              <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            
            {!user && (
              <button 
                onClick={login} 
                className="inline-flex items-center justify-center w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all transform hover:-translate-y-0.5"
              >
                {t('loginNow')}
              </button>
            )}
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
