'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@/i18n/routing';
import { Bell, Search, Settings, LogOut, CircleUserRound, ChevronDown } from 'lucide-react';
import { useAdminQuery } from '@/components/admin/AdminData';
import type { AdminOverview } from '@/lib/adminTypes';
import AdminSearchModal from '@/components/admin/AdminSearchModal';
import { useAdminTopbarActionsSlot } from '@/components/admin/AdminTopbarActions';

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

export default function AdminTopbar({ pageTitle, hidden }: { pageTitle?: string; hidden?: boolean }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, userData, logout } = useAuth();
  const { data } = useAdminQuery<AdminOverview>('getAdminOverview');
  const pageActions = useAdminTopbarActionsSlot();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useClickOutside(() => setProfileOpen(false));
  const notifRef = useClickOutside(() => setNotifOpen(false));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Only count things that actually need a human to act on them -- not the notification
  // queue's own "pending" (not-yet-sent) backlog, which the delivery worker handles on its own.
  const notifCount = data
    ? data.counts.pendingRegistrations + data.counts.failedCertificates + data.notifications.failed + data.notifications.review
    : 0;

  return (
    <>
      <header className={`sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl px-4 sm:px-6 py-3.5 transition-all duration-300 md:translate-y-0 md:opacity-100 ${hidden ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <h1 className="text-base sm:text-lg font-black font-cairo text-white truncate shrink-0">
          {pageTitle || (isAr ? 'لوحة الإدارة' : 'Admin Portal')}
        </h1>

        {pageActions && (
          <div className="flex flex-wrap items-center gap-2 order-last md:order-none md:mx-auto">
            {pageActions}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="cursor-pointer flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-slate-300 hover:text-white transition-all"
            aria-label={isAr ? 'بحث' : 'Search'}
          >
            <Search size={18} />
            <span className="hidden md:inline text-xs font-bold">{isAr ? 'بحث' : 'Search'}</span>
            <kbd className="hidden md:inline text-[10px] font-mono bg-white/10 border border-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(value => !value)}
              className="cursor-pointer relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
              aria-label={isAr ? 'الإشعارات' : 'Notifications'}
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span dir="ltr" className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold flex items-center justify-center">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute end-0 mt-2 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden z-40">
                <div className="px-4 py-3 border-b border-[var(--color-border)] font-bold text-sm text-[var(--color-text-primary)]">
                  {isAr ? 'الإشعارات' : 'Notifications'}
                </div>
                {data ? (
                  <div className="p-2">
                    {[
                      { label: isAr ? 'تسجيلات تنتظر الموافقة' : 'Pending registrations', value: data.counts.pendingRegistrations },
                      { label: isAr ? 'شهادات فاشلة' : 'Failed certificates', value: data.counts.failedCertificates },
                      { label: isAr ? 'بريد بحاجة مراجعة' : 'Mail needing review', value: data.notifications.review + data.notifications.failed },
                    ].map(row => (
                      <Link
                        key={row.label}
                        href="/admin/operations"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
                      >
                        <span className="text-xs font-bold text-[var(--color-text-secondary)]">{row.label}</span>
                        <span className={`text-sm font-black font-mono ${row.value > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>{row.value}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(value => !value)}
              className="cursor-pointer flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 ps-1.5 pe-2 py-1.5 transition-all"
              aria-label={isAr ? 'حسابي' : 'My account'}
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center">
                  <CircleUserRound size={16} />
                </div>
              )}
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute end-0 mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden z-40">
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{user?.displayName}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
                  {userData?.roleNameAr && (
                    <p className="mt-1 inline-block text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 py-0.5 rounded-full">
                      {isAr ? userData.roleNameAr : userData.roleNameEn}
                    </p>
                  )}
                </div>
                <div className="p-1.5">
                  <Link
                    href="/admin/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text-secondary)] transition-colors"
                  >
                    <CircleUserRound size={16} />
                    {isAr ? 'ملفي الشخصي' : 'My profile'}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text-secondary)] transition-colors"
                  >
                    <CircleUserRound size={16} />
                    {isAr ? 'صفحتي كطالب' : 'My student page'}
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text-secondary)] transition-colors"
                  >
                    <Settings size={16} />
                    {isAr ? 'الإعدادات' : 'Settings'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); void logout(); }}
                    className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-danger-soft)] text-sm font-bold text-[var(--color-danger)] transition-colors"
                  >
                    <LogOut size={16} />
                    {isAr ? 'تسجيل الخروج' : 'Log out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <AdminSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
