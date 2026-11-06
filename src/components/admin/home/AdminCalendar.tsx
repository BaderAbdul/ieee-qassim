'use client';

import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, format,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Link } from '@/i18n/routing';

export interface CalendarEvent {
  id: string;
  title: string;
  titleEn?: string;
  date?: string;
}

export default function AdminCalendar({ events, isAr }: { events: CalendarEvent[]; isAr: boolean }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

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

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { weekday: 'narrow' }).format(d);
    });
  }, [isAr]);

  const monthLabel = new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { month: 'long', year: 'numeric' }).format(month);
  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) || [] : [];

  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
          <CalendarDays size={18} className="text-[var(--color-accent)]" />
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(m => subMonths(m, 1))} aria-label={isAr ? 'الشهر السابق' : 'Previous month'} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button type="button" onClick={() => setMonth(new Date())} className="px-2.5 py-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[10px] font-bold text-[var(--color-text-secondary)]">
            {isAr ? 'اليوم' : 'Today'}
          </button>
          <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} aria-label={isAr ? 'الشهر التالي' : 'Next month'} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="text-[10px] font-bold text-[var(--color-text-muted)] py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) || [];
          const inMonth = isSameMonth(day, month);
          const active = selected && isSameDay(day, selected);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(prev => (prev && isSameDay(prev, day) ? null : day))}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-colors ${
                active
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : isToday(day)
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : inMonth
                  ? 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
                  : 'text-[var(--color-text-muted)]/50 hover:bg-[var(--color-surface-2)]'
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

      {selected && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]/50 space-y-2">
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-2">
              {isAr ? 'لا توجد فعاليات في هذا اليوم' : 'No events on this day'}
            </p>
          ) : (
            selectedEvents.map(ev => (
              <Link
                key={ev.id}
                href={`/admin/events/${ev.id}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--color-surface-2)]/60 hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-highlight)] shrink-0" />
                <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{!isAr && ev.titleEn ? ev.titleEn : ev.title}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
