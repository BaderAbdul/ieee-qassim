'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Calendar, Trophy, UserCircle, Globe, ShieldCheck, LogIn, Home, Users, Menu, X, HelpCircle, Lightbulb, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const isAr = useLocale() === 'ar';
  const pathname = usePathname();
  const { user, userData, loading, login } = useAuth();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const moreRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isMoreOpen = openPath === pathname;

  useEffect(() => {
    if (!isMoreOpen) return;
    const outside = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setOpenPath(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPath(null);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [isMoreOpen]);

  if (pathname.startsWith('/admin')) return null;

  const isActive = (path: string) => path === '/' ? pathname === '/' || pathname === '' : pathname === path || pathname.startsWith(`${path}/`);
  const mainLinks = [
    { href: '/', label: t('home'), icon: Home },
    { href: '/events', label: t('events'), icon: Calendar },
    { href: '/leaderboard', label: t('leaderboard'), icon: Trophy },
  ];
  const accountLabel = isAr ? 'حسابي' : 'My account';
  const canAdmin = userData?.role === 'super_admin' || userData?.role === 'event_organizer';
  const signIn = async () => {
    if (loading || isSigningIn) return;
    setIsSigningIn(true);
    setLoginError('');
    try { await login(); }
    catch { setLoginError(isAr ? 'تعذر تسجيل الدخول. حاول مرة أخرى.' : 'Sign-in failed. Please try again.'); }
    finally { setIsSigningIn(false); }
  };
  const accountClasses = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors';

  return (
    <>
      <header data-public-navigation className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={isAr ? 'IEEE القصيم — الرئيسية' : 'IEEE Qassim — home'} className="flex min-h-11 shrink-0 items-center rounded-lg">
            <div className="relative h-10 w-20 sm:w-28">
              <Image src="/logo.png" alt="IEEE Qassim" fill sizes="112px" className="object-contain" priority />
            </div>
          </Link>

          <nav aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'} className="hidden min-w-0 items-center gap-1 lg:flex">
            {mainLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`${accountClasses} ${isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                <Icon aria-hidden="true" className="h-4 w-4" /><span>{label}</span>
              </Link>
            ))}
            {user ? <Link href="/profile" aria-current={isActive('/profile') ? 'page' : undefined} className={`${accountClasses} ${isActive('/profile') ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}><UserCircle aria-hidden="true" className="h-4 w-4" />{accountLabel}</Link> : null}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!user ? (
              <button type="button" onClick={() => void signIn()} disabled={loading || isSigningIn} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:px-3 sm:text-sm">
                <LogIn aria-hidden="true" className="h-4 w-4" /><span>{isSigningIn ? (isAr ? 'جارٍ الدخول…' : 'Signing in…') : t('login')}</span>
              </button>
            ) : <Link href="/profile" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:text-sm lg:hidden"><UserCircle aria-hidden="true" className="h-5 w-5" /><span>{accountLabel}</span></Link>}

            <div ref={moreRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null); }}>
              <button ref={toggleRef} type="button" aria-expanded={isMoreOpen} aria-controls="more-navigation" onClick={() => setOpenPath(isMoreOpen ? null : pathname)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:text-sm">
                {isMoreOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5 lg:hidden" />}
                <span>{isAr ? 'المزيد' : 'More'}</span><ChevronDown aria-hidden="true" className="hidden h-4 w-4 lg:block" />
              </button>
              {isMoreOpen ? (
                <nav id="more-navigation" aria-label={isAr ? 'روابط إضافية' : 'More navigation'} className="absolute end-0 top-[calc(100%_+_0.5rem)] w-64 max-w-[calc(100vw_-_2rem)] max-h-[calc(100dvh_-_6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link href="/structure" onClick={() => setOpenPath(null)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Users aria-hidden="true" className="h-5 w-5" />{isAr ? 'فريق النادي' : 'Club team'}</Link>
                  {canAdmin ? <Link href="/admin" onClick={() => setOpenPath(null)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"><ShieldCheck aria-hidden="true" className="h-5 w-5" />{t('admin')}</Link> : null}
                  <Link href="/help" onClick={() => setOpenPath(null)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><HelpCircle aria-hidden="true" className="h-5 w-5" />{isAr ? 'المساعدة والتواصل' : 'Help and contact'}</Link>
                  {user && !userData?.isRestricted ? <button type="button" onClick={() => { setOpenPath(null); toggleRef.current?.focus(); window.dispatchEvent(new CustomEvent('ieee-open-suggestion')); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-slate-700 hover:bg-slate-50"><Lightbulb aria-hidden="true" className="h-5 w-5 text-amber-600" />{isAr ? 'شاركنا اقتراحك' : 'Share a suggestion'}</button> : null}
                  <Link href={pathname || '/'} locale={isAr ? 'en' : 'ar'} onClick={() => setOpenPath(null)} className="mt-1 flex min-h-11 items-center gap-3 rounded-xl border-t border-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Globe aria-hidden="true" className="h-5 w-5" /><span lang={isAr ? 'en' : 'ar'}>{isAr ? 'English' : 'العربية'}</span></Link>
                </nav>
              ) : null}
            </div>
          </div>
        </div>
        {loginError ? <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm text-red-800">{loginError}</p> : null}
      </header>

      <nav aria-label={isAr ? 'التنقل الرئيسي للجوال' : 'Mobile main navigation'} className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur-md lg:hidden" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {mainLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold ${isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="max-w-full break-words text-center leading-tight">{label}</span></Link>
          ))}
          {user ? <Link href="/profile" aria-current={isActive('/profile') ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold ${isActive('/profile') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><UserCircle aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="max-w-full break-words text-center leading-tight">{accountLabel}</span></Link> : <button type="button" onClick={() => void signIn()} disabled={loading || isSigningIn} className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><UserCircle aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="max-w-full break-words text-center leading-tight">{accountLabel}</span></button>}
        </div>
      </nav>
    </>
  );
}
