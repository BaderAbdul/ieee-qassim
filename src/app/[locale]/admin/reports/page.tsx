'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { AdminOverview } from '@/lib/adminTypes';
import { AdminError, AdminLoading, formatAdminDate, useAdminQuery } from '@/components/admin/AdminData';

export default function AdminReportsPage() {
  const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<AdminOverview>('getAdminOverview');
  return <div className="space-y-6"><header><h1 className="text-3xl font-black font-cairo">{isAr ? 'التقارير التشغيلية' : 'Operational reports'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'إجماليات من قاعدة البيانات. التسجيلات تشمل جميع الحالات، والشهادات المتاحة فقط تُعد مصدرة. تقرير كل فعالية موجود في مساحة عملها.' : 'Database totals. Registrations include all statuses; only available certificates count as issued. Each event has its own report in its workspace.'}</p></header>
    {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        [isAr ? 'الأعضاء' : 'Members', data.counts.users], [isAr ? 'التسجيلات · كل الحالات' : 'Registrations · all statuses', data.counts.registrations],
        [isAr ? 'تسجيلات حضر أصحابها' : 'Attended registrations', data.counts.attendedRegistrations], [isAr ? 'بانتظار الموافقة' : 'Pending approvals', data.counts.pendingRegistrations],
        [isAr ? 'شهادات متاحة' : 'Available certificates', data.counts.availableCertificates], [isAr ? 'شهادات فاشلة' : 'Failed certificates', data.counts.failedCertificates],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-3 text-3xl font-black">{Number(value).toLocaleString(locale)}</dd></div>)}</dl>
      <Link href="/admin/events" className="inline-block rounded-xl bg-purple-600 px-4 py-3 font-bold text-white">{isAr ? 'اختر فعالية لعرض تقريرها' : 'Choose an event for its report'}</Link>
      <p className="text-xs text-slate-500">{isAr ? 'آخر تحديث:' : 'Updated:'} {formatAdminDate(data.generatedAt, locale)}</p>
    </> : null}
  </div>;
}
