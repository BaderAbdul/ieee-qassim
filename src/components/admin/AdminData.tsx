'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAdminRole, useAuth } from '@/context/AuthContext';
import { httpsCallable } from '@/lib/backend';
import { RefreshCw } from 'lucide-react';
import { useLocale } from 'next-intl';

export function useAdminQuery<T>(action: string, eventId?: number) {
  const { userData } = useAuth();
  const role = userData?.role;
  const admin = isAdminRole(userData);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    // Any admin-tier account (members too) may ask; the server answers according to its privileges. Never leave the page "loading".
    if (!admin || (action === 'getAuditLog' && role !== 'super_admin')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (userData) setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try { const response = await httpsCallable<unknown, T>(null, action)(eventId ? { eventId } : {}); if (active) setData(response.data); }
      catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'تعذر تحميل البيانات / Unable to load data'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [action, eventId, role, admin, userData, revision]);
  return { data, error, loading, refresh };
}

export function AdminError({ message, retry }: { message: string; retry?: () => void }) {
  const isAr = useLocale() === 'ar';
  return <div role="alert" className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4 text-[var(--color-danger)]"><p>{message}</p>{retry && <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-[var(--color-text-primary)]"><RefreshCw size={16} />{isAr ? 'إعادة المحاولة' : 'Retry'}</button>}</div>;
}
export function AdminLoading() {
  const isAr = useLocale() === 'ar';
  return <p role="status" className="py-12 text-center text-[var(--color-text-muted)]">{isAr ? 'جارٍ تحميل البيانات…' : 'Loading data…'}</p>;
}
export function formatAdminDate(value?: string, locale = 'ar') {
  if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(date);
}
