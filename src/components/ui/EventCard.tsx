import React from 'react';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';

interface EventCardProps {
  event: PlatformEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;

  // Format dates securely checking existence
  const eventDate = event.date instanceof Date ? event.date : (event.date as any)?.toDate?.() || new Date();
  
  // Determine badge styling based on state
  let badgeColor = 'bg-gray-100 text-gray-800';
  let badgeText: string = event.state;
  
  if (event.state === 'Published') {
    badgeColor = 'bg-blue-100 text-blue-800';
    badgeText = locale === 'ar' ? 'نشر قريبًا' : 'Coming Soon';
  } else if (event.state === 'Registration Open') {
    badgeColor = 'bg-green-100 text-green-800';
    badgeText = locale === 'ar' ? 'التسجيل متاح' : 'Registration Open';
  } else if (event.state === 'Registration Closed') {
    badgeColor = 'bg-orange-100 text-orange-800';
    badgeText = locale === 'ar' ? 'التسجيل مغلق' : 'Registration Closed';
  } else if (event.state === 'Ongoing') {
    badgeColor = 'bg-yellow-100 text-yellow-800';
    badgeText = locale === 'ar' ? 'جاري الآن' : 'Ongoing';
  } else if (event.state === 'Completed') {
    badgeColor = 'bg-gray-100 text-gray-800';
    badgeText = locale === 'ar' ? 'مكتمل' : 'Completed';
  }

  const title = locale === 'ar' ? event.title : event.titleEn || event.title;
  const description = locale === 'ar' ? event.description : event.descriptionEn || event.description;
  const location = locale === 'ar' ? event.location : event.locationEn || event.location;

  return (
    <Link href={`/events/${event.id}`} className="block group h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-xl group-hover:border-blue-100">
        
        {/* Banner Image Placeholder or Real Image */}
        <div className="h-48 w-full bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
          {event.coverUrl && (
            <img src={event.coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-500" />
          )}
          {/* Abstract pattern */}
          <div className="absolute inset-0 opacity-20">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>
          </div>
          <div className="absolute top-4 rtl:left-4 ltr:right-4 flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <h3 className="text-xl font-bold text-white line-clamp-2">
              {title}
            </h3>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
            {description}
          </p>
          
          <div className="space-y-2 mt-auto pt-4 border-t border-gray-50">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 rtl:ml-2 ltr:mr-2 text-blue-500" />
              <span>{format(eventDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 rtl:ml-2 ltr:mr-2 text-blue-500" />
              <span dir="ltr" className="rtl:text-right w-full">{format(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours}h)</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 rtl:ml-2 ltr:mr-2 text-blue-500" />
              <span className="truncate">{location}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <div className="flex items-center">
                <Users className="h-4 w-4 rtl:ml-2 ltr:mr-2 text-blue-500" />
                <span>السعة: {event.capacity}</span>
              </div>
              <div className="font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                {locale === 'ar' ? 'التفاصيل ←' : 'Details →'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
