'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from '@/lib/backend';
import { AdminError, AdminLoading, formatAdminDate } from '@/components/admin/AdminData';
import type { MemberActivityEntry, MemberActivityResult, MemberActivitySection, MemberOverview } from '@/lib/adminTypes';

const sections: MemberActivitySection[] = ['registrations', 'attendance', 'points', 'certificates'];
const labels = { registrations: ['التسجيلات', 'Registrations'], attendance: ['الحضور', 'Attendance'], points: ['حركة النقاط', 'Points ledger'], certificates: ['الشهادات', 'Certificates'] };
const statuses: Record<string, [string, string]> = { approved: ['مقبول', 'Approved'], pending: ['بانتظار الموافقة', 'Pending'], waitlisted: ['قائمة الانتظار', 'Waitlisted'], rejected: ['مرفوض', 'Rejected'], cancelled: ['ملغي', 'Cancelled'], attended: ['حاضر', 'Attended'], Available: ['متاحة', 'Available'], Generating: ['قيد الإصدار', 'Generating'], Failed: ['فشل الإصدار', 'Failed'], Revoked: ['ملغاة', 'Revoked'] };

export default function MemberDetail({ id }: { id: string }) {
  const locale = useLocale(); const lang = locale === 'ar' ? 0 : 1;
  const { userData, loading: authLoading } = useAuth(); const role = userData?.role;
  const authorized = role === 'super_admin' || role === 'event_organizer';
  const [summary, setSummary] = useState<MemberOverview | null>(null);
  const [section, setSection] = useState<MemberActivitySection>('registrations');
  const [entries, setEntries] = useState<MemberActivityEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null); const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null); const [revision, setRevision] = useState(0);
  const [syncing, setSyncing] = useState(false); const [syncError, setSyncError] = useState<string | null>(null);

  const refreshProjection = async () => {
    if (syncing || !summary || summary.member.isRestricted) return;
    if (!confirm(lang === 0 ? 'تحديث الملف العام من بيانات الحساب الحالية؟ لا يغير هذا نقاط الحساب أو سجلاته.' : 'Refresh the public profile from the current account? This does not change account points or history.')) return;
    setSyncing(true); setSyncError(null);
    try { await httpsCallable(null, 'syncPublicProfile')({ userId: id }); setRevision(value => value + 1); }
    catch (reason) { setSyncError(reason instanceof Error ? reason.message : 'Unable to refresh public profile'); }
    finally { setSyncing(false); }
  };

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    void httpsCallable<unknown, MemberOverview>(null, 'getMemberOverview')({ userId: id }).then(result => { if (active) { setSummary(result.data); setSummaryError(null); } }).catch(reason => { if (active) setSummaryError(reason instanceof Error ? reason.message : 'Unable to load member'); });
    return () => { active = false; };
  }, [id, authorized, revision]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const result = await httpsCallable<unknown, MemberActivityResult>(null, 'getMemberActivity')({ userId: id, section, ...(cursor ? { cursor } : {}) });
        if (active) { setEntries(previous => cursor ? [...previous.filter(item => !result.data.entries.some(next => next.id === item.id)), ...result.data.entries] : result.data.entries); setNextCursor(result.data.nextCursor); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load activity'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [id, section, cursor, authorized, revision]);

  if (authLoading) return <AdminLoading />;
  if (!authorized) return <AdminError message={lang === 0 ? 'غير مصرح بالوصول.' : 'Access denied.'} />;

  return <div className="space-y-6">
    <Link href="/admin/users" className="inline-block rounded-xl border px-4 py-2">{lang === 0 ? 'العودة للأعضاء' : 'Back to members'}</Link>
    <h1 className="text-2xl font-bold">{summary?.member.arabicFullName || summary?.member.displayName || (lang === 0 ? 'ملف العضو' : 'Member detail')}</h1>
    {summaryError && <AdminError message={summaryError} retry={() => setRevision(value => value + 1)} />}
    {summary && <>
      <dl className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        {[[lang === 0 ? 'البريد' : 'Email', summary.member.email], [lang === 0 ? 'الرقم الجامعي' : 'Student ID', summary.member.universityId], [lang === 0 ? 'التخصص' : 'Major', summary.member.major], [lang === 0 ? 'الصلاحية' : 'Role', summary.member.role], [lang === 0 ? 'حالة الحساب' : 'Account', summary.member.isRestricted ? (lang === 0 ? 'مقيّد / مؤرشف' : 'Restricted / archived') : (lang === 0 ? 'نشط' : 'Active')], [lang === 0 ? 'مجموع النقاط الحالي' : 'Current points balance', String(summary.member.totalPoints || 0)]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value || '—'}</dd></div>)}
      </dl>
      <div className={`rounded-xl border p-4 ${summary.publicProjection.exists && summary.publicProjection.matchesBalance ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`} role="status">
        {summary.member.isRestricted
          ? (lang === 0 ? 'الحساب مقيّد: لا يُفترض ظهوره في الملف العام.' : 'Restricted account: its public profile should not be visible.')
          : !summary.publicProjection.exists ? (lang === 0 ? 'الملف العام غير موجود. هذا قد يفسر عدم الظهور في لوحة الشرف.' : 'Public profile is missing. This may explain absence from the leaderboard.')
          : !summary.publicProjection.matchesBalance ? (lang === 0 ? `نقاط الملف العام (${summary.publicProjection.balance}) لا تطابق الحساب. يحتاج مراجعة دون تعديل تلقائي للرصيد.` : `Public balance (${summary.publicProjection.balance}) differs from the account. Review required; no automatic balance changes.`)
          : (lang === 0 ? 'الملف العام موجود ونقاطه متطابقة. الظهور يعتمد أيضًا على نطاق لوحة الشرف وحد عرضها.' : 'Public profile exists and its balance matches. Leaderboard scope and display limits still apply.')}
      </div>
      {syncError && <AdminError message={syncError} />}
      {!summary.member.isRestricted && (!summary.publicProjection.exists || !summary.publicProjection.matchesBalance) && <button type="button" disabled={syncing} onClick={() => void refreshProjection()} className="rounded-xl border border-purple-200 bg-white px-4 py-3 font-bold text-purple-700 disabled:opacity-50">{syncing ? (lang === 0 ? 'جارٍ التحديث…' : 'Refreshing…') : (lang === 0 ? 'تحديث الملف العام من الحساب' : 'Refresh public profile from account')}</button>}
      <p className="text-xs text-slate-500">{lang === 0 ? 'آخر قراءة' : 'Last read'}: {formatAdminDate(summary.generatedAt, locale)}</p>
    </>}
    <nav aria-label={lang === 0 ? 'سجلات العضو' : 'Member activity'} className="flex flex-wrap gap-2">
      {sections.map(key => <button key={key} type="button" aria-pressed={key === section} onClick={() => { if (key !== section) { setLoading(true); setEntries([]); setNextCursor(null); setCursor(null); setSection(key); } }} className={`rounded-xl px-4 py-3 text-sm font-bold ${key === section ? 'bg-purple-600 text-white' : 'border bg-white'}`}>{labels[key][lang]}{summary ? ` (${summary.counts[key]})` : ''}</button>)}
    </nav>
    <p className="text-sm text-slate-500">{lang === 0 ? 'السجلات مرتبة حسب معرّف ثابت، وليست حسب التاريخ؛ يشمل ذلك السجلات القديمة التي بلا تاريخ. لا نعيد حساب الرصيد من هذه الصفحة.' : 'Stable record-ID order, not date order; includes legacy records without dates. This page does not recalculate balances.'}</p>
    {error && <AdminError message={error} retry={() => setRevision(value => value + 1)} />}
    {loading && <AdminLoading />}
    {!loading && !error && entries.length === 0 && <p className="rounded-xl border bg-white p-6 text-slate-500">{lang === 0 ? 'لا توجد سجلات في هذا القسم.' : 'No records in this section.'}</p>}
    <ul className="space-y-3">{entries.map(entry => <li key={entry.id} className="space-y-2 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">{entry.eventTitle || entry.reason || (lang === 0 ? 'حركة نقاط' : 'Points entry')}</p>{entry.status && <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm">{statuses[entry.status]?.[lang] || entry.status}</span>}{entry.amount !== undefined && <span className={entry.amount >= 0 ? 'font-bold text-green-700' : 'font-bold text-red-700'} dir="ltr">{entry.amount > 0 ? '+' : ''}{entry.amount}</span>}</div>
      <p className="text-sm text-slate-500">{formatAdminDate(entry.timestamp || entry.issueDate || entry.createdAt, locale)}</p>
      {entry.balanceBefore !== undefined && entry.balanceAfter !== undefined && <p className="text-sm">{lang === 0 ? 'الرصيد قبل / بعد' : 'Balance before / after'}: {entry.balanceBefore} / {entry.balanceAfter}</p>}
      {(entry.eventId || entry.sourceEventId) && <Link href={`/admin/events/${encodeURIComponent(entry.eventId || entry.sourceEventId!)}`} className="inline-block text-sm font-bold text-purple-700">{lang === 0 ? 'فتح الفعالية' : 'Open event'}</Link>}
    </li>)}</ul>
    {nextCursor && <button disabled={loading} type="button" onClick={() => { setLoading(true); setCursor(nextCursor); }} className="rounded-xl border bg-white px-5 py-3 font-bold disabled:opacity-50">{lang === 0 ? 'تحميل المزيد' : 'Load more'}</button>}
  </div>;
}
