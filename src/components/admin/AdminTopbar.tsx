'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@/i18n/routing';
import { Bell, Search, Settings, LogOut, CircleUserRound, ChevronDown } from 'lucide-react';
import { useAdminQuery } from '@/components/admin/AdminData';
import type { AdminOverview } from '@/lib/adminTypes';
import AdminSearchModal from '@/components/admin/AdminSearchModal';

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

export default function AdminTopbar({ pageTitle }: { pageTitle?: string }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, userData, logout } = useAuth();
  const { data } = useAdminQuery<AdminOverview>('getAdminOverview');
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

  const notifCount = data ? data.notifications.pending + data.notifications.failed + data.notifications.review : 0;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 bg-[var(--color-surface)]/70 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5">
        <h1 className="text-base sm:text-lg font-black font-cairo text-[var(--color-text-primary)] truncate">
          {pageTitle || (isAr ? 'لوحة الإدارة' : 'Admin Portal')}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-2)]/60 hover:bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-text-secondary)] transition-colors"
            aria-label={isAr ? 'بحث' : 'Search'}
          >
            <Search size={18} />
            <span className="hidden md:inline text-xs font-bold">{isAr ? 'بحث' : 'Search'}</span>
            <kbd className="hidden md:inline text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(value => !value)}
              className="relative p-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-2)]/60 hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition-colors"
              aria-label={isAr ? 'الإشعارات' : 'Notifications'}
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold flex items-center justify-center">
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
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-2)]/60 hover:bg-[var(--color-surface-2)] ps-1.5 pe-2.5 py-1.5 transition-colors"
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
              <span className="hidden sm:inline text-xs font-bold text-[var(--color-text-primary)] max-w-[120px] truncate">
                {user?.displayName || (isAr ? 'حسابي' : 'Account')}
              </span>
              <ChevronDown size={14} className="hidden sm:inline text-[var(--color-text-muted)]" />
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
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text-secondary)] transition-colors"
                  >
                    <CircleUserRound size={16} />
                    {isAr ? 'صفحتي' : 'My page'}
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
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-danger-soft)] text-sm font-bold text-[var(--color-danger)] transition-colors"
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
