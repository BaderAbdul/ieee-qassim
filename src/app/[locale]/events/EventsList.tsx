'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PlatformEvent } from '@/lib/types';
import { Calendar, Search, Filter, Lightbulb } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import EventCard from '@/components/ui/EventCard';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { sortEventsByClosestDate, toJsDate } from '@/lib/dateUtils';
import { eventTypeLabel } from '@/lib/studentExperience';

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

  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState(['ALL', 'Workshop', 'Camp', 'Lecture', 'Competition', 'Other', 'Meetup', 'Challenge'].includes(initialType) ? initialType : 'ALL');
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
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
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
      if (event.hideFromDiscovery === true) return false;
      const past = ['Completed', 'Archived'].includes(event.state) || (event.state !== 'Ongoing' && (toJsDate(event.date)?.getTime() ?? 0) < now);
      if (view === 'upcoming' && past) return false;
      if (view === 'past' && !past) return false;
      if (view === 'open' && event.state !== 'Registration Open') return false;
      // Type filter
      if (selectedType !== 'ALL' && event.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = (event.title || '').toLowerCase().includes(q);
        const titleEnMatch = (event.titleEn || '').toLowerCase().includes(q);
        const descMatch = (event.description || '').toLowerCase().includes(q);
        const descEnMatch = (event.descriptionEn || '').toLowerCase().includes(q);
        const locationMatch = (event.location || '').toLowerCase().includes(q);
        const locationEnMatch = (event.locationEn || '').toLowerCase().includes(q);
        if (!titleMatch && !titleEnMatch && !descMatch && !descEnMatch && !locationMatch && !locationEnMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const pastA = ['Completed', 'Archived'].includes(a.state) || (a.state !== 'Ongoing' && (toJsDate(a.date)?.getTime() ?? 0) < now);
      const pastB = ['Completed', 'Archived'].includes(b.state) || (b.state !== 'Ongoing' && (toJsDate(b.date)?.getTime() ?? 0) < now);
      if (pastA !== pastB) return pastA ? 1 : -1;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : b.isPinned ? 1 : 0;
      const dateA = toJsDate(a.date)?.getTime() ?? 0;
      const dateB = toJsDate(b.date)?.getTime() ?? 0;
      return pastA ? dateB - dateA : dateA - dateB;
    });
  }, [events, selectedType, searchQuery, view, now]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-5 min-w-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Search and Filters Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto] min-w-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              aria-label={t('searchPlaceholder')}
              onChange={(e) => { setSearchQuery(e.target.value); persistFilters(e.target.value, selectedType, view); }}
              placeholder={t('searchPlaceholder')}
              className="min-h-11 w-full ps-10 pe-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Category Select */}
          <div className="flex items-center gap-3 sm:contents">
          <div className="relative min-w-0 flex-1">
            <Filter className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select 
              value={selectedType}
              aria-label={isAr ? 'نوع الفعالية' : 'Event type'}
              onChange={(e) => { setSelectedType(e.target.value); persistFilters(searchQuery, e.target.value, view); }}
              className="min-h-11 w-full ps-10 pe-8 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer outline-none transition-colors"
            >
              <option value="ALL">{t('filterAll')}</option>
              <option value="Workshop">{t('filterWorkshop')}</option>
              <option value="Camp">{t('filterCamp')}</option>
              <option value="Lecture">{t('filterLecture')}</option>
              <option value="Competition">{t('filterCompetition')}</option>
              <option value="Other">{t('filterOther')}</option>
              <option value="Meetup">{eventTypeLabel('Meetup', isAr)}</option>
              <option value="Challenge">{eventTypeLabel('Challenge', isAr)}</option>
            </select>
          </div>
          
          {/* Ideas Arena Button */}
          <Link 
            href="/events/ideas"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            {isAr ? 'ساحة الأفكار' : 'Ideas Arena'}
          </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={isAr ? 'حالة الفعاليات' : 'Event availability'}>
        {(['all', 'upcoming', 'past', 'open'] as const).map(category => (
          <button type="button" key={category} aria-pressed={view === category} onClick={() => { setView(category); persistFilters(searchQuery, selectedType, category); }} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${view === category ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {({ all: isAr ? 'الكل' : 'All', upcoming: isAr ? 'القادمة' : 'Upcoming', past: isAr ? 'السابقة' : 'Past', open: isAr ? 'التسجيل مفتوح' : 'Registration open' })[category]}
          </button>
        ))}
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        <p aria-live="polite" aria-atomic="true">{isAr ? `${filteredEvents.length} فعالية معروضة` : `${filteredEvents.length} events shown`}</p>
        {cursor && <p>{isAr ? 'البحث يشمل الفعاليات المحمّلة؛ حمّل المزيد لاستعراض البقية.' : 'Search covers loaded events; load more to browse the rest.'}</p>}
      </div>

      {/* Content Section */}
      {events.length === 0 ? (
        /* Empty Platform Events State */
        <div className="bg-white rounded-3xl border border-slate-200 px-5 py-10 text-center flex flex-col items-center">
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
        <div className="bg-white rounded-3xl border border-slate-200 px-5 py-10 text-center flex flex-col items-center">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 font-cairo">
            {t('noSearchResults')}
          </h3>
          <button type="button"
            onClick={() => { setSearchQuery(''); setSelectedType('ALL'); setView('all'); persistFilters('', 'ALL', 'all'); }}
            className="mt-4 min-h-11 rounded-xl border border-blue-200 px-4 py-2 text-base font-semibold text-blue-700 hover:bg-blue-50"
          >
            {isAr ? 'إعادة ضبط عوامل التصفية' : 'Reset filters'}
          </button>
        </div>
      ) : (
        /* Events Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-4 sm:gap-5">
          {filteredEvents.map((event) => (
            <div key={event.id} className="transition-transform duration-300">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      )}
      {loadError && <p role="alert" className="text-red-700 text-sm">{loadError}</p>}
      {cursor && <button type="button" onClick={loadMore} disabled={loadingMore} className="block min-h-11 mx-auto px-6 py-3 rounded-xl border border-blue-200 bg-white text-blue-700 font-semibold disabled:opacity-50">{loadingMore ? (isAr ? 'جارٍ التحميل…' : 'Loading…') : (isAr ? 'تحميل المزيد من الفعاليات' : 'Load more events')}</button>}
    </div>
  );
}
