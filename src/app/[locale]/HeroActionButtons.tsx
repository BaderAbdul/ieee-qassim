'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

export default function HeroActionButtons() {
  const { user, login } = useAuth();
  const t = useTranslations('Index');
  const isAr = useLocale() === 'ar';

  return (
    <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4 justify-center lg:justify-start pt-1 sm:pt-2">
      <Link 
        href="/events"
        className="group inline-flex min-h-11 items-center justify-center bg-blue-600 text-white px-5 sm:px-7 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm text-base"
      >
        <span>{t('Hero.exploreEvents')}</span>
        <ArrowRight className="ms-2 h-4 w-4 sm:h-5 sm:w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
      </Link>
      
      {!user ? (
        <button 
          onClick={login} 
          className="inline-flex min-h-11 items-center justify-center bg-white border border-slate-200 text-slate-700 px-5 sm:px-7 py-3 rounded-xl font-bold transition-colors shadow-sm hover:bg-slate-50 text-base"
        >
          {t('Hero.login')}
        </button>
      ) : (
        <Link 
          href="/profile" 
          className="inline-flex min-h-11 items-center justify-center bg-white border border-slate-200 text-slate-700 px-5 sm:px-7 py-3 rounded-xl font-bold transition-colors shadow-sm hover:bg-slate-50 text-base"
        >
          {isAr ? 'حسابي' : 'My account'}
        </Link>
      )}
    </div>
  );
}
