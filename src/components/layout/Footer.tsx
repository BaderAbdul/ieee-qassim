'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb } from 'lucide-react';

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
    </svg>
  );
}

export default function Footer() {
  const t = useTranslations('Footer');
  const locale = useLocale();
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const isAr = locale === 'ar';
  const currentYear = new Date().getFullYear();

  // If in admin dashboard, let admin layout manage its own viewport
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="min-w-0 border-t border-slate-800 bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex min-h-11 items-center text-base font-bold text-white">{isAr ? 'IEEE القصيم' : 'IEEE Qassim'}</Link>
          {/* Social Links */}
          <div className="flex items-center gap-2">
            <a href="https://x.com/ieeeqaasim?s=11" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white" aria-label={isAr ? 'IEEE القصيم على X — نافذة جديدة' : 'IEEE Qassim on X — new window'}>
              <TwitterIcon className="h-5 w-5" />
            </a>
            <a href="https://www.linkedin.com/company/ieee-qassim/" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white" aria-label={isAr ? 'IEEE القصيم على LinkedIn — نافذة جديدة' : 'IEEE Qassim on LinkedIn — new window'}>
              <LinkedinIcon className="h-5 w-5" />
            </a>
          </div>
          </div>

          {/* Primary Quick Links */}
          <nav aria-label={isAr ? 'روابط الموقع' : 'Site links'}><ul className="flex flex-wrap gap-x-4 text-sm font-semibold">
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                {t('home')}
              </Link>
            </li>
            <li>
              <Link href="/events" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                <span>{t('events')}</span>
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                <span>{t('leaderboard')}</span>
              </Link>
            </li>
            <li>
              <Link href="/structure" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                {isAr ? 'فريق النادي' : 'Club team'}
              </Link>
            </li>
            <li>
              <Link href="/profile" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                <span>{isAr ? 'حسابي' : 'My account'}</span>
              </Link>
            </li>
          </ul></nav>

          {/* Local Policy Links */}
          <div className="flex flex-wrap items-center gap-x-4 border-t border-slate-700/70 pt-2 text-sm text-slate-300">
            <Link href="/help" className="inline-flex min-h-11 items-center transition-colors hover:text-white">{isAr ? 'المساعدة' : 'Help'}</Link>
            {user && !userData?.isRestricted ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('ieee-open-suggestion'))} className="inline-flex min-h-11 items-center gap-1.5 text-amber-200 transition-colors hover:text-amber-100"><Lightbulb aria-hidden="true" className="h-4 w-4" />{isAr ? 'شاركنا اقتراحك' : 'Suggest an idea'}</button> : null}
            <Link href="/privacy" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              {isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </Link>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-3 border-t border-slate-700/70 pt-4 text-sm text-slate-300">
          <p className="leading-relaxed">
            {isAr 
              ? `© حقوق النشر ${currentYear} لجمعية IEEE – جميع الحقوق محفوظة. تعتبر IEEE أكبر منظمة مهنية تقنية عالمية غير ربحية مكرسة لتقدم التكنولوجيا لخدمة البشرية.`
              : `© Copyright ${currentYear} IEEE – All rights reserved. A public charity, IEEE is the world’s largest technical professional organization dedicated to advancing technology for the benefit of humanity.`}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-300">
            <span>{isAr ? 'تطوير وتصميم:' : 'Developed & Designed by:'}</span>
            <a 
              href="https://www.linkedin.com/in/bader-aldukhailallah" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors underline underline-offset-4 decoration-blue-500/40 hover:decoration-blue-400"
            >
              {isAr ? 'بدر الدخيل الله' : 'Bader Al-Dukhailallah'}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
