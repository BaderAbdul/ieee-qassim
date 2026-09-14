'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Calendar, Trophy, UserCircle, Sparkles } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('Footer');
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === 'ar';
  const currentYear = new Date().getFullYear();

  // If in admin dashboard, let admin layout manage its own viewport
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                IEEE
              </div>
              <div>
                <span className="text-xl font-bold font-cairo text-white block leading-tight">
                  {t('brand')}
                </span>
                <span className="text-xs text-blue-400 font-medium">
                  {t('college')}
                </span>
              </div>
            </div>
            
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              {t('description')}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span>{isAr ? 'مجتمع طلابي هندسي معتمد' : 'Accredited Student Engineering Community'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 text-start">
            <h4 className="text-white text-base font-bold font-cairo">
              {t('quickLinks')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors inline-flex items-center gap-2">
                  <span>{t('home')}</span>
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-blue-400 transition-colors inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('events')}</span>
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-blue-400 transition-colors inline-flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('leaderboard')}</span>
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-blue-400 transition-colors inline-flex items-center gap-2">
                  <UserCircle className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('profile')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* University Info */}
          <div className="space-y-4 text-start">
            <h4 className="text-white text-base font-bold font-cairo">
              {isAr ? 'جامعة القصيم' : 'Qassim University'}
            </h4>
            <div className="space-y-2 text-sm text-slate-400">
              <p className="leading-relaxed">
                {isAr ? 'المملكة العربية السعودية، منطقة القصيم، بريدة، المدينة الجامعية في المليداء.' : 'Kingdom of Saudi Arabia, Qassim, Buraidah, University City in Al-Mulayda.'}
              </p>
              <div className="pt-2">
                <span className="inline-block text-xs bg-blue-950 text-blue-300 border border-blue-800/60 px-2.5 py-1 rounded-md">
                  {isAr ? 'فرع IEEE الطلابي' : 'IEEE Student Branch'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-start">
          <p>
            {t('copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>{isAr ? 'صنع بكلية الهندسة' : 'Built for College of Engineering'}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
