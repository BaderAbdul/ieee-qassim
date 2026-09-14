'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { Calendar } from 'lucide-react';
import { useLocale } from 'next-intl';
import EventCard from '@/components/ui/EventCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EventsPage() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, 'events');
        // Fetch published/open events
        const q = query(eventsRef, where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed']));
        const snapshot = await getDocs(q);
        
        const fetchedEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PlatformEvent[];
        
        // Sort by date client-side
        fetchedEvents.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : a.date?.toDate?.() || new Date();
          const dateB = b.date instanceof Date ? b.date : b.date?.toDate?.() || new Date();
          return dateB.getTime() - dateA.getTime();
        });

        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 font-cairo mb-3">{isAr ? 'الفعاليات' : 'Events'}</h1>
            <p className="text-lg text-slate-600">{isAr ? 'اكتشف أحدث الفعاليات والورش وانضم لمجتمع التكنولوجيا.' : 'Discover the latest events and workshops and join the tech community.'}</p>
          </div>
          
          {/* Simple Filters Placeholder */}
          <div className="mt-6 md:mt-0 flex gap-2">
            <select className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow hover:shadow-md cursor-pointer outline-none">
              <option>{isAr ? 'جميع الأنواع' : 'All Types'}</option>
              <option>{isAr ? 'ورشة عمل' : 'Workshop'}</option>
              <option>{isAr ? 'معسكر' : 'Bootcamp'}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-70">
            <LoadingSpinner size="lg" color="border-blue-600" />
            <span className="mt-4 text-blue-600 font-medium">{isAr ? 'جاري تحميل الفعاليات...' : 'Loading events...'}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-20 text-center flex flex-col items-center">
            <div className="h-24 w-24 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 font-cairo">{isAr ? 'لا توجد فعاليات حالياً' : 'No events currently'}</h3>
            <p className="text-gray-500 text-lg">{isAr ? 'نعمل على تجهيز فعاليات رائعة قريباً. عد لاحقاً!' : 'We are preparing great events soon. Check back later!'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div key={event.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationFillMode: 'both' }}>
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
