'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, format, differenceInCalendarWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useAdminQuery } from '@/components/admin/AdminData';

export interface CalendarEvent {
  id: number;
  title: string;
  titleEn?: string;
  date?: string;
}

interface AcademicTerm { startDate: string | null; endDate: string | null }

export default function AdminCalendar({
  events, isAr, selected, onSelectDay,
}: {
  events: CalendarEvent[];
  isAr: boolean;
  selected: Date | null;
  onSelectDay: (date: Date | null) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const { data: term } = useAdminQuery<AcademicTerm>('getAcademicTerm');

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) || []), ev]);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) rows.push(allDays.slice(i, i + 7));
    return rows;
  }, [month]);

  const termStart = term?.startDate ? new Date(term.startDate) : null;
  const termEnd = term?.endDate ? new Date(term.endDate) : null;
  const weekNumberFor = (weekStart: Date) => {
    if (!termStart || !termEnd || weekStart < startOfWeek(termStart, { weekStartsOn: 0 }) || weekStart > termEnd) return null;
    return differenceInCalendarWeeks(weekStart, termStart, { weekStartsOn: 0 }) + 1;
  };

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { weekday: 'narrow' }).format(d);
    });
  }, [isAr]);

  const monthLabel = new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { month: 'long', year: 'numeric' }).format(month);
  const showWeekNumbers = !!(termStart && termEnd);

  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
          <CalendarDays size={18} className="text-[var(--color-accent)]" />
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(m => subMonths(m, 1))} aria-label={isAr ? 'الشهر السابق' : 'Previous month'} className="cursor-pointer p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button type="button" onClick={() => setMonth(new Date())} className="cursor-pointer px-2.5 py-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[10px] font-bold text-[var(--color-text-secondary)]">
            {isAr ? 'اليوم' : 'Today'}
          </button>
          <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} aria-label={isAr ? 'الشهر التالي' : 'Next month'} className="cursor-pointer p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Legend: explains what the colored dot on a day means */}
      <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold text-[var(--color-text-muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-highlight)]" />
        {isAr ? 'فعالية في هذا اليوم' : 'Event on this day'}
      </div>

      <div className={`grid ${showWeekNumbers ? 'grid-cols-[1.5rem_1fr]' : ''} gap-1`}>
        {showWeekNumbers && <div />}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="text-[10px] font-bold text-[var(--color-text-muted)] py-1">{w}</div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const weekNum = showWeekNumbers ? weekNumberFor(week[0]) : null;
          return (
            <Fragment key={wi}>
              {showWeekNumbers && (
                <div key={`wn-${wi}`} className="flex items-center justify-center text-[9px] font-bold text-[var(--color-text-muted)]">
                  {weekNum ? `${isAr ? 'أ' : 'W'}${weekNum}` : ''}
                </div>
              )}
              <div key={`w-${wi}`} className="grid grid-cols-7 gap-1">
                {week.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(key) || [];
                  const inMonth = isSameMonth(day, month);
                  const active = selected && isSameDay(day, selected);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectDay(selected && isSameDay(selected, day) ? null : day)}
                      className={`cursor-pointer relative aspect-square rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]'
                          : isToday(day)
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/30'
                          : inMonth
                          ? 'text-[var(--color-text-primary)] border-[var(--color-border)]/40 hover:bg-[var(--color-surface-2)]'
                          : 'text-[var(--color-text-muted)]/50 border-[var(--color-border)]/20 hover:bg-[var(--color-surface-2)]'
                      }`}
                    >
                      {day.getDate()}
                      {dayEvents.length > 0 && (
                        <span className={`absolute bottom-1 w-1 h-1 rounded-full ${active ? 'bg-[var(--color-accent-contrast)]' : 'bg-[var(--color-highlight)]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
