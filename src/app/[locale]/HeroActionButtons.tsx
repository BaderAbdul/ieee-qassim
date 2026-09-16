'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function HeroActionButtons() {
  const { user, login } = useAuth();
  const t = useTranslations('Index');

  return (
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
  );
}
