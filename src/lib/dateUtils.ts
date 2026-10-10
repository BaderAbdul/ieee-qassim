import { format } from 'date-fns';

/**
 * Safely converts Firestore Timestamp, Date, string, or object with toDate() to a native JS Date.
 */
export function toJsDate(date: unknown): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => unknown }).toDate === 'function') {
    try {
      const d = (date as { toDate: () => unknown }).toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {
      // fallback
    }
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Safely formats any date-like object with date-fns format().
 */
export function formatDateSafe(date: unknown, formatStr: string, options?: Parameters<typeof format>[2]): string {
  const d = toJsDate(date);
  if (!d) return '';
  try {
    // Display Riyadh wall-clock time consistently in SSR and every browser.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
    }).formatToParts(d);
    const part = (name: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === name)?.value);
    const wallClock = new Date(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'), d.getMilliseconds());
    return format(wallClock, formatStr, options);
  } catch {
    return '';
  }
}

/** Event editors always mean Riyadh wall time, regardless of the organizer's device. */
export function parseRiyadhInput(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('أدخل موعدًا صحيحًا بتوقيت الرياض. / Enter a valid Riyadh date and time.');
  const result = new Date(`${date}T${time}:00+03:00`);
  if (!Number.isFinite(result.getTime()) || formatDateSafe(result, 'yyyy-MM-dd') !== date || formatDateSafe(result, 'HH:mm') !== time) throw new Error('موعد الفعالية غير صالح. / Invalid event date.');
  return result;
}

/**
 * Sorts events so pinned events are first, followed by upcoming events ordered by closest date first, and finally past events.
 */
export function sortEventsByClosestDate<T extends { date?: unknown; isPinned?: boolean; state?: string }>(events: T[]): T[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    // 1. Pinned events come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    const dateA = toJsDate(a.date)?.getTime() || 0;
    const dateB = toJsDate(b.date)?.getTime() || 0;

    const isUpcomingA = dateA >= now || a.state === 'Registration Open' || a.state === 'Ongoing' || a.state === 'Published';
    const isUpcomingB = dateB >= now || b.state === 'Registration Open' || b.state === 'Ongoing' || b.state === 'Published';

    // Upcoming events before past events
    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;

    if (isUpcomingA && isUpcomingB) {
      // Both upcoming: sort by date ascending (closest to now first)
      return dateA - dateB;
    } else {
      // Both past: sort by date descending (most recent past first)
      return dateB - dateA;
    }
  });
}
