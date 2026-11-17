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

const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/70 backdrop-blur-md shadow-sm';

type StatColor = 'accent' | 'warning' | 'muted' | 'success' | 'danger';
const colorClasses: Record<StatColor, string> = {
  accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  muted: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
};

function StatTile({ label, value, icon: Icon, color, locale }: { label: string; value: number; icon: LucideIcon; color: StatColor; locale: string }) {
  return (
    <div className={`${panel} p-3.5 sm:p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-bold text-[var(--color-text-secondary)] sm:text-sm">{label}</span>
      </div>
      <div className="text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">{value.toLocaleString(locale)}</div>
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
    { label: isAr ? 'المسجلون (تسجيل مسبق + زوار) — رقم البطاقة' : 'Registered (pre-registered + walk-ins) — card number', value: data.counts.registrations, icon: Users, color: 'accent' },
    { label: isAr ? 'مسجلون مسبقًا (التسجيل قبل الفعالية)' : 'Pre-registered (before the event)', value: data.counts.registrations - (data.counts.walkIns ?? 0), icon: UserCheck, color: 'muted' },
    { label: isAr ? 'زوار بدون تسجيل مسبق' : 'Walk-ins (no prior registration)', value: data.counts.walkIns ?? 0, icon: Users, color: 'muted' },
    { label: isAr ? 'بانتظار الموافقة' : 'Pending', value: data.counts.pending, icon: Clock, color: 'warning' },
    { label: isAr ? 'مقبول · لم يحضر بعد' : 'Approved · not attended', value: data.counts.approved, icon: UserCheck, color: 'accent' },
    { label: isAr ? 'قائمة الانتظار' : 'Waitlist', value: data.counts.waitlisted, icon: Users, color: 'muted' },
    { label: isAr ? 'الحضور المؤكد' : 'Confirmed attendance', value: data.counts.attended, icon: CheckCircle, color: 'success' },
  ] : [];

  const certificateStats: { label: string; value: number; icon: LucideIcon; color: StatColor }[] = data ? [
    { label: isAr ? 'شهادات متاحة' : 'Available certificates', value: data.counts.certificatesAvailable, icon: Award, color: 'success' },
    { label: isAr ? 'شهادات قيد التجهيز' : 'Queued certificates', value: data.counts.certificatesQueued, icon: Clock, color: 'accent' },
    { label: isAr ? 'شهادات فاشلة' : 'Failed certificates', value: data.counts.certificatesFailed, icon: XCircle, color: 'danger' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black font-cairo text-[var(--color-text-primary)]">{isAr ? 'تقرير الفعالية' : 'Event report'}</h2>
        <button
          type="button"
          disabled={loading}
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث التقرير' : 'Refresh report'}
        </button>
      </div>

      <p className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-4 text-sm text-[var(--color-text-secondary)]">
        {isAr ? 'قبل بدء الفعالية: راجع التسجيلات المقبولة، افتح مكتب التحضير واختبر الكاميرا. بعد الانتهاء: راجع الحضور والنقاط ثم أصدر الشهادات.' : 'Before starting: review approved registrations, open the check-in desk and test the camera. After completion: review attendance and points, then issue certificates.'}
      </p>

      {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text-muted)]">{isAr ? 'التسجيل والحضور' : 'Registration & attendance'}</h3>
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {registrationStats.map(stat => <StatTile key={stat.label} {...stat} locale={locale} />)}
          </dl>
        </section>

        {rejectedCount > 0 && (
          <section className={`${panel} space-y-3 !border-[var(--color-warning)]/25 p-5`}>
            <h3 className="flex items-center gap-2 font-bold text-[var(--color-warning)]">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? `${rejectedCount} طالبًا حاولوا تسجيل الحضور ورُفضت محاولتهم` : `${rejectedCount} people tried to check in and were refused`}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {isAr ? 'عادةً بسبب انتهاء رمز QR أو إغلاق الفعالية أو اشتراط التسجيل. يمكنك تسجيل حضورهم يدويًا (الفعالية يجب أن تكون قيد التنفيذ أو مكتملة).' : 'Usually an expired QR, a closed event or a registration requirement. You can record their attendance manually (the event must be Ongoing or Completed).'}
            </p>
            <ul className="divide-y divide-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
              {rejected.map(item => (
                <li key={item.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-text-primary)]">{item.userName} <span className="font-normal text-[var(--color-text-muted)]">{item.universityId ?? ''}</span></p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">{item.message} · {item.attempts}×</p>
                  </div>
                  <button type="button" disabled={busyUser === item.userId} onClick={() => void recordManually(item.userId)}
                          className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-xs font-bold text-[var(--color-page)] disabled:opacity-50">
                    {isAr ? 'تسجيل حضوره' : 'Record attendance'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text-muted)]">{isAr ? 'الشهادات' : 'Certificates'}</h3>
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {certificateStats.map(stat => <StatTile key={stat.label} {...stat} locale={locale} />)}
          </dl>
        </section>

        <section className={`${panel} flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center`}>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]"><Star className="h-5 w-5 text-[var(--color-highlight)]" />{isAr ? 'تقييم المشاركين' : 'Participant feedback'}</h3>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              {isAr ? 'عدد الردود:' : 'Responses:'} {data.feedback.responses} · {isAr ? 'متوسط التقييم:' : 'Average rating:'} {data.feedback.averageRating === null ? '—' : data.feedback.averageRating.toFixed(1) + ' / 5'}
            </p>
          </div>
          <Link href={`/admin/events/${event?.id}/feedback`} className="shrink-0 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-contrast)] transition-opacity hover:opacity-90">
            {isAr ? 'عرض الردود' : 'View responses'}
          </Link>
        </section>
      </> : null}
    </div>
  );
}
