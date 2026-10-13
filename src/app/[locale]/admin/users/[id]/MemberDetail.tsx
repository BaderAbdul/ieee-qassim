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

  // Points adjustment modal state
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [pointsAction, setPointsAction] = useState<'add' | 'deduct'>('deduct');
  const [pointsAmount, setPointsAmount] = useState<number | ''>(10);
  const [pointsReason, setPointsReason] = useState('');
  const [pointsSubmitting, setPointsSubmitting] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pointsSuccessMsg, setPointsSuccessMsg] = useState<string | null>(null);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof pointsAmount !== 'number' || pointsAmount <= 0) {
      setPointsError(lang === 0 ? 'يرجى إدخال عدد نقاط موجب أكبر من صفر.' : 'Please enter a positive number of points.');
      return;
    }
    if (!pointsReason.trim()) {
      setPointsError(lang === 0 ? 'يرجى كتابة سبب التعديل (إلزامي للتوثيق).' : 'Please enter an adjustment reason.');
      return;
    }
    const currentBal = Math.max(0, Number(summary?.member.totalPoints) || 0);
    const signedAmount = pointsAction === 'deduct' ? -pointsAmount : pointsAmount;
    if (pointsAction === 'deduct' && pointsAmount > currentBal) {
      setPointsError(lang === 0 ? `الخصم (${pointsAmount}) يتجاوز الرصيد الحالي (${currentBal}).` : `Deduction exceeds current balance (${currentBal}).`);
      return;
    }

    setPointsSubmitting(true);
    setPointsError(null);
    try {
      const res = await httpsCallable<{ studentUid: string; amount: number; reason: string; operationId: string }, { totalPoints: number }>(null, 'addManualPoints')({
        studentUid: id,
        amount: signedAmount,
        reason: pointsReason.trim(),
        operationId: crypto.randomUUID(),
      });
      if (summary) {
        setSummary({
          ...summary,
          member: { ...summary.member, totalPoints: res.data.totalPoints },
        });
      }
      setPointsSuccessMsg(lang === 0 ? `تمت العملية بنجاح! الرصيد الجديد: ${res.data.totalPoints}` : `Success! New balance: ${res.data.totalPoints}`);
      setRevision(v => v + 1);
      setTimeout(() => {
        setIsPointsModalOpen(false);
        setPointsSuccessMsg(null);
        setPointsReason('');
      }, 1200);
    } catch (err) {
      setPointsError(err instanceof Error ? err.message : 'Error adjusting points');
    } finally {
      setPointsSubmitting(false);
    }
  };

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Link href="/admin/users" className="inline-block rounded-xl border px-4 py-2 text-sm mb-2">{lang === 0 ? 'العودة للأعضاء' : 'Back to members'}</Link>
        <h1 className="text-2xl font-bold">{summary?.member.arabicFullName || summary?.member.displayName || (lang === 0 ? 'ملف العضو' : 'Member detail')}</h1>
      </div>
      {summary && !summary.member.isRestricted && (
        <button
          type="button"
          onClick={() => {
            setIsPointsModalOpen(true);
            setPointsAction('deduct');
            setPointsAmount(10);
            setPointsReason('');
            setPointsError(null);
            setPointsSuccessMsg(null);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 shrink-0"
        >
          {lang === 0 ? 'إضافة أو سحب / خصم نقاط' : 'Add or Deduct Points'}
        </button>
      )}
    </div>
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

    {/* Adjust / Deduct Points Modal */}
    {isPointsModalOpen && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold font-cairo text-slate-900">
                {lang === 0 ? 'تعديل نقاط العضو' : 'Adjust Member Points'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {summary?.member.arabicFullName || summary?.member.displayName} ({summary?.member.universityId || summary?.member.email})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPointsModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleAdjustPoints} className="p-6 space-y-4">
            {pointsError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-200">
                {pointsError}
              </div>
            )}
            {pointsSuccessMsg && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-xs font-bold border border-green-200">
                {pointsSuccessMsg}
              </div>
            )}

            {/* Action Type Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === 0 ? 'نوع العملية:' : 'Operation Type:'}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPointsAction('add')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    pointsAction === 'add' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {lang === 0 ? '+ إضافة نقاط' : '+ Add Points'}
                </button>
                <button
                  type="button"
                  onClick={() => setPointsAction('deduct')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    pointsAction === 'deduct' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {lang === 0 ? '- سحب / خصم نقاط' : '- Deduct Points'}
                </button>
              </div>
            </div>

            {/* Points Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 0 ? 'عدد النقاط:' : 'Points Amount:'}
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  {lang === 0 ? 'الرصيد الحالي: ' : 'Current balance: '}
                  <strong className="text-slate-800">{summary?.member.totalPoints || 0}</strong>
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={100000}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value === '' ? '' : Math.abs(parseInt(e.target.value)))}
                placeholder="10"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-base font-bold font-mono"
                dir="ltr"
                required
              />
              {typeof pointsAmount === 'number' && pointsAmount > 0 && summary && (
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 0 ? 'الرصيد بعد العملية: ' : 'New balance after: '}
                  <strong className={pointsAction === 'deduct' ? 'text-rose-600' : 'text-emerald-600'}>
                    {Math.max(0, (summary.member.totalPoints || 0) + (pointsAction === 'deduct' ? -pointsAmount : pointsAmount))}
                  </strong>
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 0 ? 'السبب (إلزامي للتوثيق والتدقيق):' : 'Reason (Required for audit):'}
              </label>
              <textarea
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                placeholder={lang === 0 ? (pointsAction === 'deduct' ? 'مثال: إلغاء نقاط حضور بالخطأ أو مخالفة الشروط' : 'مثال: مساهمة متميزة في تنظيم الفعالية') : 'Reason for adjustment'}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                rows={3}
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsPointsModalOpen(false)}
                disabled={pointsSubmitting}
                className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {lang === 0 ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={pointsSubmitting || !pointsAmount || !pointsReason.trim()}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
                  pointsAction === 'deduct' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {pointsSubmitting
                  ? (lang === 0 ? 'جاري التنفيذ...' : 'Processing...')
                  : pointsAction === 'deduct'
                  ? (lang === 0 ? 'تأكيد الخصم' : 'Confirm Deduction')
                  : (lang === 0 ? 'تأكيد الإضافة' : 'Confirm Addition')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
