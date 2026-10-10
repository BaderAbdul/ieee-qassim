'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Calendar, Users, Award, CheckSquare, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { AdminOverview } from '@/lib/adminTypes';
import { AdminError, AdminLoading, formatAdminDate, useAdminQuery } from '@/components/admin/AdminData';

export default function AdminDashboardPage() {
  const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<AdminOverview>('getAdminOverview');
  const cards = data ? [
    { label: isAr ? 'الأعضاء' : 'Members', value: data.counts.users, icon: Users, href: '/admin/users' },
    { label: isAr ? 'الفعاليات النشطة' : 'Active events', value: data.counts.activeEvents, icon: Calendar, href: '/admin/events' },
    { label: isAr ? 'التسجيلات بجميع الحالات' : 'Registrations · all statuses', value: data.counts.registrations, icon: CheckSquare, href: '/admin/reports' },
    { label: isAr ? 'شهادات متاحة' : 'Available certificates', value: data.counts.availableCertificates, icon: Award, href: '/admin/operations' },
  ] : [];
  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold text-purple-600">IEEE Qassim · {isAr ? 'مركز العمل' : 'Command center'}</p><h1 className="mt-1 text-3xl font-black font-cairo text-slate-900">{isAr ? 'ماذا يحتاج انتباهك اليوم؟' : 'What needs attention today?'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'التسجيل والحضور والشهادات في مكان واحد. الأرقام من قاعدة البيانات وليست أرقام الواجهة التسويقية.' : 'Registration, attendance and certificates in one place. These are live database counts, not marketing figures.'}</p></div>
      <button type="button" disabled={loading} onClick={refresh} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 disabled:opacity-50"><RefreshCw size={16} />{isAr ? 'تحديث' : 'Refresh'}</button>
    </header>
    {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <Link key={card.href + card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-300"><card.icon className="mb-4 text-purple-600" size={24} /><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-900">{card.value.toLocaleString(locale)}</p></Link>)}</div>
      <section className="rounded-2xl border border-purple-100 bg-purple-50/70 p-5"><h2 className="text-lg font-bold font-cairo">{isAr ? 'قائمة العمل' : 'Work queue'}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[
        { label: isAr ? 'تسجيلات تنتظر الموافقة' : 'Pending approvals', value: data.counts.pendingRegistrations, href: '/admin/events' },
        { label: isAr ? 'شهادات قيد التجهيز / فاشلة' : 'Queued / failed certificates', value: data.counts.queuedCertificates + ' / ' + data.counts.failedCertificates, href: '/admin/operations' },
        { label: isAr ? 'بريد فاشل / يحتاج مراجعة' : 'Failed / review mail', value: data.notifications.failed + ' / ' + data.notifications.review, href: '/admin/operations' },
      ].map(item => <Link key={item.label} href={item.href} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4"><span className="text-sm font-medium">{item.label}</span><strong className="whitespace-nowrap text-purple-700">{item.value}</strong></Link>)}</div></section>
      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold font-cairo">{isAr ? 'الفعاليات الجارية والقادمة' : 'Current and upcoming events'}</h2><Link href="/admin/events/create" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white">{isAr ? 'إنشاء فعالية' : 'Create event'}</Link></div>
        <div className="grid gap-4 md:grid-cols-2">{data.events.map(event => <Link key={event.id} href={'/admin/events/' + event.id} className="rounded-2xl border bg-white p-5 hover:border-purple-300"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">{!isAr && event.titleEn ? event.titleEn : event.title}</h3><ArrowUpRight size={18} className="shrink-0 text-purple-500" /></div><p className="mt-2 text-xs text-slate-500">{formatAdminDate(event.date, locale)} · {event.state}</p><p className="mt-4 text-sm">{isAr ? 'المسجلون' : 'Registered'}: {event.registeredCount || 0} · {isAr ? 'الحضور' : 'Attended'}: {event.attendanceCount || 0}</p></Link>)}</div>
        {!data.events.length && <p className="rounded-xl border bg-white p-6 text-slate-500">{isAr ? 'لا توجد فعاليات ضمن هذه القائمة. افتح إدارة الفعاليات لعرض المسودات والأرشيف.' : 'No events in this view. Open event management for drafts and archives.'}</p>}
      </section>
      <p className="text-xs text-slate-500">{isAr ? 'آخر تحديث:' : 'Updated:'} {formatAdminDate(data.generatedAt, locale)}</p>
    </> : null}
  </div>;
}
