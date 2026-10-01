'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Calendar, Trophy, UserCircle } from 'lucide-react';

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
  const isAr = locale === 'ar';
  const currentYear = new Date().getFullYear();

  // If in admin dashboard, let admin layout manage its own viewport
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a href="https://x.com/ieeeqaasim?s=11" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-[#1DA1F2] hover:bg-slate-700 transition-all" title="X (Twitter)">
              <TwitterIcon className="h-5 w-5" />
            </a>
            <a href="https://www.linkedin.com/company/ieee-qassim/" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-[#0A66C2] hover:bg-slate-700 transition-all" title="LinkedIn">
              <LinkedinIcon className="h-5 w-5" />
            </a>
          </div>

          {/* Primary Quick Links */}
          <ul className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <li>
              <Link href="/" className="hover:text-blue-400 transition-colors">
                {t('home')}
              </Link>
            </li>
            <li>
              <Link href="/events" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>{t('events')}</span>
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-slate-500" />
                <span>{t('leaderboard')}</span>
              </Link>
            </li>
            <li>
              <Link href="/structure" className="hover:text-blue-400 transition-colors">
                {isAr ? 'الهيكلة' : 'Structure'}
              </Link>
            </li>
            <li>
              <Link href="/profile" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5">
                <UserCircle className="h-4 w-4 text-slate-500" />
                <span>{t('profile')}</span>
              </Link>
            </li>
          </ul>

          {/* Local Policy Links */}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60 w-full max-w-4xl text-center">
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              {isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </Link>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-2 text-xs text-slate-500 max-w-4xl mx-auto">
          <p className="leading-relaxed">
            {isAr 
              ? `© حقوق النشر ${currentYear} لجمعية IEEE – جميع الحقوق محفوظة. تعتبر IEEE أكبر منظمة مهنية تقنية عالمية غير ربحية مكرسة لتقدم التكنولوجيا لخدمة البشرية.`
              : `© Copyright ${currentYear} IEEE – All rights reserved. A public charity, IEEE is the world’s largest technical professional organization dedicated to advancing technology for the benefit of humanity.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
