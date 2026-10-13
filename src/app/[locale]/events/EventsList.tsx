'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PlatformEvent } from '@/lib/types';
import { Calendar, Search, Filter, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import EventCard from '@/components/ui/EventCard';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { sortEventsByClosestDate, toJsDate } from '@/lib/dateUtils';
import { eventTypeLabel } from '@/lib/studentExperience';
import { eventCache } from '@/lib/eventCache';

interface EventsListProps {
  events: PlatformEvent[];
  nextCursor?: string | null;
  initialSearch?: string;
  initialType?: string;
  initialView?: string;
  initialNow?: number;
}

export default function EventsList({ events: initialEvents, nextCursor = null, initialSearch = '', initialType = 'ALL', initialView = 'all', initialNow = 0 }: EventsListProps) {
  const t = useTranslations('Events');
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      eventCache.populate(initialEvents);
    }
  }, [initialEvents]);

  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState(initialType);
  const [view, setView] = useState(['all', 'upcoming', 'past', 'open'].includes(initialView) ? initialView : 'all');
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const persistFilters = (q: string, type: string, category: string) => {
    const params = new URLSearchParams(window.location.search);
    if (q) params.set('q', q); else params.delete('q');
    if (type !== 'ALL') params.set('type', type); else params.delete('type');
    if (category !== 'all') params.set('view', category); else params.delete('view');
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  };
  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true); setLoadError('');
    try {
      const cursorDoc = await getDoc(doc(db, 'events', cursor));
      if (!cursorDoc.exists()) throw new Error('Reload the page to refresh the event list.');
      const snap = await getDocs(query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed']), orderBy('date', 'desc'), startAfter(cursorDoc), limit(24)));
      const more = snap.docs.map(item => ({ id: item.id, ...item.data() }) as PlatformEvent);
      setEvents(previous => sortEventsByClosestDate([...previous, ...more.filter(item => !previous.some(ev => ev.id === item.id))]));
      setCursor(snap.size === 24 ? snap.docs.at(-1)?.id ?? null : null);
    } catch { setLoadError(isAr ? 'تعذر تحميل المزيد. أعد المحاولة أو حدّث الصفحة.' : 'Could not load more. Retry or refresh the page.'); }
    finally { setLoadingMore(false); }
  };

  // Client-side filtering by search query and type
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const past = ['Completed', 'Archived'].includes(event.state) || (toJsDate(event.date)?.getTime() ?? 0) < now;
      if (view === 'upcoming' && past) return false;
      if (view === 'past' && !past) return false;
      // Hide unlisted events (e.g. secret booth visits or internal events) from general list
      if (event.isUnlisted && !searchQuery.trim()) return false;
      if (view === 'open' && event.state !== 'Registration Open') return false;
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
  }, [events, selectedType, searchQuery, view, now]);

  // Separate active events from completed ones when viewing "all"
  const { activeEvents, completedEvents } = useMemo(() => {
    if (view !== 'all') {
      return { activeEvents: filteredEvents, completedEvents: [] };
    }
    const active: PlatformEvent[] = [];
    const completed: PlatformEvent[] = [];
    filteredEvents.forEach(ev => {
      const isPast = ['Completed', 'Archived'].includes(ev.state) || (toJsDate(ev.date)?.getTime() ?? 0) < now;
      if (isPast) completed.push(ev);
      else active.push(ev);
    });
    return { activeEvents: active, completedEvents: completed };
  }, [filteredEvents, view, now]);

  return (
    <div className="space-y-10">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 sm:gap-6 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-cairo">
              {t('title')}
            </h1>
            {/* Ideas Arena (secondary action) */}
            <Link
              href="/events/ideas"
              className="xl:hidden shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs sm:text-sm font-bold hover:bg-amber-100 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              {isAr ? 'ساحة الأفكار' : 'Ideas Arena'}
            </Link>
          </div>
          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Search and Filters Bar */}
        <div className="flex flex-row gap-2 sm:gap-3 w-full xl:w-auto min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0 sm:w-64">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              aria-label={t('searchPlaceholder')}
              onChange={(e) => { setSearchQuery(e.target.value); persistFilters(e.target.value, selectedType, view); }}
              placeholder={t('searchPlaceholder')}
              className="w-full ps-10 pe-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs outline-none transition-all"
            />
          </div>

          {/* Category Select */}
          <div className="relative w-[8.5rem] sm:w-48 shrink-0">
            <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select 
              value={selectedType}
              aria-label={isAr ? 'نوع الفعالية' : 'Event type'}
              onChange={(e) => { setSelectedType(e.target.value); persistFilters(searchQuery, e.target.value, view); }}
              className={`w-full ps-9 pe-3 py-3 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs cursor-pointer outline-none appearance-none truncate transition-all ${selectedType !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200'}`}
            >
              <option value="ALL">{t('filterAll')}</option>
              <option value="Workshop">{t('filterWorkshop')}</option>
              <option value="Camp">{t('filterCamp')}</option>
              <option value="Lecture">{t('filterLecture')}</option>
              <option value="Competition">{t('filterCompetition')}</option>
              <option value="Meetup">{eventTypeLabel('Meetup', isAr)}</option>
              <option value="Challenge">{eventTypeLabel('Challenge', isAr)}</option>
              <option value="Booth">{eventTypeLabel('Booth', isAr)}</option>
              <option value="Other">{t('filterOther')}</option>
            </select>
          </div>
          
          {/* Ideas Arena Button (desktop) */}
          <Link 
            href="/events/ideas"
            className="hidden xl:flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold hover:bg-amber-100 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            {isAr ? 'ساحة الأفكار' : 'Ideas Arena'}
          </Link>
        </div>
      </div>

      <div className="sticky top-16 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-gray-50/90 backdrop-blur-md border-b border-gray-200/70">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar" role="group" aria-label={isAr ? 'حالة الفعاليات' : 'Event availability'}>
          {(['all', 'upcoming', 'past', 'open'] as const).map(category => (
            <button key={category} aria-pressed={view === category} onClick={() => { setView(category); persistFilters(searchQuery, selectedType, category); }} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${view === category ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-200 hover:text-blue-700'}`}>
              {({ all: isAr ? 'الكل' : 'All', upcoming: isAr ? 'القادمة' : 'Upcoming', past: isAr ? 'السابقة' : 'Past', open: isAr ? 'التسجيل مفتوح' : 'Registration open' })[category]}
            </button>
          ))}
        </div>
      </div>
      {cursor && <p className="text-sm text-slate-600">{isAr ? 'البحث والتصفية يشملان الفعاليات المحمّلة. حمّل المزيد لاستعراض بقية الأرشيف.' : 'Filters search the loaded events. Load more to explore the rest of the archive.'}</p>}

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
            onClick={() => { setSearchQuery(''); setSelectedType('ALL'); setView('all'); persistFilters('', 'ALL', 'all'); }}
            className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 underline"
          >
            {isAr ? 'إعادة ضبط عوامل التصفية' : 'Reset filters'}
          </button>
        </div>
      ) : view === 'all' && completedEvents.length > 0 && activeEvents.length > 0 ? (
        /* Separated Sections when viewing all with both active and completed events */
        <div className="space-y-12">
          {/* Active / Upcoming Events */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-lg sm:text-xl font-bold font-cairo text-slate-900">
                {isAr ? 'الفعاليات القادمة والنشطة' : 'Upcoming & Active Events'}
              </h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {activeEvents.length}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 lg:gap-8">
              {activeEvents.map((event) => (
                <div key={event.id} className="transition-transform duration-300 h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </div>

          {/* Completed Events Archive */}
          <div className="space-y-4 pt-8 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg sm:text-xl font-bold font-cairo text-slate-800">
                  {isAr ? 'الفعاليات السابقة والمكتملة' : 'Past & Completed Events'}
                </h2>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  {completedEvents.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 lg:gap-8">
              {completedEvents.map((event) => (
                <div key={event.id} className="transition-transform duration-300 h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Events Grid: 2 columns on mobile (portrait), 3 on desktop */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 lg:gap-8">
          {filteredEvents.map((event) => (
            <div key={event.id} className="transition-transform duration-300 h-full">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      )}
      {loadError && <p role="alert" className="text-red-700 text-sm">{loadError}</p>}
      {cursor && <button onClick={loadMore} disabled={loadingMore} className="block mx-auto px-6 py-3 rounded-xl border border-blue-200 bg-white text-blue-700 font-bold disabled:opacity-50">{loadingMore ? (isAr ? 'جارٍ التحميل…' : 'Loading…') : (isAr ? 'تحميل المزيد من الفعاليات' : 'Load more events')}</button>}
    </div>
  );
}
