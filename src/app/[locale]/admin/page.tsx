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
    { label: isAr ? 'إجمالي الأعضاء' : 'Total Members', value: data.counts.users, icon: Users, href: '/admin/users', token: 'var(--color-accent)' },
    { label: isAr ? 'الفعاليات النشطة' : 'Active Events', value: data.counts.activeEvents, icon: Calendar, href: '/admin/events', token: 'var(--color-highlight)' },
    { label: isAr ? 'إجمالي التسجيلات' : 'Total Registrations', value: data.counts.registrations, icon: CheckSquare, href: '/admin/reports', token: 'var(--color-success)' },
    { label: isAr ? 'الشهادات المتاحة' : 'Available Certificates', value: data.counts.availableCertificates, icon: Award, href: '/admin/operations', token: 'var(--color-warning)' },
  ] : [];

  return (
    <div className="space-y-8">

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
                className="group relative rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-6 shadow-xs hover:shadow-xl hover:border-[var(--color-accent)]/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: card.token, color: 'var(--color-accent-contrast)' }}
                  >
                    <card.icon size={22} />
                  </div>
                  <ArrowUpRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                </div>
                <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{card.label}</p>
                <p className="mt-1 text-3xl font-black text-[var(--color-text-primary)] font-cairo">{card.value.toLocaleString(locale)}</p>
              </Link>
            ))}
          </div>

          {/* Work Queue Section */}
          <section className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                <span>{isAr ? 'قائمة المهام العاجلة' : 'Action Queue'}</span>
              </h2>
              <span className="text-xs text-[var(--color-accent)] font-bold bg-[var(--color-accent-soft)] px-3 py-1 rounded-full">
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
                  className={`flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface-2)]/50 p-4 border transition-all hover:shadow-md ${
                    item.alert ? 'border-[var(--color-warning)]/40 hover:border-[var(--color-warning)]/60' : 'border-[var(--color-border)]/50 hover:border-[var(--color-accent)]/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-[var(--color-text-secondary)]">{item.label}</span>
                  <strong className={`text-base font-black font-mono px-3 py-1 rounded-xl border ${
                    item.alert ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/30' : 'bg-[var(--color-surface-2)] text-[var(--color-accent)] border-[var(--color-border)]/50'
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
                <h2 className="text-xl font-black font-cairo text-[var(--color-text-primary)]">
                  {isAr ? 'الفعاليات الجارية والقادمة' : 'Current & Upcoming Events'}
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {isAr ? 'اضغط على أي فعالية للدخول إلى لوحة إدارة الحضور والتحضير والشهادات.' : 'Click any event to open its check-in and certificate desk.'}
                </p>
              </div>
              <Link
                href="/admin/events/create"
                className="rounded-2xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] hover:opacity-90 px-5 py-2.5 text-xs sm:text-sm font-bold text-[var(--color-accent-contrast)] shadow-md shadow-black/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isAr ? '+ إنشاء فعالية جديدة' : '+ Create New Event'}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.events.map(event => (
                <Link
                  key={event.id}
                  href={'/admin/events/' + event.id}
                  className="group rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-5 shadow-xs hover:shadow-xl hover:border-[var(--color-accent)]/40 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-black text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors text-base font-cairo line-clamp-1">
                      {!isAr && event.titleEn ? event.titleEn : event.title}
                    </h3>
                    <ArrowUpRight size={18} className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-4">
                    <span>{formatAdminDate(event.date, locale)}</span>
                    <span>·</span>
                    <span className="font-bold text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 py-0.5 rounded-lg border border-[var(--color-accent)]/20">
                      {event.state}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--color-border)]/50 text-[var(--color-text-secondary)]">
                    <div>
                      {isAr ? 'المسجلون:' : 'Registered:'} <strong className="text-[var(--color-text-primary)] font-bold">{event.registeredCount || 0}</strong>
                    </div>
                    <div>
                      {isAr ? 'الحضور الفعلي:' : 'Attended:'} <strong className="text-[var(--color-success)] font-bold">{event.attendanceCount || 0}</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!data.events.length && (
              <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-8 text-center text-[var(--color-text-muted)]">
                <p className="text-sm">
                  {isAr ? 'لا توجد فعاليات جارية ضمن هذه القائمة. افتح إدارة الفعاليات لعرض المسودات والأرشيف.' : 'No active events in this view. Open events manager for drafts and archives.'}
                </p>
              </div>
            )}
          </section>

          <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
            {isAr ? 'آخر تحديث للبيانات:' : 'Last updated:'} {formatAdminDate(data.generatedAt, locale)}
          </p>
        </>
      ) : null}
    </div>
  );
}
