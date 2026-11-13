'use client';

import { Link } from '@/i18n/routing';
import { ArrowUpRight, CalendarX2 } from 'lucide-react';
import type { EventState } from '@/lib/types';
import type { AdminEventSummary } from '@/lib/adminTypes';
import { formatAdminDate } from '@/components/admin/AdminData';
import { eventStateLabel } from '@/components/admin/EventWorkspace';
import { stateBadgeColors } from '@/components/admin/events/EventCard';

const OPEN_OR_PROCESSING: EventState[] = ['Published', 'Registration Open', 'Registration Closed', 'Ongoing'];

export default function HomeEventsTable({ events, locale, isAr }: { events: AdminEventSummary[]; locale: string; isAr: boolean }) {
  const rows = events
    .filter(e => OPEN_OR_PROCESSING.includes(e.state))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 10);

  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]/50">
        <h2 className="text-base font-black font-cairo text-[var(--color-text-primary)]">
          {isAr ? 'الفعاليات المفتوحة وقيد التجهيز' : 'Open & processing events'}
        </h2>
        <Link href="/admin/events" className="text-xs font-bold text-[var(--color-accent)] hover:opacity-80 flex items-center gap-1">
          {isAr ? 'عرض الكل' : 'View all'}
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <CalendarX2 className="mx-auto mb-2" size={28} />
          <p className="text-sm">{isAr ? 'لا توجد فعاليات مفتوحة أو قيد التجهيز حالياً' : 'No open or processing events right now'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]/50">
                <th className="text-start font-bold px-5 py-2.5">{isAr ? 'الفعالية' : 'Event'}</th>
                <th className="text-start font-bold px-5 py-2.5">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="text-start font-bold px-5 py-2.5">{isAr ? 'الحالة' : 'State'}</th>
                <th className="text-start font-bold px-5 py-2.5">{isAr ? 'المسجلون' : 'Registered'}</th>
                <th className="text-start font-bold px-5 py-2.5">{isAr ? 'الحضور' : 'Attended'}</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(ev => {
                const colors = stateBadgeColors[ev.state];
                return (
                  <tr key={ev.id} className="border-b border-[var(--color-border)]/30 last:border-0 hover:bg-[var(--color-surface-2)]/40 transition-colors">
                    <td className="px-5 py-3 font-bold text-[var(--color-text-primary)] max-w-[220px] truncate">
                      {!isAr && ev.titleEn ? ev.titleEn : ev.title}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">{formatAdminDate(ev.date, locale)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {eventStateLabel(ev.state, isAr)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)] font-mono">{ev.registeredCount ?? 0}</td>
                    <td className="px-5 py-3 text-[var(--color-success)] font-mono">{ev.attendanceCount ?? 0}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/events/${ev.id}`} className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
