'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth, isAdminRole } from '@/context/AuthContext';
import { adminHomeUrl, authSignInUrl } from '@/lib/siteUrls';
import { inAdminArea, useOnAdminHost } from '@/lib/adminPath';
import { useOnAuthHost } from '@/lib/authPath';
import Image from 'next/image';
import {
  Calendar,
  Trophy,
  UserCircle,
  Globe,
  ShieldCheck,
  LogIn,
  LogOut,
  ChevronDown,
  Sparkles,
  Users
} from 'lucide-react';

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const pathname = usePathname();
  const onAdminHost = useOnAdminHost();
  const onAuthHost = useOnAuthHost();
  const { user, userData, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useClickOutside(() => setProfileOpen(false));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If in admin dashboard, let admin layout manage its own sidebar & navigation. The auth host
  // serves nothing but sign-in/up, so it gets no nav either -- its links target the main site
  // and would be CORS-blocked as cross-origin fetches from here.
  if (inAdminArea(pathname, onAdminHost) || onAuthHost) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname.startsWith(path);
  };

  const navLinks = [
    { href: '/', label: t('home'), icon: Sparkles },
    { href: '/events', label: t('events'), icon: Calendar },
    { href: '/leaderboard', label: t('leaderboard'), icon: Trophy },
    { href: '/structure', label: t('structure'), icon: Users },
  ];

  const getFirstAndLastName = (fullName?: string, fallback?: string | null) => {
    if (userData?.firstName && userData?.familyName) {
      return `${userData.firstName} ${userData.familyName}`;
    }
    const name = fullName || fallback || (isAr ? 'عضو' : 'Student');
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return name;
    // Handle composite family names like "الدخيل الله" or "آل سعود"
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (['الله', 'الدين', 'الرحمن', 'سعود'].includes(last) || ['آل', 'ال', 'ابن', 'بن', 'عبد'].includes(prev)) {
      return `${parts[0]} ${prev} ${last}`;
    }
    return `${parts[0]} ${last}`;
  };

  const displayName = getFirstAndLastName(userData?.arabicFullName, user?.displayName);

  const isHomePage = pathname === '/' || pathname === '/ar' || pathname === '/en' || pathname === '';
  const navbarBg = (isScrolled || !isHomePage)
    ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm' 
    : 'bg-transparent';

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${navbarBg}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-20 h-8 sm:w-28 sm:h-10 flex-shrink-0">
                <Image 
                  src="/logo.png" 
                  alt="IEEE Qassim Logo" 
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation Links (Centered) */}
          <nav aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'} className="flex min-w-0 items-center gap-0.5 sm:gap-2 overflow-x-auto no-scrollbar mx-1 sm:mx-4 flex-1 justify-center px-1">
            {navLinks.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="sr-only sm:not-sr-only whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language & Auth & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            
            {/* Language Switcher */}
            <Link
              href={pathname || '/'}
              locale={isAr ? 'en' : 'ar'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
              title={isAr ? 'English' : 'العربية'}
            >
              <Globe className="h-5 w-5" />
            </Link>

            {/* Auth Session */}
            {user ? (
              <div className="relative ps-2 border-s border-gray-200" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(value => !value)}
                  className={`flex items-center gap-2 p-1 pe-2 sm:pe-3 rounded-full border transition-colors ${
                    profileOpen
                      ? 'bg-slate-200/80 border-slate-300'
                      : 'bg-slate-100/70 border-gray-200 hover:bg-slate-200/70'
                  }`}
                  title={displayName}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <div className="h-8 w-8 relative rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden border border-blue-200 shadow-xs shrink-0">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt={displayName} fill sizes="32px" className="object-cover" />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-start">
                    <span className="text-xs font-bold text-slate-900 max-w-[140px] truncate leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">
                      {userData?.totalPoints ?? 0} {isAr ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                  <ChevronDown className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div role="menu" className="absolute end-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden z-50">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCircle className="h-4 w-4 shrink-0" />
                      {t('profile')}
                    </Link>
                    {isAdminRole(userData) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setProfileOpen(false); const url = adminHomeUrl(locale); if (url) window.location.assign(url); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        {t('admin')}
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); void logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => window.location.assign(authSignInUrl(locale, window.location.href))}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('login')}</span>
                <span className="sm:hidden">{t('login')}</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
