'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { X, Search, Calendar, Activity } from 'lucide-react';
import { httpsCallable } from '@/lib/backend';
import type { AdminEventsPage } from '@/lib/adminTypes';
import { useAdminNav, operationsShortcuts } from '@/components/admin/useAdminNav';

export default function AdminSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { userData } = useAuth();
  const router = useRouter();
  const { navItems, footerItems } = useAdminNav(userData, isAr);
  const [query, setQuery] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  const [events, setEvents] = useState<{ id: number; title: string; titleEn?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the search text when the modal transitions from closed to open (React's recommended
  // "adjust state during render" pattern, instead of an effect that would double-render).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    httpsCallable<unknown, AdminEventsPage>(null, 'getAdminEvents')({})
      .then(({ data }) => setEvents(data.events.map(e => ({ id: e.id, title: e.title, titleEn: e.titleEn }))))
      .catch(() => setEvents([]));
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const matches = useCallback((text?: string) => !q || (text || '').toLowerCase().includes(q), [q]);

  const pageResults = useMemo(
    () => [...navItems, ...footerItems].filter(item => matches(item.name)),
    [navItems, footerItems, matches]
  );
  const eventResults = useMemo(
    () => events.filter(e => matches(e.title) || matches(e.titleEn)).slice(0, 8),
    [events, matches]
  );
  const opsResults = useMemo(
    () => operationsShortcuts(isAr).filter(item => matches(item.name)),
    [isAr, matches]
  );

  if (!open) return null;

  const go = (href: string) => { onClose(); router.push(href); };

  const hasAny = pageResults.length || eventResults.length || opsResults.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh] bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
          <Search size={18} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن صفحة، فعالية، أو عملية…' : 'Search pages, events, or operations…'}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]" aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasAny && (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results'}
            </p>
          )}

          {pageResults.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{isAr ? 'الصفحات' : 'Pages'}</p>
              {pageResults.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.href} type="button" onClick={() => go(item.href)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-start transition-colors">
                    <Icon size={16} />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {eventResults.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{isAr ? 'الفعاليات' : 'Events'}</p>
              {eventResults.map(ev => (
                <button key={ev.id} type="button" onClick={() => go(`/admin/events/${ev.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-start transition-colors">
                  <Calendar size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{!isAr && ev.titleEn ? ev.titleEn : ev.title}</span>
                </button>
              ))}
            </div>
          )}

          {opsResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{isAr ? 'العمليات' : 'Operations'}</p>
              {opsResults.map(item => (
                <button key={item.name} type="button" onClick={() => go(item.href)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] text-start transition-colors">
                  <Activity size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
