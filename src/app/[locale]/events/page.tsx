import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { API_BASE_URL } from '@/lib/apiBase';
import { PlatformEvent } from '@/lib/types';
import { sortEventsByClosestDate } from '@/lib/dateUtils';
import EventsList from './EventsList';

export const revalidate = 60; // Enable ISR Edge Caching, revalidate every 60s

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  let events: PlatformEvent[] = [];
  let nextCursor: string | null = null;

  // eslint-disable-next-line react-hooks/purity -- Prerender timestamp is refreshed on mount without hydration drift.
  const requestTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/api/public/events?limit=24`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`events fetch failed: ${response.status}`);
    const body = await response.json() as { events: PlatformEvent[]; nextCursor: string | null };
    events = sortEventsByClosestDate(body.events);
    nextCursor = body.nextCursor;
  } catch (error) {
    console.error('Error fetching events', error);
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsList events={events} nextCursor={nextCursor} initialNow={requestTime} />
      </div>
    </div>
  );
}
