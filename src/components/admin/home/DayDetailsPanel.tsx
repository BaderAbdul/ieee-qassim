'use client';

import { differenceInCalendarDays } from 'date-fns';
import { Link } from '@/i18n/routing';
import { CalendarCheck2, TreePalm } from 'lucide-react';
import { vacationInfoFor, type CalendarEvent, type VacationSettings } from './AdminCalendar';

const KIND_STYLE: Record<string, { dot: string; href: (id: number) => string }> = {
  projectDeadline: { dot: 'bg-violet-500', href: id => `/admin/operations/projects/${id}` },
  taskDeadline: { dot: 'bg-amber-500', href: () => '/admin/operations?tab=tasks' },
  event: { dot: 'bg-[var(--color-highlight)]', href: id => `/admin/events/${id}` },
};

function dayWord(n: number, isAr: boolean): string {
  if (!isAr) return n === 1 ? 'day' : 'days';
  return n === 1 ? 'يوم' : n === 2 ? 'يومان' : n <= 10 ? 'أيام' : 'يومًا';
}

/** "Today" / "in 3 days" / "2 days ago" for an item's date, relative to now. */
export function daysLeftLabel(date: string, isAr: boolean, completed?: boolean): { text: string; tone: string } {
  const left = differenceInCalendarDays(new Date(date), new Date());
  if (left === 0) return { text: isAr ? 'اليوم' : 'Today', tone: 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' };
  if (left > 0) {
    const text = isAr
      ? (left === 1 ? 'غدًا' : left === 2 ? 'بعد يومين' : `بعد ${left} ${dayWord(left, true)}`)
      : (left === 1 ? 'Tomorrow' : `In ${left} days`);
    return { text, tone: left <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]' };
  }
  const ago = -left;
  const text = completed
    ? (isAr ? 'مكتملة' : 'Completed')
    : (isAr ? (ago === 1 ? 'أمس' : ago === 2 ? 'منذ يومين' : `منذ ${ago} ${dayWord(ago, true)}`) : (ago === 1 ? 'Yesterday' : `${ago} ${dayWord(ago, false)} ago`));
  return { text, tone: completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500' };
}

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
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--color-text-primary)]">{!isAr && ev.titleEn ? ev.titleEn : ev.title}</span>
                  {ev.date && (() => {
                    const left = daysLeftLabel(ev.date, isAr, ev.completed);
                    return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${left.tone}`}>{left.text}</span>;
                  })()}
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
