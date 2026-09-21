'use client';

import React, { useState, useMemo } from 'react';
import { PlatformEvent } from '@/lib/types';
import { Calendar, Search, Filter, Lightbulb } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import EventCard from '@/components/ui/EventCard';

interface EventsListProps {
  events: PlatformEvent[];
}

export default function EventsList({ events }: EventsListProps) {
  const t = useTranslations('Events');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

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
    <div className="space-y-10">
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
          
          {/* Ideas Arena Button */}
          <Link 
            href="/events/ideas"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-2xl text-sm font-bold shadow-sm shadow-amber-500/20 hover:shadow-md transition-all transform hover:-translate-y-0.5"
          >
            <Lightbulb className="w-4 h-4" />
            {isAr ? 'ساحة الأفكار' : 'Ideas Arena'}
          </Link>
        </div>
      </div>

      {/* Content Section */}
      {events.length === 0 ? (
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          {filteredEvents.map((event) => (
            <div key={event.id} className="transition-transform duration-300">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
