'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAdminEvent } from '@/components/admin/EventWorkspace';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';
import type { EventReport } from '@/lib/adminTypes';
import { apiGet, httpsCallable } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { Users, Clock, UserCheck, CheckCircle, Award, XCircle, RefreshCw, Star, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type StatColor = 'purple' | 'amber' | 'blue' | 'slate' | 'emerald' | 'red';
const colorClasses: Record<StatColor, string> = {
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  slate: 'bg-slate-100 text-slate-500',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
};

function StatTile({ label, value, icon: Icon, color, locale }: { label: string; value: number; icon: LucideIcon; color: StatColor; locale: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span>{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900">{value.toLocaleString(locale)}</div>
    </div>
  );
}

interface RejectedCheckin {
  userId: string; userName: string; userEmail?: string; universityId?: string;
  attempts: number; lastAttemptAt: string; code: string; message: string;
}

export default function AdminEventSummaryPage() {
  const event = useAdminEvent(); const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<EventReport>('getEventReport', event?.id);
  const { showToast } = useToast();
  const [rejected, setRejected] = useState<RejectedCheckin[]>([]);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const rejectedCount = data?.counts.rejectedCheckins ?? 0;
  useEffect(() => {
    if (!event?.id || rejectedCount === 0) return;
    let active = true;
    void apiGet<{ attempts: RejectedCheckin[] }>(`/api/admin/events/${event.id}/rejected-checkins`)
      .then(result => { if (active) setRejected(result.attempts); }).catch(() => {});
    return () => { active = false; };
  }, [event?.id, rejectedCount]);

  const recordManually = async (userId: string) => {
    if (!event) return;
    setBusyUser(userId);
    try {
      await httpsCallable(null, 'initiatePendingCheckIn')({ eventId: event.id, targetUserId: userId });
      setRejected(list => list.filter(item => item.userId !== userId));
      showToast(isAr ? 'تم تسجيل حضوره.' : 'Attendance recorded.', 'success');
      refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر تسجيل الحضور.' : 'Could not record attendance.'), 'error');
    } finally { setBusyUser(null); }
  };

  const registrationStats: { label: string; value: number; icon: LucideIcon; color: StatColor }[] = data ? [
    { label: isAr ? 'المسجلون (تسجيل مسبق + زوار) — رقم البطاقة' : 'Registered (pre-registered + walk-ins) — card number', value: data.counts.registrations, icon: Users, color: 'purple' },
    { label: isAr ? 'مسجلون مسبقًا (التسجيل قبل الفعالية)' : 'Pre-registered (before the event)', value: data.counts.registrations - (data.counts.walkIns ?? 0), icon: UserCheck, color: 'blue' },
    { label: isAr ? 'زوار بدون تسجيل مسبق' : 'Walk-ins (no prior registration)', value: data.counts.walkIns ?? 0, icon: Users, color: 'slate' },
    { label: isAr ? 'بانتظار الموافقة' : 'Pending', value: data.counts.pending, icon: Clock, color: 'amber' },
    { label: isAr ? 'مقبول · لم يحضر بعد' : 'Approved · not attended', value: data.counts.approved, icon: UserCheck, color: 'blue' },
    { label: isAr ? 'قائمة الانتظار' : 'Waitlist', value: data.counts.waitlisted, icon: Users, color: 'slate' },
    { label: isAr ? 'الحضور المؤكد' : 'Confirmed attendance', value: data.counts.attended, icon: CheckCircle, color: 'emerald' },
  ] : [];

  const certificateStats: { label: string; value: number; icon: LucideIcon; color: StatColor }[] = data ? [
    { label: isAr ? 'شهادات متاحة' : 'Available certificates', value: data.counts.certificatesAvailable, icon: Award, color: 'emerald' },
    { label: isAr ? 'شهادات قيد التجهيز' : 'Queued certificates', value: data.counts.certificatesQueued, icon: Clock, color: 'blue' },
    { label: isAr ? 'شهادات فاشلة' : 'Failed certificates', value: data.counts.certificatesFailed, icon: XCircle, color: 'red' },
  ] : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black font-cairo text-slate-900">{isAr ? 'تقرير الفعالية' : 'Event report'}</h2>
        <button disabled={loading} onClick={refresh} className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors px-4 py-2 font-bold text-slate-700 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث التقرير' : 'Refresh report'}
        </button>
      </header>

      <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        {isAr ? 'قبل بدء الفعالية: راجع التسجيلات المقبولة، افتح مكتب التحضير واختبر الكاميرا. بعد الانتهاء: راجع الحضور والنقاط ثم أصدر الشهادات.' : 'Before starting: review approved registrations, open the check-in desk and test the camera. After completion: review attendance and points, then issue certificates.'}
      </p>

      {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500">{isAr ? 'التسجيل والحضور' : 'Registration & attendance'}</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {registrationStats.map(stat => <StatTile key={stat.label} {...stat} locale={locale} />)}
          </dl>
        </section>

        {rejectedCount > 0 && (
          <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? `${rejectedCount} طالبًا حاولوا تسجيل الحضور ورُفضت محاولتهم` : `${rejectedCount} people tried to check in and were refused`}
            </h3>
            <p className="text-xs text-amber-800">
              {isAr ? 'عادةً بسبب انتهاء رمز QR أو إغلاق الفعالية أو اشتراط التسجيل. يمكنك تسجيل حضورهم يدويًا (الفعالية يجب أن تكون قيد التنفيذ أو مكتملة).' : 'Usually an expired QR, a closed event or a registration requirement. You can record their attendance manually (the event must be Ongoing or Completed).'}
            </p>
            <ul className="divide-y divide-amber-100 rounded-xl bg-white">
              {rejected.map(item => (
                <li key={item.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{item.userName} <span className="font-normal text-slate-400">{item.universityId ?? ''}</span></p>
                    <p className="truncate text-xs text-slate-500">{item.message} · {item.attempts}×</p>
                  </div>
                  <button type="button" disabled={busyUser === item.userId} onClick={() => void recordManually(item.userId)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {isAr ? 'تسجيل حضوره' : 'Record attendance'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500">{isAr ? 'الشهادات' : 'Certificates'}</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certificateStats.map(stat => <StatTile key={stat.label} {...stat} locale={locale} />)}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-lg shadow-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Star className="w-5 h-5" />{isAr ? 'تقييم المشاركين' : 'Participant feedback'}</h3>
            <p className="mt-2 text-sm text-amber-100">
              {isAr ? 'عدد الردود:' : 'Responses:'} {data.feedback.responses} · {isAr ? 'متوسط التقييم:' : 'Average rating:'} {data.feedback.averageRating === null ? '—' : data.feedback.averageRating.toFixed(1) + ' / 5'}
            </p>
          </div>
          <Link href={`/admin/events/${event?.id}/feedback`} className="shrink-0 bg-white text-amber-700 hover:bg-amber-50 transition-colors px-4 py-2 rounded-xl font-bold text-sm shadow">
            {isAr ? 'عرض الردود' : 'View responses'}
          </Link>
        </section>
      </> : null}
    </div>
  );
}
