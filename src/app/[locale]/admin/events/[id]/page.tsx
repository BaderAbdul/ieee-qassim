'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAdminEvent } from '@/components/admin/EventWorkspace';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';
import type { EventReport } from '@/lib/adminTypes';
import { Users, Clock, UserCheck, CheckCircle, Award, XCircle, RefreshCw, Star } from 'lucide-react';
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

export default function AdminEventSummaryPage() {
  const event = useAdminEvent(); const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<EventReport>('getEventReport', event?.id);

  const registrationStats: { label: string; value: number; icon: LucideIcon; color: StatColor }[] = data ? [
    { label: isAr ? 'كل التسجيلات' : 'All registrations', value: data.counts.registrations, icon: Users, color: 'purple' },
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
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {registrationStats.map(stat => <StatTile key={stat.label} {...stat} locale={locale} />)}
          </dl>
        </section>

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
