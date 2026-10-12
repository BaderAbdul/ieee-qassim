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
    { label: isAr ? 'إجمالي الأعضاء' : 'Total Members', value: data.counts.users, icon: Users, href: '/admin/users', color: 'from-blue-500 to-indigo-600', textLight: 'text-blue-50' },
    { label: isAr ? 'الفعاليات النشطة' : 'Active Events', value: data.counts.activeEvents, icon: Calendar, href: '/admin/events', color: 'from-purple-500 to-violet-600', textLight: 'text-purple-50' },
    { label: isAr ? 'إجمالي التسجيلات' : 'Total Registrations', value: data.counts.registrations, icon: CheckSquare, href: '/admin/reports', color: 'from-emerald-500 to-teal-600', textLight: 'text-emerald-50' },
    { label: isAr ? 'الشهادات المتاحة' : 'Available Certificates', value: data.counts.availableCertificates, icon: Award, href: '/admin/operations', color: 'from-amber-500 to-orange-600', textLight: 'text-amber-50' },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <header className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-white/10">
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-400/30">
                IEEE Qassim · {isAr ? 'مركز العمليات' : 'Command Center'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-cairo text-white pt-1">
              {isAr ? 'ماذا يحتاج انتباهك اليوم؟' : 'What needs attention today?'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {isAr ? 'متابعة حية للفعاليات، المسجلين، الشهادات، ومعرض المشاريع مباشرة من قاعدة البيانات.' : 'Live tracking of events, registrations, certificates, and projects showcase.'}
            </p>
          </div>
          <button 
            type="button" 
            disabled={loading} 
            onClick={refresh} 
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-md border border-white/15 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error ? (
        <AdminError message={error} retry={refresh} />
      ) : loading && !data ? (
        <AdminLoading />
      ) : data ? (
        <>
          {/* Main Stat KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(card => (
              <Link 
                key={card.href + card.label} 
                href={card.href} 
                className="group relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-xl hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon size={22} />
                  </div>
                  <ArrowUpRight size={18} className="text-slate-300 group-hover:text-purple-600 transition-colors" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-900 font-cairo">{card.value.toLocaleString(locale)}</p>
              </Link>
            ))}
          </div>

          {/* Work Queue Section */}
          <section className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black font-cairo text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>{isAr ? 'قائمة المهام العاجلة' : 'Action Queue'}</span>
              </h2>
              <span className="text-xs text-purple-700 font-bold bg-purple-100 px-3 py-1 rounded-full">
                {isAr ? 'تحديث فوري' : 'Live'}
              </span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {[
                { label: isAr ? 'تسجيلات تنتظر الموافقة' : 'Pending Approvals', value: data.counts.pendingRegistrations, href: '/admin/events', alert: data.counts.pendingRegistrations > 0 },
                { label: isAr ? 'شهادات قيد التجهيز / فاشلة' : 'Queued / Failed Certificates', value: data.counts.queuedCertificates + ' / ' + data.counts.failedCertificates, href: '/admin/operations', alert: data.counts.failedCertificates > 0 },
                { label: isAr ? 'بريد فاشل / يحتاج مراجعة' : 'Failed / Review Mail', value: data.notifications.failed + ' / ' + data.notifications.review, href: '/admin/operations', alert: data.notifications.failed > 0 },
              ].map(item => (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  className={`flex items-center justify-between gap-3 rounded-2xl bg-white p-4 border transition-all hover:shadow-md ${
                    item.alert ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-700">{item.label}</span>
                  <strong className={`text-base font-black font-mono px-3 py-1 rounded-xl ${
                    item.alert ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-50 text-purple-700 border border-slate-100'
                  }`}>
                    {item.value}
                  </strong>
                </Link>
              ))}
            </div>
          </section>

          {/* Current & Upcoming Events */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black font-cairo text-slate-900">
                  {isAr ? 'الفعاليات الجارية والقادمة' : 'Current & Upcoming Events'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isAr ? 'اضغط على أي فعالية للدخول إلى لوحة إدارة الحضور والتحضير والشهادات.' : 'Click any event to open its check-in and certificate desk.'}
                </p>
              </div>
              <Link 
                href="/admin/events/create" 
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isAr ? '+ إنشاء فعالية جديدة' : '+ Create New Event'}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.events.map(event => (
                <Link 
                  key={event.id} 
                  href={'/admin/events/' + event.id} 
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-xl hover:border-purple-300 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-black text-slate-900 group-hover:text-purple-600 transition-colors text-base font-cairo line-clamp-1">
                      {!isAr && event.titleEn ? event.titleEn : event.title}
                    </h3>
                    <ArrowUpRight size={18} className="shrink-0 text-slate-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <span>{formatAdminDate(event.date, locale)}</span>
                    <span>·</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                      {event.state}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-600">
                    <div>
                      {isAr ? 'المسجلون:' : 'Registered:'} <strong className="text-slate-900 font-bold">{event.registeredCount || 0}</strong>
                    </div>
                    <div>
                      {isAr ? 'الحضور الفعلي:' : 'Attended:'} <strong className="text-emerald-700 font-bold">{event.attendanceCount || 0}</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!data.events.length && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400">
                <p className="text-sm">
                  {isAr ? 'لا توجد فعاليات جارية ضمن هذه القائمة. افتح إدارة الفعاليات لعرض المسودات والأرشيف.' : 'No active events in this view. Open events manager for drafts and archives.'}
                </p>
              </div>
            )}
          </section>

          <p className="text-[11px] text-slate-400 font-mono">
            {isAr ? 'آخر تحديث للبيانات:' : 'Last updated:'} {formatAdminDate(data.generatedAt, locale)}
          </p>
        </>
      ) : null}
    </div>
  );
}
