import React from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let stats = { membersCount: '+500', eventsCount: '+25', adminsCount: '+40', featuredEventId: '', showStructure: true, heroTitle: '', heroSubtitleAr: '', heroSubtitleEn: '', committees: [] as any[] };
  let eventsList: PlatformEvent[] = [];
  let latestEvent: PlatformEvent | null = null;

  try {
    const statsDoc = await getDoc(doc(db, 'settings', 'homepage'));
    
    if (statsDoc.exists()) {
      stats = { ...stats, ...statsDoc.data() };
    }

    const eventsSnap = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc'), limit(15)));

    const validStates = ['Published', 'Registration Open', 'Ongoing', 'Completed', 'Registration Closed'];
    const evs = eventsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    }).filter((e: any) => validStates.includes(e.state)) as PlatformEvent[];

    eventsList = evs.slice(0, 3);

    let featuredId = stats.featuredEventId;
    if (featuredId) {
      const evDoc = await getDoc(doc(db, 'events', featuredId));
      if (evDoc.exists()) {
        const data = evDoc.data() as any;
        latestEvent = { 
          id: evDoc.id, 
          ...data,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
        } as PlatformEvent;
      } else if (evs.length > 0) {
        latestEvent = evs[0];
      }
    } else if (evs.length > 0) {
      latestEvent = evs[0];
    }
  } catch (error) {
    console.error("Error fetching homepage data:", error);
  }

  return (
    <HomeClient 
      initialStats={stats} 
      initialEvents={eventsList} 
      initialLatestEvent={latestEvent} 
    />
  );
}
