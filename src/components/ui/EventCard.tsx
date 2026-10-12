import React from 'react';
import Image from 'next/image';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { MapPin, Calendar, Clock, Users, ArrowRight, Pin, Trophy, Award } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { eventCapacityLabel, eventStateLabel, eventTypeLabel } from '@/lib/studentExperience';

interface EventCardProps {
  event: PlatformEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const isAr = useLocale() === 'ar';
  const dateLocale = isAr ? ar : enUS;
  const title = isAr ? event.title : event.titleEn || event.title;
  const location = isAr ? event.location : event.locationEn || event.location;
  const badgeColor = event.state === 'Registration Open'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : event.state === 'Ongoing'
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : event.state === 'Published'
        ? 'bg-blue-50 text-blue-800 border-blue-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  const date = formatDateSafe(event.date, 'd MMMM yyyy', { locale: dateLocale });
  const time = formatDateSafe(event.date, 'HH:mm');
  const capacity = eventCapacityLabel(event, isAr);
  const hasReward = event.points > 0 || event.hasCertificate;

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md ${event.isPinned ? 'border-amber-300' : 'border-slate-200'}`}>
      <Link href={`/events/${event.id}`} tabIndex={-1} aria-hidden="true" className="relative block h-36 shrink-0 overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900 sm:h-40">
        {event.coverUrl ? (
          <Image src={event.coverUrl} alt="" fill quality={85} className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-size-[32px_32px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
        <div className="absolute start-3 top-3 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${badgeColor}`}>{eventStateLabel(event.state, isAr)}</span>
          {event.isPinned && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-900"><Pin aria-hidden="true" className="h-3.5 w-3.5" />{isAr ? 'مميزة' : 'Featured'}</span>}
        </div>
        <span className="absolute bottom-3 start-3 rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">{eventTypeLabel(event.type, isAr)}</span>
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
          <Link href={`/events/${event.id}`} className="rounded-sm transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{title}</Link>
        </h3>
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-2"><Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />{date || (isAr ? 'الموعد يُعلن لاحقًا' : 'Date to be announced')}</span>
            {time && <span className="inline-flex items-center gap-2"><Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" /><span dir="ltr">{time}</span></span>}
          </div>
          <div className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span className="break-words">{location || (isAr ? 'الموقع يُعلن لاحقًا' : 'Location to be announced')}</span></div>
        </div>
        {hasReward && (
          <div className="flex flex-wrap gap-2 text-sm">
            {event.points > 0 && <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 font-medium text-amber-900"><Trophy aria-hidden="true" className="h-4 w-4" />{event.points} {isAr ? 'نقطة حضور' : 'attendance points'}</span>}
            {event.hasCertificate && <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 font-medium text-blue-800"><Award aria-hidden="true" className="h-4 w-4" />{isAr ? 'شهادة حضور' : 'Attendance certificate'}</span>}
          </div>
        )}
      </div>
      <div className="mt-auto space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600"><Users aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />{capacity}</p>
        <Link href={`/events/${event.id}`} aria-label={isAr ? `تفاصيل ${title}` : `Details for ${title}`} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          {isAr ? 'تفاصيل الفعالية' : 'Event details'}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </article>
  );
}
