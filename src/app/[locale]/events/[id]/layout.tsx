import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';
import { API_BASE_URL } from '@/lib/apiBase';

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const base: Metadata = { title: locale === 'ar' ? 'الفعالية | IEEE القصيم' : 'Event | IEEE Qassim', alternates: { canonical: `${SITE_URL}/${locale}/events/${encodeURIComponent(id)}`, languages: { ar: `${SITE_URL}/ar/events/${encodeURIComponent(id)}`, en: `${SITE_URL}/en/events/${encodeURIComponent(id)}` } } };
  if (!id || id.includes('/') || id.length > 128) return { ...base, robots: { index: false, follow: false } };
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/events/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (!response.ok) return { ...base, robots: { index: false, follow: false } };
    const event = await response.json() as { title?: string; titleEn?: string; description?: string; descriptionEn?: string; coverUrl?: string };
    const title = String((locale === 'en' ? event.titleEn : event.title) || event.title || 'IEEE Qassim');
    const description = String((locale === 'en' ? event.descriptionEn : event.description) || event.description || '').replace(/\s+/g, ' ').slice(0, 180);
    const images = typeof event.coverUrl === 'string' && event.coverUrl.startsWith('https://') ? [{ url: event.coverUrl, alt: title }] : [];
    return { ...base, title: `${title} | IEEE Qassim`, description, openGraph: { title, description, url: `${SITE_URL}/${locale}/events/${encodeURIComponent(id)}`, type: 'website', ...(images.length ? { images } : {}) }, twitter: { card: images.length ? 'summary_large_image' : 'summary', title, description, ...(images.length ? { images } : {}) } };
  } catch {
    // A metadata lookup must not take down the public event or expose configuration.
    return base;
  }
}

export default function EventMetadataLayout({ children }: { children: ReactNode }) { return children; }
