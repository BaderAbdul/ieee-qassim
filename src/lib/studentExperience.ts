/** Only allow same-site navigation; normalize locale prefixes for next-intl. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return '/';
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid') return '/';
    const path = url.pathname.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
    if (path.startsWith('/complete-profile') || path.startsWith('/api')) return '/';
    return `${path}${url.search}${url.hash}`;
  } catch { return '/'; }
}

export function normalizeStudentId(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0)).replace(/\D/g, '').slice(0, 9);
}

const eventStates: Record<string, [string, string]> = {
  Draft: ['مسودة', 'Draft'],
  Published: ['قريبًا (لم يفتح التسجيل بعد)', 'Coming soon (Registration not open)'],
  'Registration Open': ['التسجيل مفتوح', 'Registration open'],
  'Registration Closed': ['التسجيل مغلق', 'Registration closed'],
  Ongoing: ['جارية', 'Ongoing'],
  Completed: ['مكتملة', 'Completed'],
  Archived: ['مؤرشفة', 'Archived'],
};
const eventTypes: Record<string, [string, string]> = {
  Workshop: ['ورشة عمل', 'Workshop'], Camp: ['معسكر', 'Camp'], Lecture: ['محاضرة', 'Lecture'],
  Competition: ['مسابقة', 'Competition'], Meetup: ['لقاء', 'Meetup'], Challenge: ['تحدٍّ', 'Challenge'],
  Booth: ['بوث / جناح', 'Booth / Visit'], Other: ['أخرى', 'Other'],
};
const registrations: Record<string, [string, string]> = {
  pending: ['قيد المراجعة', 'Pending review'], approved: ['تم قبول التسجيل', 'Approved'],
  waitlisted: ['على قائمة الانتظار', 'Waitlisted'], rejected: ['لم يُقبل التسجيل', 'Not approved'],
  cancelled: ['أُلغي التسجيل', 'Cancelled'], attended: ['تم تسجيل الحضور', 'Attended'],
};
const certificates: Record<string, [string, string]> = {
  'Not Issued': ['لم تصدر بعد', 'Not issued'], Generating: ['قيد الإصدار', 'Generating'],
  Available: ['جاهزة', 'Available'], Failed: ['تعذر الإصدار؛ تواصل مع المنظم', 'Generation failed; contact the organizer'],
  Revoked: ['أُلغيت الشهادة', 'Revoked'],
};
export const eventStateLabel = (state: string, isAr: boolean) => eventStates[state]?.[isAr ? 0 : 1] || state;
export const eventTypeLabel = (type: string, isAr: boolean) => eventTypes[type]?.[isAr ? 0 : 1] || type;
export const registrationLabel = (status: string, isAr: boolean) => registrations[status]?.[isAr ? 0 : 1] || (isAr ? 'حالة غير معروفة' : 'Unknown status');
export const certificateLabel = (status: string, isAr: boolean) => certificates[status]?.[isAr ? 0 : 1] || (isAr ? 'جارٍ التحقق' : 'Checking status');

/** Competition ranking: equal points share a rank (1, 1, 3). */
export function competitionRanks(points: number[]): number[] {
  return points.map((value, index) => index === 0 || value !== points[index - 1] ? index + 1 : points.findIndex(point => point === value) + 1);
}

export function eventCapacityLabel(event: { state: string; attendanceCount?: number; registeredCount?: number; capacity: number; hideExactCapacity?: boolean; isUnlimitedCapacity?: boolean }, isAr: boolean): string {
  if (['Completed', 'Archived'].includes(event.state)) return `${isAr ? 'الحضور' : 'Attendance'}: ${event.attendanceCount ?? 0}`;
  if (event.isUnlimitedCapacity) return isAr ? 'سعة غير محدودة' : 'Unlimited capacity';
  if (event.hideExactCapacity) return isAr ? 'مقاعد محدودة' : 'Limited seats';
  return `${event.registeredCount ?? 0} / ${event.capacity} ${isAr ? 'مسجل' : 'registered'}`;
}
