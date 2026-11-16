'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/routing';
import { MoreHorizontal, Sun, Moon, Monitor } from 'lucide-react';
import { useAdminTheme, type AdminThemeMode } from '@/lib/adminTheme';
import type { AdminNavItem } from './useAdminNav';

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

// These get their own bottom-nav slot; this fixed order is what they appear in regardless of
// where they land in navItems/footerItems.
const MAIN_HREFS = ['/admin', '/admin/events', '/admin/mail', '/admin/operations'];
// These live inside the "More" slot's menu instead (along with the theme picker), in this order.
const MORE_HREFS = ['/admin/people', '/admin/settings', '/admin/templates'];

export default function MobileBottomNav({
  navItems,
  footerItems,
  isCurrentPath,
  isAr,
}: {
  navItems: AdminNavItem[];
  footerItems: AdminNavItem[];
  isCurrentPath: (path: string) => boolean;
  isAr: boolean;
}) {
  const { mode, setMode } = useAdminTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useClickOutside(() => setMoreOpen(false));

  const all = [...navItems, ...footerItems];
  const items = MAIN_HREFS
    .map(href => all.find(item => item.href === href))
    .filter((item): item is AdminNavItem => !!item);
  const moreItems = MORE_HREFS
    .map(href => all.find(item => item.href === href))
    .filter((item): item is AdminNavItem => !!item);
  const moreActive = moreItems.some(item => isCurrentPath(item.href));

  const modes: { key: AdminThemeMode; label: string; icon: typeof Sun }[] = [
    { key: 'light', label: isAr ? 'فاتح' : 'Light', icon: Sun },
    { key: 'dark', label: isAr ? 'داكن' : 'Dark', icon: Moon },
    { key: 'system', label: isAr ? 'النظام' : 'System', icon: Monitor },
  ];

  if (!items.length && !moreItems.length) return null;

  return (
    <nav
      aria-label={isAr ? 'التنقل السفلي' : 'Bottom navigation'}
      className="md:hidden fixed inset-x-3 z-40 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = isCurrentPath(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-xs font-bold transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={active ? 'text-[#4DA8DA]' : ''}><Icon size={26} /></span>
              <span className="truncate max-w-[80px]">{item.name}</span>
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <div className="relative flex-1" ref={moreRef}>
            {moreOpen && (
              <div role="menu" className="absolute bottom-full end-1 mb-2 w-60 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-white/10">
                  {isAr ? 'مظهر التطبيق' : 'Appearance'}
                </div>
                <div className="p-2 grid grid-cols-3 gap-1.5 border-b border-white/10">
                  {modes.map(({ key, label, icon: ModeIcon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      aria-pressed={mode === key}
                      className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-bold transition-colors ${
                        mode === key ? 'bg-[#00629B] text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <ModeIcon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="p-1.5">
                  {moreItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <ItemIcon size={16} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMoreOpen(value => !value)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={`flex w-full flex-col items-center justify-center gap-1.5 py-4 text-xs font-bold transition-colors ${
                moreActive || moreOpen ? 'text-white' : 'text-slate-400'
              }`}
            >
              <span className={moreActive ? 'text-[#4DA8DA]' : ''}><MoreHorizontal size={26} /></span>
              <span className="truncate max-w-[80px]">{isAr ? 'المزيد' : 'More'}</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
