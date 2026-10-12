export type MemberRankState = 'loading' | 'ready' | 'unranked' | 'error';

/** A pass QR always opens the public, localized member page on the configured HTTPS site. */
export function memberPassUrl(siteUrl: string, locale: string, userId: string): string {
  let origin = 'https://www.ieeequ.online';
  try {
    const site = new URL(siteUrl);
    if (site.protocol === 'https:' && !site.username && !site.password) origin = site.origin;
  } catch { /* Fall back to the canonical public site. */ }
  return `${origin}/${locale === 'en' ? 'en' : 'ar'}/pass/${encodeURIComponent(userId)}`;
}

const majorNames: Record<string, [string, string]> = {
  electrical: ['الهندسة الكهربائية', 'Electrical Engineering'],
  'electrical engineering': ['الهندسة الكهربائية', 'Electrical Engineering'],
  'الهندسة الكهربائية': ['الهندسة الكهربائية', 'Electrical Engineering'],
  mechanical: ['الهندسة الميكانيكية', 'Mechanical Engineering'],
  'mechanical engineering': ['الهندسة الميكانيكية', 'Mechanical Engineering'],
  'الهندسة الميكانيكية': ['الهندسة الميكانيكية', 'Mechanical Engineering'],
  civil: ['الهندسة المدنية', 'Civil Engineering'],
  'civil engineering': ['الهندسة المدنية', 'Civil Engineering'],
  'الهندسة المدنية': ['الهندسة المدنية', 'Civil Engineering'],
  'computer engineering': ['هندسة الحاسب', 'Computer Engineering'],
  'هندسة الحاسب': ['هندسة الحاسب', 'Computer Engineering'],
  'computer science': ['علوم الحاسب', 'Computer Science'],
  'علوم الحاسب': ['علوم الحاسب', 'Computer Science'],
  'general member': ['عضو في المجتمع', 'Community member'],
};

/** Normalize familiar labels for display only; preserve unfamiliar specializations verbatim. */
export function memberMajorLabel(major: string | null | undefined, isAr: boolean): string {
  const clean = major?.trim().replace(/\s+/g, ' ') || 'General Member';
  return majorNames[clean.toLowerCase()]?.[isAr ? 0 : 1] || clean;
}

export function memberRankLabel(state: MemberRankState, rank: number | null, isAr: boolean): string {
  if (state === 'loading') return isAr ? 'جارٍ التحميل' : 'Loading';
  if (state === 'error') return isAr ? 'تعذر التحميل' : 'Unavailable';
  if (state === 'ready' && rank !== null && rank > 0) return `#${rank}`;
  return isAr ? 'غير مصنّف' : 'Unranked';
}

/** Limit concurrent event reads while preserving successes when one historical event is unavailable. */
export async function mapMemberEvents<T, R>(items: T[], load: (item: T) => Promise<R>, concurrency = 6): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: 'fulfilled', value: await load(items[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }));
  return results;
}
