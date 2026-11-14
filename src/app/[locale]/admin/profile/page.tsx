'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Award, Briefcase, Calendar, CheckCircle2, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/backend';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileSettingsPanel from '@/components/profile/ProfileSettingsPanel';

interface Registration {
  eventId: number | string; status: string; registeredAt: string | null; attendedAt: string | null;
  event: { id: number | string; title: string; titleEn?: string; date?: string; type?: string } | null;
}
interface PointRow { id: string | number; amount: number; reason: string; source?: string; createdAt: string }
interface Overview {
  registrations: Registration[];
  certificates: { id: string; status: string }[];
  pointTransactions: PointRow[];
  totalPoints: number;
  rank: number | null;
  adminPoints?: number;
  adminPointTransactions?: PointRow[];
}

type Tab = 'events' | 'student' | 'admin';

/**
 * The staff member's own profile, inside the admin panel. It reads and writes the very same account
 * record as the student-facing /profile page, so whatever is changed here shows up there too.
 */
export default function AdminProfilePage() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { user, userData, retry } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('events');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await apiGet<Overview>('/api/me/overview')); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر تحميل الملف الشخصي.', 'Could not load the profile.')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <AdminError message={error} retry={() => void load()} />;
  if (!user || !data) return <AdminLoading />;

  const attended = data.registrations.filter(item => item.status === 'attended' && item.event);
  const stats = [
    { label: t('نقاط الطلاب', 'Student points'), value: userData?.totalPoints ?? data.totalPoints, Icon: Trophy, tone: 'from-amber-500 to-yellow-400' },
    { label: t('النقاط الإدارية', 'Administrative points'), value: data.adminPoints ?? userData?.adminPoints ?? 0, Icon: Briefcase, tone: 'from-slate-700 to-slate-500' },
    { label: t('الفعاليات التي حضرتها', 'Events attended'), value: attended.length, Icon: Calendar, tone: 'from-emerald-500 to-teal-500' },
    { label: t('الترتيب بين الطلاب', 'Student rank'), value: data.rank ? `#${data.rank}` : '#-', Icon: Sparkles, tone: 'from-blue-600 to-indigo-500' },
    { label: t('الشهادات', 'Certificates'), value: data.certificates.filter(cert => cert.status === 'Available').length, Icon: Award, tone: 'from-purple-600 to-pink-500' },
  ];
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'events', label: t('الفعاليات', 'Events'), count: attended.length },
    { id: 'student', label: t('نقاط الطلاب', 'Student points'), count: data.pointTransactions.length },
    { id: 'admin', label: t('النقاط الإدارية', 'Administrative points'), count: data.adminPointTransactions?.length ?? 0 },
  ];
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'medium' }) : '—');
  const ledger = (rows: PointRow[], empty: string) => rows.length === 0
    ? <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-text-muted)]">{empty}</p>
    : (
      <ul className="space-y-2">
        {rows.map(row => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{row.reason}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">{fmt(row.createdAt)}</p>
            </div>
            <span className={`font-cairo text-xl font-black ${row.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.amount > 0 ? '+' : ''}{row.amount}</span>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHero user={user} userData={userData} isAr={isAr} onEdit={() => setEditing(true)} />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map(({ label, value, Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr text-white shadow-sm ${tone}`}><Icon size={20} /></span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold text-[var(--color-text-secondary)]">{label}</span>
              <span className="font-cairo text-2xl font-black text-[var(--color-text-primary)]">{value}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map(item => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${tab === item.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
              {item.label} <span className="opacity-70">({item.count})</span>
            </button>
          ))}
        </div>

        {tab === 'events' && (attended.length === 0
          ? <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-text-muted)]">{t('لم تحضر أي فعالية بعد.', 'You have not attended an event yet.')}</p>
          : (
            <ul className="space-y-2">
              {attended.map(item => (
                <li key={String(item.eventId)} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{!isAr && item.event?.titleEn ? item.event.titleEn : item.event?.title}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{fmt(item.event?.date)}{item.event?.type ? ` · ${item.event.type}` : ''}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{t('حضرت', 'Attended')} · {fmt(item.attendedAt)}</span>
                </li>
              ))}
            </ul>
          ))}
        {tab === 'student' && ledger(data.pointTransactions, t('لا توجد عمليات نقاط بعد.', 'No point transactions yet.'))}
        {tab === 'admin' && ledger(data.adminPointTransactions ?? [], t('لا توجد نقاط إدارية بعد.', 'No administrative points yet.'))}
      </section>

      {editing && <ProfileSettingsPanel userData={userData} isAr={isAr} onClose={() => setEditing(false)} onSaved={() => { retry(); void load(); }} />}
    </div>
  );
}
