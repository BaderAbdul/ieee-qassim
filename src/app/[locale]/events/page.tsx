import React from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { sortEventsByClosestDate } from '@/lib/dateUtils';
import EventsList from './EventsList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage() {
  let events: PlatformEvent[] = [];
  
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed']),
      limit(50)
    );
    const snapshot = await getDocs(q);
      
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
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsList events={events} />
      </div>
    </div>
  );
}
