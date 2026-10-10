export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ieeequ.online').replace(/\/$/, '');
export const localeAlternates = (path: string) => ({ canonical: `${SITE_URL}/ar${path}`, languages: { ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } });
