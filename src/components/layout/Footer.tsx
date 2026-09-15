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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3">
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
          </div>

          {/* Quick Links */}
          <ul className="flex flex-wrap justify-center gap-6 text-sm font-medium">
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

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex justify-center text-xs text-slate-500">
          <p>
            {t('copyright', { year: currentYear })}
          </p>
        </div>

      </div>
    </footer>
  );
}
