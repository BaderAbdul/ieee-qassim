'use client';

import { publicOrigin } from '@/lib/siteUrls';
import { toAdminPath, useOnAdminHost } from '@/lib/adminPath';
import { createContext, useContext, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { apiGet } from '@/lib/backend';
import { Link } from '@/i18n/routing';
import { ArrowRight, ExternalLink, Users, CheckCircle2 } from 'lucide-react';
import type { PlatformEvent, EventState } from '@/lib/types';
import { AdminError, AdminLoading } from './AdminData';

const EventContext = createContext<PlatformEvent | null>(null);
export const useAdminEvent = () => useContext(EventContext);
const arabicStates: Record<EventState, string> = {
  Published: 'قريبًا (لم يفتح التسجيل)',
  'Registration Open': 'التسجيل مفتوح',
  'Registration Closed': 'التسجيل مغلق',
  Ongoing: 'جارية',
  Completed: 'مكتملة',
};
export const eventStateLabel = (state: EventState, isAr: boolean) => isAr ? arabicStates[state] || state : state;

const stateBadgeClasses: Record<EventState, string> = {
  Published: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
  'Registration Open': 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  'Registration Closed': 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  Ongoing: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  Completed: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
};

export default function EventWorkspace({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const rawPathname = usePathname();
  const onAdminHost = useOnAdminHost();
  const pathname = toAdminPath(rawPathname, onAdminHost);
  const isAr = useLocale() === 'ar';
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<PlatformEvent>(`/api/admin/events/${encodeURIComponent(id)}`).then(data => {
      if (!active) return;
      setLoading(false); setError(null); setEvent(data);
    }).catch(reason => {
      if (!active) return;
      setLoading(false);
      setError(reason instanceof Error ? reason.message : (isAr ? 'الفعالية غير موجودة أو لم تعد متاحة.' : 'Event not found or no longer available.'));
      setEvent(null);
    });
    return () => { active = false; };
  }, [id, isAr, revision]);

  if (loading) return <AdminLoading />;
  if (error || !event) return <AdminError message={error || 'Event unavailable'} retry={() => { setLoading(true); setRevision(value => value + 1); }} />;

  const base = '/admin/events/' + id;
  const tabs = [
    { path: '', label: isAr ? 'ملخص وتقرير' : 'Summary & report' },
    { path: '/edit', label: isAr ? 'تفاصيل الفعالية' : 'Event details' },
    { path: '/registrations', label: (event.requiresRegistration === false || event.type === 'Booth') ? (isAr ? 'سجل الحضور والزوار' : 'Attendance & Visitors') : (isAr ? 'التسجيلات والحضور' : 'Registrations & Attendance') },
    { path: '/checkin-desk', label: isAr ? 'التحضير' : 'Check-in desk' },
    { path: '/certificates', label: isAr ? 'الشهادات' : 'Certificates' },
    { path: '/feedback', label: isAr ? 'التقييمات' : 'Feedback' },
  ];

  return (
    <EventContext.Provider value={event}>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/70 shadow-sm backdrop-blur-md">
          <div className="p-5 sm:p-6">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              <ArrowRight size={15} className={isAr ? '' : 'rotate-180'} />
              {isAr ? 'جميع الفعاليات' : 'All events'}
            </Link>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-xl font-black font-cairo text-[var(--color-text-primary)] sm:text-2xl">
                    {!isAr && event.titleEn ? event.titleEn : event.title}
                  </h1>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${stateBadgeClasses[event.state]}`}>
                    {eventStateLabel(event.state, isAr)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                    <Users size={13} className="text-[var(--color-text-muted)]" />
                    {isAr ? 'المسجلون' : 'Registered'} <span className="text-[var(--color-text-primary)]">{event.registeredCount || 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                    <CheckCircle2 size={13} className="text-[var(--color-text-muted)]" />
                    {isAr ? 'الحضور' : 'Attended'} <span className="text-[var(--color-text-primary)]">{event.attendanceCount || 0}</span>
                  </span>
                </div>
              </div>
              <a
                href={`${publicOrigin()}/${isAr ? 'ar' : 'en'}/events/${id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              >
                <ExternalLink size={15} />
                {isAr ? 'عرض صفحة الطالب' : 'View student page'}
              </a>
            </div>
          </div>

          <nav
            aria-label={isAr ? 'مساحة عمل الفعالية' : 'Event workspace'}
            className="flex flex-wrap gap-1.5 overflow-x-auto border-t border-[var(--color-border)]/60 bg-[var(--color-surface-2)]/40 px-5 py-3 sm:px-6"
          >
            {tabs.map(tab => {
              const active = tab.path ? pathname.endsWith(base + tab.path) : pathname.endsWith(base);
              return (
                <Link
                  key={tab.path}
                  href={base + tab.path}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {children}
      </div>
    </EventContext.Provider>
  );
}
