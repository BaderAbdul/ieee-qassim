'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAdminEvent } from '@/components/admin/EventWorkspace';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';
import type { EventReport } from '@/lib/adminTypes';

export default function AdminEventSummaryPage() {
  const event = useAdminEvent(); const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<EventReport>('getEventReport', event?.id);
  return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold font-cairo">{isAr ? 'تقرير الفعالية' : 'Event report'}</h2><button disabled={loading} onClick={refresh} className="rounded-xl border bg-white px-4 py-2">{isAr ? 'تحديث التقرير' : 'Refresh report'}</button></header>
    <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{isAr ? 'قبل بدء الفعالية: راجع التسجيلات المقبولة، افتح مكتب التحضير واختبر الكاميرا. بعد الانتهاء: راجع الحضور والنقاط ثم أصدر الشهادات.' : 'Before starting: review approved registrations, open the check-in desk and test the camera. After completion: review attendance and points, then issue certificates.'}</p>
    {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        [isAr ? 'كل التسجيلات' : 'All registrations', data.counts.registrations], [isAr ? 'بانتظار الموافقة' : 'Pending', data.counts.pending],
        [isAr ? 'مقبول · لم يحضر بعد' : 'Approved · not attended', data.counts.approved], [isAr ? 'قائمة الانتظار' : 'Waitlist', data.counts.waitlisted],
        [isAr ? 'الحضور المؤكد' : 'Confirmed attendance', data.counts.attended], [isAr ? 'شهادات متاحة' : 'Available certificates', data.counts.certificatesAvailable],
        [isAr ? 'شهادات قيد التجهيز' : 'Queued certificates', data.counts.certificatesQueued], [isAr ? 'شهادات فاشلة' : 'Failed certificates', data.counts.certificatesFailed],
      ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-2 text-3xl font-black">{Number(value).toLocaleString(locale)}</dd></div>)}</dl>
      <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">{isAr ? 'تقييم المشاركين' : 'Participant feedback'}</h3><p className="mt-3 text-sm">{isAr ? 'عدد الردود:' : 'Responses:'} {data.feedback.responses} · {isAr ? 'متوسط التقييم:' : 'Average rating:'} {data.feedback.averageRating === null ? '—' : data.feedback.averageRating.toFixed(1) + ' / 5'}</p><Link href={`/admin/events/${event?.id}/feedback`} className="mt-3 inline-block text-sm font-bold text-purple-600">{isAr ? 'عرض الردود' : 'View responses'}</Link></section>
    </> : null}
  </div>;
}
