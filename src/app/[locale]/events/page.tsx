'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { Calendar, Search, Filter } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import EventCard from '@/components/ui/EventCard';
import { toJsDate } from '@/lib/dateUtils';

export default function EventsPage() {
  const t = useTranslations('Events');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(
          eventsRef, 
          where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed'])
        );
        const snapshot = await getDocs(q);
        
        const fetchedEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PlatformEvent[];
        
        // Sort by date descending
        fetchedEvents.sort((a, b) => {
          const dateA = toJsDate(a.date)?.getTime() || 0;
          const dateB = toJsDate(b.date)?.getTime() || 0;
          return dateB - dateA;
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

  // Client-side filtering by search query and type
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Type filter
      if (selectedType !== 'ALL' && event.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const titleMatch = (event.title || '').toLowerCase().includes(q);
        const titleEnMatch = (event.titleEn || '').toLowerCase().includes(q);
        const descMatch = (event.description || '').toLowerCase().includes(q);
        const locationMatch = (event.location || '').toLowerCase().includes(q);
        if (!titleMatch && !titleEnMatch && !descMatch && !locationMatch) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedType, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-8">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-cairo mb-3">
              {t('title')}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
          
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full ps-10 pe-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs outline-none transition-all"
              />
            </div>

            {/* Category Select */}
            <div className="relative sm:w-48">
              <Filter className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full ps-10 pe-8 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs cursor-pointer outline-none appearance-none transition-all"
              >
                <option value="ALL">{t('filterAll')}</option>
                <option value="Workshop">{t('filterWorkshop')}</option>
                <option value="Camp">{t('filterCamp')}</option>
                <option value="Lecture">{t('filterLecture')}</option>
                <option value="Competition">{t('filterCompetition')}</option>
                <option value="Other">{t('filterOther')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
                  <div className="h-4 bg-slate-100 rounded-md w-full" />
                  <div className="h-4 bg-slate-100 rounded-md w-2/3" />
                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <div className="h-4 bg-slate-100 rounded-md w-1/3" />
                    <div className="h-4 bg-slate-200 rounded-md w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty Platform Events State */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 sm:p-24 text-center flex flex-col items-center">
            <div className="h-24 w-24 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 font-cairo">
              {t('noEvents')}
            </h3>
            <p className="text-slate-500 text-base max-w-md leading-relaxed">
              {t('noEventsDesc')}
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty Search Results State */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-cairo">
              {t('noSearchResults')}
            </h3>
            <button
              onClick={() => { setSearchQuery(''); setSelectedType('ALL'); }}
              className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 underline"
            >
              {isAr ? 'إعادة ضبط عوامل التصفية' : 'Reset filters'}
            </button>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="transition-transform duration-300">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
