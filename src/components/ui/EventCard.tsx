'use client';

import React from 'react';
import Image from 'next/image';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { MapPin, Calendar, Clock, Users, ArrowRight, Pin, CheckCircle2 } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { eventCapacityLabel, eventStateLabel, eventTypeLabel } from '@/lib/studentExperience';
import { eventCache } from '@/lib/eventCache';

interface EventCardProps {
  event: PlatformEvent;
}

export default function EventCard({ event }: EventCardProps) {
  if (typeof window !== 'undefined' && event?.id) {
    eventCache.set(event.id, event);
  }
  const locale = useLocale();
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  const eventDate = event.date;
  const day = formatDateSafe(eventDate, 'dd', { locale: dateLocale });
  const month = formatDateSafe(eventDate, 'MMM', { locale: dateLocale }).toUpperCase();
  
  const isCompleted = event.state === 'Completed' || event.state === 'Archived';

  // Badge setup
  let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
  const badgeText = eventStateLabel(event.state, isAr);
  
  if (event.state === 'Published') {
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (event.state === 'Registration Open') {
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (event.state === 'Registration Closed') {
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
  } else if (event.state === 'Ongoing') {
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (isCompleted) {
    badgeColor = 'bg-slate-800 text-slate-200 border-slate-700';
  }

  const title = isAr ? event.title : event.titleEn || event.title;
  const location = isAr ? event.location : event.locationEn || event.location;

  // Capacity logic
  const capacityDisplay = eventCapacityLabel(event, isAr);

  return (
    <div className={`group h-full rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 relative ${
      event.isPinned 
        ? 'bg-white ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] border border-amber-300' 
        : isCompleted
          ? 'bg-slate-50/80 border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-slate-300 opacity-[0.97]'
          : 'bg-white shadow-sm hover:shadow-2xl border border-gray-100/80'
    }`}>
      {/* Top Image Section */}
      <div className="relative h-28 sm:h-56 w-full bg-slate-100 overflow-hidden shrink-0">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt={title}
            fill
            quality={85}
            className={`object-cover transition-transform duration-700 group-hover:scale-110 ${isCompleted ? 'grayscale-[30%] group-hover:grayscale-0' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900">
            {/* Abstract fallback pattern */}
            <div className="absolute inset-0 opacity-20">
               <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`grid-pattern-${event.id}`} width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-pattern-${event.id})`} />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />

        {/* Floating Date Badge */}
        <div className="absolute top-2 sm:top-4 start-2 sm:start-4 bg-white/95 backdrop-blur-md rounded-lg sm:rounded-2xl p-1 px-1.5 sm:p-2 sm:px-3 text-center shadow-md border border-white/20 z-10">
          <div className={`text-[9px] sm:text-sm font-bold leading-none mb-0.5 sm:mb-1 ${isCompleted ? 'text-slate-500' : 'text-blue-600'}`}>{month}</div>
          <div className={`text-xs sm:text-xl font-black leading-none font-cairo ${isCompleted ? 'text-slate-700' : 'text-slate-900'}`}>{day}</div>
        </div>

        {/* State + Pinned Badges (stacked in the same corner so they never collide) */}
        <div className="absolute top-2 sm:top-4 end-2 sm:end-4 z-10 flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-bold border shadow-xs whitespace-nowrap inline-flex items-center gap-1 ${badgeColor}`}>
            {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />}
            {badgeText}
          </span>
          {event.isPinned && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500 text-white text-[8px] sm:text-xs font-black rounded-full shadow-xs border border-amber-300/60 whitespace-nowrap">
              <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              {isAr ? 'مثبتة' : 'Pinned'}
            </span>
          )}
        </div>

        {/* Category Label overlay */}
        <div className="absolute bottom-2 sm:bottom-4 start-2 sm:start-4">
          <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] sm:text-xs font-bold rounded-full tracking-wide">
            {eventTypeLabel(event.type, isAr)}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2.5 sm:p-6 flex flex-col grow">
        <h3 className="text-xs sm:text-xl font-black text-slate-900 mb-1.5 sm:mb-4 line-clamp-2 font-cairo group-hover:text-blue-600 transition-colors leading-tight min-h-[2rem] sm:min-h-0">
          {title}
        </h3>

        <div className="space-y-1 sm:space-y-3 mb-2 sm:mb-6">
          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1 sm:me-3 shrink-0">
              <Calendar className="h-2 w-2 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate">{formatDateSafe(eventDate, 'd MMM yyyy', { locale: dateLocale })}</span>
          </div>

          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1 sm:me-3 shrink-0">
              <Clock className="h-2 w-2 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate" dir="ltr">
              {formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })} <span className="hidden sm:inline">({event.durationHours}h)</span>
            </span>
          </div>

          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1 sm:me-3 shrink-0">
              <MapPin className="h-2 w-2 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate">{location}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1.5 sm:pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1 sm:gap-2">
             <Users aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
             <div className="text-[9px] sm:text-xs font-bold text-slate-500 truncate">
               {capacityDisplay}
             </div>
          </div>
        </div>
      </div>

      {/* Button placed at the very bottom */}
      <div className="p-2 sm:p-4 pt-0">
        <Link 
          href={`/events/${event.id}`}
          className={`flex items-center justify-center w-full py-2 sm:py-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 gap-1 sm:gap-2 ${
            isCompleted
              ? 'bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 shadow-2xs'
              : 'bg-slate-900 hover:bg-blue-600 text-white shadow-xs'
          }`}
        >
          <span>{isCompleted ? (isAr ? 'أرشيف الفعالية' : 'Archive') : (isAr ? 'التفاصيل' : 'Details')}</span>
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}
