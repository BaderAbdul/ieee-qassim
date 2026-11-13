'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay,
  addMonths, subMonths, format, differenceInCalendarWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useAdminQuery } from '@/components/admin/AdminData';

export interface CalendarEvent {
  id: number;
  title: string;
  titleEn?: string;
  date?: string;
  kind?: 'event' | 'projectDeadline' | 'taskDeadline';
  completed?: boolean;
}

interface AcademicTerm { startDate: string | null; endDate: string | null }
export interface VacationRange { start: string; end: string; label?: string }
export interface VacationSettings { weeklyDays: number[]; ranges: VacationRange[] }

export function vacationInfoFor(day: Date, vacation: VacationSettings | null): { isVacation: boolean; label: string | null } {
  if (!vacation) return { isVacation: false, label: null };
  const key = format(day, 'yyyy-MM-dd');
  const range = (vacation.ranges || []).find(r => key >= r.start && key <= r.end);
  if (range) return { isVacation: true, label: range.label || null };
  if (vacation.weeklyDays?.includes(day.getDay())) return { isVacation: true, label: null };
  return { isVacation: false, label: null };
}

export default function AdminCalendar({
  events, isAr, selected, onSelectDay, vacation,
}: {
  events: CalendarEvent[];
  isAr: boolean;
  selected: Date | null;
  onSelectDay: (date: Date | null) => void;
  vacation: VacationSettings | null;
}) {
  const [month, setMonth] = useState(() => new Date());
  const { data: term } = useAdminQuery<AcademicTerm>('getAcademicTerm');

  const isVacationDay = (day: Date) => vacationInfoFor(day, vacation).isVacation;

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
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
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

      {/* Legend: explains what the colored/outlined day boxes mean */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mb-2 text-[10px] font-bold text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-highlight)]/30 border border-[var(--color-highlight)]/60" />
          {isAr ? 'يوجد فعالية' : 'Has an event'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-400" />
          {isAr ? 'فعالية مكتملة' : 'Completed event'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-soft)]" />
          {isAr ? 'اليوم' : 'Today'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300" />
          {isAr ? 'يوم سابق' : 'Past day'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-transparent border-2 border-amber-500" />
          {isAr ? 'مهمة' : 'Task'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-transparent border-2 border-violet-500" />
          {isAr ? 'موعد تسليم مشروع' : 'Project deadline'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-300" />
          {isAr ? 'عطلة' : 'Vacation'}
        </span>
      </div>

      <div className={`grid ${showWeekNumbers ? 'grid-cols-[1.5rem_1fr]' : ''} gap-1`}>
        {showWeekNumbers && <div />}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="text-[10px] font-bold text-[var(--color-text-muted)] py-0.5">{w}</div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const weekNum = showWeekNumbers ? weekNumberFor(week[0]) : null;
          return (
            <Fragment key={wi}>
              {showWeekNumbers && (
                <div key={`wn-${wi}`} className="flex items-center justify-center text-sm font-black text-[var(--color-text-secondary)]">
                  {weekNum ?? ''}
                </div>
              )}
              <div key={`w-${wi}`} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayItems = eventsByDay.get(key) || [];
                  // Only real events (not deadlines) ever share a background, and only when it's
                  // literally the same event continuing onto the next day (shared id) -- two
                  // unrelated events that happen to land on adjacent days never merge.
                  const dayEventItems = dayItems.filter(ev => !ev.kind || ev.kind === 'event');
                  const dayEventIds = dayEventItems.map(ev => ev.id);
                  const hasEvent = dayEventIds.length > 0;
                  const allEventsCompleted = hasEvent && dayEventItems.every(ev => ev.completed);
                  const hasTaskDeadline = dayItems.some(ev => ev.kind === 'taskDeadline');
                  const hasProjectDeadline = dayItems.some(ev => ev.kind === 'projectDeadline');
                  const inMonth = isSameMonth(day, month);
                  const active = selected && isSameDay(day, selected);
                  const vacation = isVacationDay(day);
                  const isPastDay = isBefore(day, startOfDay(new Date())) && !isToday(day);
                  const eventIdsOf = (d: Date) =>
                    (eventsByDay.get(format(d, 'yyyy-MM-dd')) || []).filter(ev => !ev.kind || ev.kind === 'event').map(ev => ev.id);
                  const connectsPrev = hasEvent && di > 0 && dayEventIds.some(id => eventIdsOf(week[di - 1]).includes(id));
                  const connectsNext = hasEvent && di < 6 && dayEventIds.some(id => eventIdsOf(week[di + 1]).includes(id));
                  // Task/project deadlines are outlines layered on top of the background, not a
                  // fill of their own -- a day can have an event AND a task deadline at once.
                  const ringClass = hasTaskDeadline
                    ? 'ring-2 ring-inset ring-amber-500'
                    : hasProjectDeadline ? 'ring-2 ring-inset ring-violet-500' : '';
                  return (
                    <div key={key} className={`p-0.5 ${connectsPrev ? 'ps-0' : ''} ${connectsNext ? 'pe-0' : ''}`}>
                      <button
                        type="button"
                        onClick={() => onSelectDay(selected && isSameDay(selected, day) ? null : day)}
                        className={`cursor-pointer relative h-14 w-full flex flex-col items-center justify-center text-xs border transition-colors ${
                          connectsPrev ? 'rounded-s-none border-s-0' : 'rounded-s-xl'
                        } ${connectsNext ? 'rounded-e-none border-e-0' : 'rounded-e-xl'} ${ringClass} ${
                          active
                            ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]'
                            : hasEvent && allEventsCompleted
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-700 hover:bg-emerald-200/70'
                            : hasEvent
                            ? 'bg-[var(--color-highlight)]/30 border-[var(--color-highlight)]/60 text-[var(--color-text-primary)] hover:bg-[var(--color-highlight)]/40'
                            : vacation
                            ? 'bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200/70'
                            : isToday(day)
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/30'
                            : isPastDay && inMonth
                            ? 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200/70'
                            : inMonth
                            ? 'text-[var(--color-text-primary)] border-[var(--color-border)]/40 hover:bg-[var(--color-surface-2)]'
                            : 'text-[var(--color-text-muted)]/50 border-[var(--color-border)]/20 hover:bg-[var(--color-surface-2)]'
                        }`}
                      >
                        <span className="font-extrabold">{day.getDate()}</span>
                      </button>
                    </div>
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
