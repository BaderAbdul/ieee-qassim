import React from 'react';
import Image from 'next/image';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';

interface EventCardProps {
  event: PlatformEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const locale = useLocale();
  const t = useTranslations('Events');
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  // Format dates securely
  const eventDate = event.date;
  
  // Determine badge styling based on state
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
  const description = isAr ? event.description : event.descriptionEn || event.description;
  const location = isAr ? event.location : event.locationEn || event.location;

  return (
    <Link href={`/events/${event.id}`} className="block group h-full">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-xl group-hover:border-blue-100">
        
        {/* Banner Image / Abstract Pattern */}
        <div className="h-48 w-full bg-gradient-to-r from-blue-700 to-indigo-700 relative overflow-hidden flex-shrink-0">
          {event.coverUrl && (
            <Image
              src={event.coverUrl}
              alt={title}
              fill
              className="object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-pattern-${event.id}`} width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-pattern-${event.id})`} />
            </svg>
          </div>

          <div className="absolute top-4 end-4 flex flex-col gap-2 z-10">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
          
          <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent">
            <span className="inline-block text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-1 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
              {event.type}
            </span>
            <h3 className="text-xl font-extrabold text-white line-clamp-1 font-cairo">
              {title}
            </h3>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 flex flex-col flex-grow text-start">
          <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
            {description}
          </p>
          
          <div className="space-y-2.5 mt-auto pt-4 border-t border-slate-100">
            <div className="flex items-center text-xs sm:text-sm text-slate-500">
              <Calendar className="h-4 w-4 me-2 text-blue-600 flex-shrink-0" />
              <span>{formatDateSafe(eventDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}</span>
            </div>
            
            <div className="flex items-center text-xs sm:text-sm text-slate-500">
              <Clock className="h-4 w-4 me-2 text-blue-600 flex-shrink-0" />
              <span dir="ltr" className="text-start">
                {formatDateSafe(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours}h)
              </span>
            </div>
            
            <div className="flex items-center text-xs sm:text-sm text-slate-500">
              <MapPin className="h-4 w-4 me-2 text-blue-600 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 pt-3 border-t border-slate-50">
              <div className="flex items-center font-medium">
                <Users className="h-4 w-4 me-1.5 text-slate-400" />
                <span>{t('capacity')}: {event.capacity}</span>
              </div>
              <div className="font-bold text-blue-600 group-hover:text-blue-700 transition-colors inline-flex items-center gap-1">
                <span>{t('details')}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}
