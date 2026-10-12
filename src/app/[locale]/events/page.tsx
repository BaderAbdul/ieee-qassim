import React from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { sortEventsByClosestDate } from '@/lib/dateUtils';
import EventsList from './EventsList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let events: PlatformEvent[] = [];
  let nextCursor: string | null = null;
  const filters = await searchParams;
  // eslint-disable-next-line react-hooks/purity -- Dynamic server request time is passed once to the client to avoid hydration drift.
  const requestTime = Date.now();
  
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed']),
      orderBy('date', 'desc'),
      limit(24)
    );
    const snapshot = await getDocs(q);
    nextCursor = snapshot.size === 24 ? snapshot.docs.at(-1)?.id ?? null : null;
      
    const fetchedEvents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firebase Timestamp to ISO string to pass safely to Client Component
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    }) as PlatformEvent[];
    
    events = sortEventsByClosestDate(fetchedEvents);
  } catch (error) {
    console.error("Error fetching events", error);
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsList events={events} nextCursor={nextCursor} initialNow={requestTime} initialSearch={typeof filters.q === 'string' ? filters.q : ''} initialType={typeof filters.type === 'string' ? filters.type : 'ALL'} initialView={typeof filters.view === 'string' ? filters.view : 'all'} />
      </div>
    </div>
  );
}
