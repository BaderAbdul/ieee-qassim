'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Mail, Search, Send, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

interface Stats { totalSent: number; sentToday: number; dailyLimit: number; remainingToday: number; totalStudents: number }
interface Delivery { id: string; recipient: string; status: string; attempts: number; lastError?: string }
const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md shadow-sm';

export default function MailTrackingTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try { setStats(await apiGet<Stats>('/api/admin/mail/stats')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load mail stats'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageId.trim()) return;
    setBusy(true); setDeliveries(null);
    try { setDeliveries((await apiGet<{ deliveries: Delivery[] }>(`/api/admin/mail/messages/${messageId.trim()}`)).deliveries); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر العثور على الرسالة', 'Message not found'), 'error'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}<button type="button" className="ms-4 underline" onClick={() => void load()}>{t('إعادة المحاولة', 'Retry')}</button></div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { label: t('إجمالي الرسائل المرسلة', 'Total emails sent'), value: stats?.totalSent, Icon: TrendingUp, color: 'text-indigo-500' },
        { label: t('المرسلة اليوم', 'Sent today'), value: stats ? `${stats.sentToday} / ${stats.dailyLimit}` : undefined, Icon: Send, color: 'text-sky-500' },
        { label: t('المتبقي اليوم', 'Remaining today'), value: stats?.remainingToday, Icon: CheckCircle2, color: 'text-emerald-500' },
      ].map(({ label, value, Icon, color }) => (
        <div key={label} className={`${panel} flex items-center gap-3.5 p-5`}>
          <div className={`rounded-xl bg-[var(--color-surface-2)] p-3 ${color}`}><Icon size={24} /></div>
          <div><p className="text-xs font-bold text-[var(--color-text-muted)]">{label}</p><p dir="ltr" className="mt-1 text-2xl font-black">{value ?? '…'}</p></div>
        </div>
      ))}
    </div>

    <section className={`${panel} space-y-4 p-5 sm:p-7`}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Mail size={18} />{t('تتبع حالة رسالة', 'Track a message’s status')}</h2>
      <form onSubmit={lookup} className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="absolute start-3 top-3 text-[var(--color-text-muted)]" />
          <input dir="ltr" className={`${input} ps-9`} placeholder={t('معرّف الرسالة', 'Message ID')} value={messageId} onChange={e => setMessageId(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">
          {busy ? t('جارٍ البحث…', 'Looking up…') : t('بحث', 'Look up')}
        </button>
      </form>
      {deliveries && (
        <div className="space-y-2">
          {deliveries.length ? deliveries.map(d => (
            <div key={d.id} className="rounded-xl bg-[var(--color-surface-2)] p-3 text-sm">
              <p dir="ltr">{d.recipient} · {d.status}</p>
              {d.lastError && <p className="mt-1 text-amber-600">{d.lastError}</p>}
            </div>
          )) : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد عمليات تسليم لهذه الرسالة.', 'No deliveries for this message.')}</p>}
        </div>
      )}
    </section>
  </div>;
}
