import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Static public navigation only: never enumerate members, passes or certificates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/events', '/leaderboard', '/structure', '/help', '/privacy', '/terms'].flatMap(path => ['ar', 'en'].map(locale => ({ url: `${SITE_URL}/${locale}${path}`, alternates: { languages: { ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } }, changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7 })));
}
