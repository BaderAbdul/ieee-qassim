'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Settings as SettingsIcon, Sun, Moon, Monitor } from 'lucide-react';
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

// Only these sections get a bottom-nav slot (People/Structure and Templates stay sidebar/desktop-only);
// this fixed order is what they appear in regardless of where they land in navItems/footerItems.
const MOBILE_HREFS = ['/admin', '/admin/events', '/admin/mail', '/admin/operations', '/admin/settings'];

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
  const { mode, isDark, setMode } = useAdminTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useClickOutside(() => setThemeOpen(false));

  const all = [...navItems, ...footerItems];
  const items = MOBILE_HREFS
    .map(href => all.find(item => item.href === href))
    .filter((item): item is AdminNavItem => !!item);

  const modes: { key: AdminThemeMode; label: string; icon: typeof Sun }[] = [
    { key: 'light', label: isAr ? 'فاتح' : 'Light', icon: Sun },
    { key: 'dark', label: isAr ? 'داكن' : 'Dark', icon: Moon },
    { key: 'system', label: isAr ? 'النظام' : 'System', icon: Monitor },
  ];

  if (!items.length) return null;

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

          if (item.href === '/admin/settings') {
            const ThemeIcon = isDark ? Moon : Sun;
            return (
              <div key={item.href} className="relative flex-1" ref={themeRef}>
                {themeOpen && (
                  <div role="menu" className="absolute bottom-full end-1 mb-2 w-60 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-white/10">
                      {isAr ? 'مظهر التطبيق' : 'Appearance'}
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-1.5">
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
                    <Link
                      href={item.href}
                      onClick={() => setThemeOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 border-t border-white/10 text-sm font-bold text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <SettingsIcon size={16} />
                      {isAr ? 'كل الإعدادات' : 'All settings'}
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setThemeOpen(value => !value)}
                  aria-haspopup="menu"
                  aria-expanded={themeOpen}
                  className={`flex w-full flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                    active || themeOpen ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <ThemeIcon size={21} className={active ? 'text-[#4DA8DA]' : ''} />
                  <span className="truncate max-w-[72px]">{item.name}</span>
                </button>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={active ? 'text-[#4DA8DA]' : ''}><Icon size={21} /></span>
              <span className="truncate max-w-[72px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
