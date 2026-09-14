'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, 
  Trophy, 
  UserCircle, 
  Globe, 
  Menu, 
  X, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const pathname = usePathname();
  const { user, userData, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If in admin dashboard, let admin layout manage its own sidebar & navigation
  if (pathname.startsWith('/admin')) {
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
    ...(user ? [
      { href: '/profile', label: t('profile'), icon: UserCircle },
    ] : []),
    ...(userData?.role === 'super_admin' || userData?.role === 'event_organizer' ? [
      { href: '/admin', label: t('admin'), icon: ShieldCheck, isAdmin: true }
    ] : []),
  ];

  const getFirstAndLastName = (fullName?: string, fallback?: string | null) => {
    if (!fullName) return fallback || 'Student';
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const displayName = getFirstAndLastName(userData?.arabicFullName, user?.displayName);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center lg:px-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                IEEE
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black font-cairo text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                  IEEE QU
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active 
                      ? 'bg-blue-50 text-blue-700 shadow-xs' 
                      : item.isAdmin
                        ? 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language Switcher & User Auth */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* Language Switcher Preserving Route (Icon Only) */}
            <Link
              href={pathname || '/'}
              locale={isAr ? 'en' : 'ar'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              title={isAr ? 'English' : 'العربية'}
            >
              <Globe className="h-5 w-5" />
            </Link>

            {/* Auth Session */}
            {user ? (
              <div className="flex items-center gap-2 ps-2 border-s border-gray-200">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2.5 p-1 pe-3 rounded-full hover:bg-slate-100/70 transition-colors"
                  title={displayName}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden border border-blue-200 shadow-xs">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="text-xs font-bold text-slate-900 max-w-[120px] truncate leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">
                      {userData?.totalPoints ?? 0} {isAr ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('logout')}
                >
                  <LogOut className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <LogIn className="h-4 w-4" />
                <span>{t('login')}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href={pathname || '/'}
              locale={isAr ? 'en' : 'ar'}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center"
            >
              <Globe className="h-5 w-5" />
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
              aria-label={t('menu')}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : item.isAdmin
                      ? 'text-purple-600 hover:bg-purple-50'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-2 border-t border-gray-100">
            {user ? (
              <div className="space-y-3">
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="font-bold text-slate-900 text-sm">{displayName}</span>
                    <span className="text-xs text-blue-600 font-medium">
                      {userData?.totalPoints ?? 0} {isAr ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <LogOut className="h-4 w-4 rtl:rotate-180" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  login();
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md shadow-blue-500/20"
              >
                <LogIn className="h-4 w-4" />
                <span>{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
