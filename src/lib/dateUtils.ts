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
    return format(d, formatStr, options);
  } catch {
    return '';
  }
}
