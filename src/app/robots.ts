import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/ar/admin', '/en/admin', '/ar/profile', '/en/profile', '/ar/complete-profile', '/en/complete-profile', '/*/events/*/checkin'] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
