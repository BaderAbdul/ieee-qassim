import React from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { PlatformEvent } from '@/lib/types';
import EventsList from './EventsList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage() {
  let events: PlatformEvent[] = [];
  
  try {
    const snapshot = await adminDb.collection('events')
      .where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed'])
      .get();
      
    const fetchedEvents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firebase Timestamp to ISO string to pass safely to Client Component
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date
      };
    }) as PlatformEvent[];
    
    // Sort by date descending
    fetchedEvents.sort((a, b) => {
      const dateA = new Date(a.date as any).getTime() || 0;
      const dateB = new Date(b.date as any).getTime() || 0;
      return dateB - dateA;
    });

    events = fetchedEvents;
  } catch (error) {
    console.error("Error fetching events", error);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsList events={events} />
      </div>
    </div>
  );
}
