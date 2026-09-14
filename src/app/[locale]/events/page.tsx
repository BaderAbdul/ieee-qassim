'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function EventsPage() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;

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
        
        // Sort by date client-side to avoid needing composite index immediately
        fetchedEvents.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : a.date.toDate();
          const dateB = b.date instanceof Date ? b.date : b.date.toDate();
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-cairo mb-2">الفعاليات</h1>
            <p className="text-gray-600">اكتشف أحدث الفعاليات والورش وانضم لمجتمع التكنولوجيا.</p>
          </div>
          
          {/* Simple Filters Placeholder */}
          <div className="mt-4 md:mt-0 flex gap-2">
            <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm">
              <option>جميع الأنواع</option>
              <option>ورشة عمل</option>
              <option>معسكر</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد فعاليات حالياً</h3>
            <p className="text-gray-500">عد لاحقاً لاكتشاف الفعاليات القادمة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const eventDate = event.date instanceof Date ? event.date : (event.date as any).toDate();
              
              return (
                <Link key={event.id} href={`/events/${event.id}`} className="block group">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full">
                    {/* Cover Image Placeholder */}
                    <div className="h-48 bg-blue-100 relative overflow-hidden">
                      {event.coverUrl ? (
                        <img src={event.coverUrl} alt={locale === 'en' ? event.titleEn : event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                          <span className="text-white font-bold text-xl opacity-50">{event.type}</span>
                        </div>
                      )}
                      
                      <div className="absolute top-4 end-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          event.state === 'Registration Open' ? 'bg-green-100 text-green-700' :
                          event.state === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.state}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="text-sm font-semibold text-blue-600 mb-2">{event.type}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4 line-clamp-2">
                        {locale === 'en' ? event.titleEn : event.title}
                      </h3>
                      
                      <div className="space-y-2 mt-auto">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 me-2 text-gray-400" />
                          <span>{format(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 me-2 text-gray-400" />
                          <span>{format(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours}h)</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 me-2 text-gray-400" />
                          <span className="truncate">{locale === 'en' ? event.locationEn : event.location}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-2 pt-4 border-t border-gray-100">
                          <Users className="h-4 w-4 me-2 text-gray-400" />
                          <span>السعة: {event.capacity} مقعد</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
