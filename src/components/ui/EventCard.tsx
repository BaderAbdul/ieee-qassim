import React from 'react';
import Image from 'next/image';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Calendar, Clock, Users, ArrowRight, Pin } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';

interface EventCardProps {
  event: PlatformEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const locale = useLocale();
  const t = useTranslations('Events');
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  const eventDate = event.date;
  const day = formatDateSafe(eventDate, 'dd', { locale: dateLocale });
  const month = formatDateSafe(eventDate, 'MMM', { locale: dateLocale }).toUpperCase();
  
  // Badge setup
  let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
  let badgeText: string = event.state;
  
  if (event.state === 'Published') {
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
    badgeText = t('status.Published');
  } else if (event.state === 'Registration Open') {
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    badgeText = t('status.Registration Open');
  } else if (event.state === 'Registration Closed') {
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
    badgeText = t('status.Registration Closed');
  } else if (event.state === 'Ongoing') {
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
    badgeText = t('status.Ongoing');
  } else if (event.state === 'Completed') {
    badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
    badgeText = t('status.Completed');
  }

  const title = isAr ? event.title : event.titleEn || event.title;
  const location = isAr ? event.location : event.locationEn || event.location;

  // Capacity logic
  let capacityDisplay = '';
  if (event.state === 'Completed') {
    capacityDisplay = `${isAr ? 'الحضور:' : 'Attendance:'} ${event.attendanceCount || event.registeredCount || 0}`;
  } else if (event.isUnlimitedCapacity) {
    capacityDisplay = isAr ? 'تسجيل مفتوح' : 'Open Registration';
  } else if (event.hideExactCapacity) {
    capacityDisplay = isAr ? 'مقاعد محدودة' : 'Limited Seats';
  } else {
    if (event.registeredCount !== undefined) {
      capacityDisplay = `${event.registeredCount} / ${event.capacity} ${isAr ? 'مسجل' : 'Registered'}`;
    } else {
      capacityDisplay = `${isAr ? 'السعة:' : 'Capacity:'} ${event.capacity}`;
    }
  }

  return (
    <div className={`group h-full bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 relative ${
      event.isPinned 
        ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] border border-amber-300' 
        : 'shadow-sm hover:shadow-2xl border border-gray-100/80'
    }`}>
      {/* Top Image Section */}
      <div className="relative h-32 sm:h-56 w-full bg-slate-100 overflow-hidden shrink-0">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt={title}
            fill
            quality={85}
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

        {/* Pinned Badge */}
        {event.isPinned && (
          <div className="absolute top-3 sm:top-4 start-1/2 -translate-x-1/2 z-10">
            <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/90 text-white text-[10px] sm:text-xs font-black rounded-full shadow-lg backdrop-blur-md border border-amber-300/50">
              <Pin className="w-3 h-3 fill-current" />
              {isAr ? 'مميزة ومثبتة' : 'Featured'}
            </span>
          </div>
        )}

        {/* Floating Date Badge */}
        <div className="absolute top-3 sm:top-4 start-3 sm:start-4 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-1.5 sm:p-2 px-2.5 sm:px-3 text-center shadow-lg border border-white/20 z-10">
          <div className="text-[10px] sm:text-sm font-bold text-blue-600 leading-none mb-1">{month}</div>
          <div className="text-base sm:text-xl font-black text-slate-900 leading-none font-cairo">{day}</div>
        </div>

        {/* State Badge */}
        <div className="absolute top-3 sm:top-4 end-3 sm:end-4 z-10">
          <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold border shadow-md backdrop-blur-md bg-white/90 ${badgeColor.replace('bg-', 'text-').replace('text-', '')}`}>
            {badgeText}
          </span>
        </div>

        {/* Category Label overlay */}
        <div className="absolute bottom-3 sm:bottom-4 start-3 sm:start-4">
          <span className="px-2.5 sm:px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] sm:text-xs font-bold rounded-full tracking-wide">
            {event.type}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-6 flex flex-col grow">
        <h3 className="text-sm sm:text-xl font-black text-slate-900 mb-2 sm:mb-4 line-clamp-2 font-cairo group-hover:text-blue-600 transition-colors leading-tight">
          {title}
        </h3>

        <div className="space-y-1.5 sm:space-y-3 mb-3 sm:mb-6">
          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1.5 sm:me-3 shrink-0">
              <Calendar className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate">{formatDateSafe(eventDate, 'd MMMM yyyy', { locale: dateLocale })}</span>
          </div>

          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1.5 sm:me-3 shrink-0">
              <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate" dir="ltr">
              {formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })} <span className="hidden sm:inline">({event.durationHours}h)</span>
            </span>
          </div>

          <div className="flex items-center text-[10px] sm:text-sm text-slate-600">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center me-1.5 sm:me-3 shrink-0">
              <MapPin className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="font-medium truncate">{location}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2.5 sm:pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 sm:gap-2">
             <div className="hidden sm:flex -space-x-2 rtl:space-x-reverse">
                {/* Fake avatars to make it look active, or you could use actual users later */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center shrink-0">
                    <Users className="w-3 h-3 text-slate-400" />
                  </div>
                ))}
             </div>
             <div className="text-[10px] sm:text-xs font-bold text-slate-500">
               {capacityDisplay}
             </div>
          </div>
        </div>
      </div>

      {/* Button placed at the very bottom overlapping the card or completely full width */}
      <div className="p-2 sm:p-4 pt-0">
        <Link 
          href={`/events/${event.id}`}
          className="flex items-center justify-center w-full py-2 sm:py-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 gap-1.5 sm:gap-2"
        >
          <span>{isAr ? 'التفاصيل' : 'Details'}</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}
