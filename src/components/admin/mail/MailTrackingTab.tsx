'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Mail, Paperclip, RefreshCw, Search, Send, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

interface Stats { totalSent: number; sentToday: number; dailyLimit: number; remainingToday: number; totalStudents: number }
interface Delivery { id: string; recipient: string; status: string; attempts: number; lastError?: string }
interface Job {
  id: string; recipient: string; recipientName: string | null; subject: string; status: string; attempts: number;
  createdAt: string; deliveredAt: string | null; nextAttemptAt: string | null; lastError: string | null;
  isReminder: boolean; attachmentCount: number; createdBy: string | null; senderName: string | null;
}
interface Jobs {
  jobs: Job[]; nextBefore: string | null;
  counts: { queue: number; sent: number; problems: number };
  sending: { enabled: boolean; configured: boolean };
}
type Group = 'queue' | 'sent' | 'problems';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md shadow-sm';

export default function MailTrackingTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState<Group>('queue');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Jobs | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageId, setMessageId] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    setError('');
    try { setStats(await apiGet<Stats>('/api/admin/mail/stats')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load mail stats'); }
  }, []);

  const loadJobs = useCallback(async (reset: boolean, before?: string | null) => {
    setLoading(true);
    try {
      const result = await apiGet<Jobs>('/api/admin/mail/jobs', { group, q: search.trim() || undefined, before: before ?? undefined });
      setData(result);
      setJobs(previous => (reset ? result.jobs : [...previous, ...result.jobs]));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load emails'); }
    finally { setLoading(false); }
  }, [group, search]);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadJobs(true); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadJobs]);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageId.trim()) return;
    setBusy(true); setDeliveries(null);
    try { setDeliveries((await apiGet<{ deliveries: Delivery[] }>(`/api/admin/mail/messages/${messageId.trim()}`)).deliveries); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر العثور على الرسالة', 'Message not found'), 'error'); }
    finally { setBusy(false); }
  };

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const statusChip = (status: string) => ({
    PENDING: { label: t('بالانتظار', 'Queued'), cls: 'bg-amber-100 text-amber-700' },
    PROCESSING: { label: t('قيد الإرسال', 'Sending'), cls: 'bg-sky-100 text-sky-700' },
    DELIVERED: { label: t('أُرسلت', 'Sent'), cls: 'bg-emerald-100 text-emerald-700' },
    FAILED: { label: t('فشلت', 'Failed'), cls: 'bg-red-100 text-red-700' },
    REVIEW: { label: t('بحاجة مراجعة', 'Needs review'), cls: 'bg-orange-100 text-orange-700' },
  }[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' });
  const groups: { id: Group; label: string; Icon: typeof Clock; count: number | undefined }[] = [
    { id: 'queue', label: t('قيد الانتظار', 'In queue'), Icon: Clock, count: data?.counts.queue },
    { id: 'sent', label: t('المرسلة', 'Sent'), Icon: CheckCircle2, count: data?.counts.sent },
    { id: 'problems', label: t('مشاكل وفشل', 'Problems'), Icon: AlertTriangle, count: data?.counts.problems },
  ];

  return <div className="space-y-6">
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}<button type="button" className="ms-4 underline" onClick={() => { void loadStats(); void loadJobs(true); }}>{t('إعادة المحاولة', 'Retry')}</button></div>}
    {data && !data.sending.enabled && (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>{t('إرسال البريد متوقف حاليًا: الرسائل في الانتظار لن تُرسل حتى تفعّل الإرسال من الإعدادات ← البريد المرسل.', 'Email sending is switched off: queued emails will not go out until you turn it on in Settings → Email sender.')}</p>
      </div>
    )}
    {data && data.sending.enabled && !data.sending.configured && (
      <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{t('حساب الإرسال غير مكتمل الإعداد.', 'The sender account is not fully configured.')}</div>
    )}
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

    <section className={`${panel} space-y-4 p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map(({ id, label, Icon, count }) => (
          <button key={id} type="button" aria-pressed={group === id} onClick={() => setGroup(id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${group === id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
            <Icon size={14} />{label}<span dir="ltr" className="rounded-full bg-black/10 px-2 py-0.5">{count ?? '…'}</span>
          </button>
        ))}
        <div className="relative min-w-48 flex-1">
          <Search size={15} className="absolute start-3 top-3 text-[var(--color-text-muted)]" />
          <input className={`${input} ps-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ابحث بالمستلم أو العنوان…', 'Search by recipient or subject…')} />
        </div>
        <button type="button" onClick={() => void loadJobs(true)} aria-label={t('تحديث', 'Refresh')} className="rounded-xl bg-[var(--color-surface-2)] p-2.5"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          {loading ? t('جارٍ التحميل…', 'Loading…') : group === 'queue' ? t('لا توجد رسائل في الانتظار.', 'Nothing is waiting in the queue.') : group === 'sent' ? t('لم تُرسل أي رسائل بعد.', 'Nothing has been sent yet.') : t('لا توجد مشاكل.', 'No problems.')}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {jobs.map(job => {
            const chip = statusChip(job.status);
            return (
              <li key={job.id} className="space-y-1.5 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${chip.cls}`}>{chip.label}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{job.subject}</span>
                  {job.attachmentCount > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]"><Paperclip size={12} />{job.attachmentCount}</span>}
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-text-secondary)]">
                  <span>{t('إلى:', 'To:')} <b dir="ltr">{job.recipient}</b>{job.recipientName ? ` (${job.recipientName})` : ''}</span>
                  <span>{t('من:', 'By:')} {job.senderName || (job.createdBy?.startsWith('admin:') ? t('مشرف', 'An admin') : job.isReminder ? t('تذكير تلقائي', 'Automatic reminder') : t('النظام', 'System'))}</span>
                  <span>{t('أُنشئت:', 'Created:')} {fmt(job.createdAt)}</span>
                  {job.deliveredAt && <span>{t('أُرسلت:', 'Delivered:')} {fmt(job.deliveredAt)}</span>}
                  {job.status === 'PENDING' && job.attempts > 0 && <span>{t('المحاولة التالية:', 'Next try:')} {fmt(job.nextAttemptAt)}</span>}
                  {job.attempts > 0 && <span>{t('المحاولات:', 'Attempts:')} {job.attempts}</span>}
                </p>
                {job.lastError && <p className="text-xs text-amber-600">{job.lastError}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {data?.nextBefore && (
        <div className="text-center">
          <button type="button" disabled={loading} onClick={() => void loadJobs(false, data.nextBefore)} className="rounded-xl bg-[var(--color-surface-2)] px-5 py-2 text-xs font-bold disabled:opacity-50">{t('تحميل المزيد', 'Load more')}</button>
        </div>
      )}
    </section>

    <section className={`${panel} space-y-4 p-5 sm:p-7`}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Mail size={18} />{t('تتبع رسالة بمعرّفها', 'Track a message by its ID')}</h2>
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
