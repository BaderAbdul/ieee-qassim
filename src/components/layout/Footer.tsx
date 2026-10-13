'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import Image from 'next/image';
import { 
  Calendar, 
  Trophy, 
  UserCircle, 
  Users, 
  Heart, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

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
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-300 border-t border-slate-800/80 transition-colors overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-28 sm:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-800/70">
          
          {/* Col 1: Identity & About */}
          <div className="lg:col-span-5 space-y-4 text-center lg:text-start">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="relative w-28 h-10 brightness-0 invert opacity-90">
                <Image 
                  src="/logo.png" 
                  alt="IEEE Qassim Logo" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Qassim Branch
              </span>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              {isAr
                ? 'المنصة الرسمية لمجتمع IEEE الطلابي بجامعة القصيم. نُمكّن العقول الهندسية والتقنية عبر ورش العمل، التحديات، والتطوير المستمر.'
                : 'The official platform for IEEE Student Branch at Qassim University. Empowering engineering and technology minds through workshops, challenges, and growth.'}
            </p>

            {/* Social channels */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
              <a 
                href="https://x.com/ieeeqaasim?s=11" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 border border-slate-800 transition-all shadow-sm" 
                title="X (Twitter)"
                aria-label="X (Twitter)"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a 
                href="https://www.linkedin.com/company/ieee-qassim/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-[#0A66C2] hover:bg-slate-700 hover:border-slate-600 border border-slate-800 transition-all shadow-sm" 
                title="LinkedIn"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="lg:col-span-4 text-center lg:text-start">
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-4 flex items-center justify-center lg:justify-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? 'روابط المنصة' : 'Platform Navigation'}</span>
            </h4>
            <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm font-medium">
              <li>
                <Link href="/" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <span>{t('home')}</span>
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('events')}</span>
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('leaderboard')}</span>
                </Link>
              </li>
              <li>
                <Link href="/structure" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span>{isAr ? 'الهيكلة الإدارية' : 'Structure'}</span>
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('profile')}</span>
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-slate-300 hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                  <span>{isAr ? 'الدعم والمساعدة' : 'Help & Support'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Privacy */}
          <div className="lg:col-span-3 text-center lg:text-start">
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-4 flex items-center justify-center lg:justify-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'السياسات والشروط' : 'Policies & Terms'}</span>
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-white transition-colors">
                  {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-white transition-colors">
                  {isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}
                </Link>
              </li>
              <li className="pt-2 text-xs text-slate-500">
                <span>{isAr ? 'جامعة القصيم • كلية الهندسة' : 'Qassim University • College of Engineering'}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Section: Developer Attribution & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center md:text-start">
          
          {/* IEEE Statement */}
          <p className="max-w-xl leading-relaxed text-slate-500">
            {isAr 
              ? `© ${currentYear} فرع IEEE الطلابي بجامعة القصيم – جميع الحقوق محفوظة.`
              : `© ${currentYear} IEEE Student Branch at Qassim University – All rights reserved.`}
          </p>

          {/* Passionate Developer Credit */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 shadow-inner">
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse fill-rose-500/30" />
            <span>
              {isAr ? 'تم تطوير المنصة بشغف بواسطة:' : 'Crafted with passion by:'}
            </span>
            <a 
              href="https://www.linkedin.com/in/bader-aldkhilallah-209650224" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition-colors underline underline-offset-4 decoration-blue-500/40 hover:decoration-blue-400"
            >
              <span>{isAr ? 'بدر الدخيل الله' : 'Bader Al-Dkhilallah'}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
