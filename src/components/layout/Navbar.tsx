'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
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
  Sparkles,
  Users
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
    { href: '/structure', label: t('structure'), icon: Users },
    ...(user ? [
      { href: '/profile', label: t('profile'), icon: UserCircle },
    ] : []),
    ...(userData?.role === 'super_admin' || userData?.role === 'event_organizer' ? [
      { href: '/admin', label: t('admin'), icon: ShieldCheck, isAdmin: true }
    ] : []),
  ];

  const getFirstAndLastName = (fullName?: string, fallback?: string | null) => {
    return fullName || fallback || 'Student';
  };

  const displayName = getFirstAndLastName(userData?.arabicFullName, user?.displayName);

  const isHomePage = pathname === '/' || pathname === '/ar' || pathname === '/en' || pathname === '';
  const navbarBg = (isScrolled || !isHomePage)
    ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm' 
    : 'bg-transparent';

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${navbarBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-28 h-10 sm:w-36 sm:h-12 flex-shrink-0">
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 flex-1 justify-center px-4">
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
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
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

            {/* Desktop Auth Session */}
            {user ? (
              <div className="hidden md:flex items-center gap-2 ps-2 border-s border-gray-200">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2.5 p-1 pe-3 rounded-full hover:bg-slate-100/70 transition-colors"
                  title={displayName}
                >
                  <div className="h-8 w-8 relative rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden border border-blue-200 shadow-xs">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt={displayName} fill sizes="32px" className="object-cover" />
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
              </div>
            ) : (
              <button
                onClick={login}
                className="hidden md:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <LogIn className="h-4 w-4" />
                <span>{t('login')}</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top duration-200">
          
          {/* User Profile Card (if logged in) */}
          {user ? (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <Link 
                href="/profile" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="h-10 w-10 relative rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden border border-blue-200 flex-shrink-0 shadow-xs">
                  {user.photoURL ? (
                    <Image src={user.photoURL} alt={displayName} fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="text-base">{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col text-start min-w-0">
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-blue-600 font-bold">
                    {userData?.totalPoints ?? 0} {isAr ? 'نقطة معتمدة' : 'points'}
                  </span>
                </div>
              </Link>
              
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title={isAr ? 'تسجيل الخروج' : 'Logout'}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { login(); setIsOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold shadow-md shadow-blue-500/20 transition-all text-sm"
            >
              <LogIn className="h-5 w-5" />
              <span>{t('login')}</span>
            </button>
          )}

          {/* Navigation Items */}
          <div className="space-y-1 pt-1">
            {navLinks.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    active 
                      ? 'bg-blue-50 text-blue-700' 
                      : item.isAdmin
                        ? 'text-purple-600 bg-purple-50/50'
                        : 'text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>
      )}
    </header>
  );
}
