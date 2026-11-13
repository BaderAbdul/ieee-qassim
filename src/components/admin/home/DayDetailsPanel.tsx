'use client';

import { Link } from '@/i18n/routing';
import { CalendarCheck2, TreePalm } from 'lucide-react';
import { vacationInfoFor, type CalendarEvent, type VacationSettings } from './AdminCalendar';

const KIND_STYLE: Record<string, { dot: string; href: (id: number) => string }> = {
  projectDeadline: { dot: 'bg-violet-500', href: id => `/admin/operations/projects/${id}` },
  taskDeadline: { dot: 'bg-amber-500', href: () => '/admin/operations?tab=tasks' },
  event: { dot: 'bg-[var(--color-highlight)]', href: id => `/admin/events/${id}` },
};

export default function DayDetailsPanel({ selected, events, isAr, vacation }: {
  selected: Date | null; events: CalendarEvent[]; isAr: boolean; vacation: VacationSettings | null;
}) {
  const dayEvents = selected
    ? events.filter(ev => ev.date && new Date(ev.date).toDateString() === selected.toDateString())
    : [];
  const vacationInfo = selected ? vacationInfoFor(selected, vacation) : { isVacation: false, label: null };

  const label = selected
    ? new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', weekday: 'long' }).format(selected)
    : null;

  return (
    <div className="flex-1 min-h-0 rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-5 shadow-xs flex flex-col">
      <h2 className="text-sm font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2 mb-3 shrink-0">
        <CalendarCheck2 size={16} className="text-[var(--color-accent)]" />
        {label || (isAr ? 'اختر يوماً من التقويم' : 'Pick a day from the calendar')}
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {!selected ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-8">
            {isAr ? 'اضغط على أي يوم لعرض فعالياته ومهامه هنا.' : 'Click any day to see its events and tasks here.'}
          </p>
        ) : (
          <>
            {vacationInfo.isVacation && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700">
                <TreePalm size={14} className="shrink-0" />
                <span className="text-xs font-bold truncate">{vacationInfo.label || (isAr ? 'عطلة' : 'Vacation')}</span>
              </div>
            )}
            {dayEvents.length === 0 && !vacationInfo.isVacation && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-8">
                {isAr ? 'لا توجد فعاليات أو مهام في هذا اليوم' : 'No events or tasks on this day'}
              </p>
            )}
            {dayEvents.map(ev => {
              const style = KIND_STYLE[ev.kind || 'event'];
              return (
                <Link
                  key={`${ev.kind || 'event'}-${ev.id}`}
                  href={style.href(ev.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)]/60 hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{!isAr && ev.titleEn ? ev.titleEn : ev.title}</span>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
