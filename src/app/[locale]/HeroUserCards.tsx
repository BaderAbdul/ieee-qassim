'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { PlatformEvent } from '@/lib/types';
import { formatDateSafe } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Calendar, Clock, MapPin, Trophy, UserCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { eventStateLabel, registrationLabel } from '@/lib/studentExperience';

interface HeroUserCardsProps {
  latestEvent: (Omit<PlatformEvent, 'date'> & { date: unknown }) | null;
}

interface ActivitySummary {
  userId: string;
  eventId?: string;
  points: number;
  registration: string | null;
  certificateTitle: string | null;
  attended: boolean;
  rank: number | null;
  rankUnavailable: boolean;
  failed: boolean;
}

export default function HeroUserCards({ latestEvent }: HeroUserCardsProps) {
  const { user, userData, loading } = useAuth();
  const isAr = useLocale() === 'ar';
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const userId = user?.uid;
  const eventId = latestEvent?.id;
  const points = Number(userData?.totalPoints) || 0;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const fetchSummary = async () => {
      const summary: ActivitySummary = { userId, eventId, points, registration: null, certificateTitle: null, attended: false, rank: null, rankUnavailable: false, failed: false };
      try {
        const { collection, doc, getDoc, getDocs, getCountFromServer, query, where, limit, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        const [registration, certificate, attendance, rank, projection] = await Promise.allSettled([
          eventId ? getDoc(doc(db, 'registrations', `${eventId}_${userId}`)) : Promise.resolve(null),
          getDocs(query(collection(db, 'certificates'), where('userId', '==', userId), orderBy('issueDate', 'desc'), limit(5))),
          getDocs(query(collection(db, 'attendance_logs'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(1))),
          points > 0 ? getCountFromServer(query(collection(db, 'public_profiles'), where('totalPoints', '>', points))) : Promise.resolve(null),
          points > 0 ? getDoc(doc(db, 'public_profiles', userId)) : Promise.resolve(null),
        ]);
        if (registration.status === 'fulfilled' && registration.value?.exists()) summary.registration = registration.value.data().status;
        if (certificate.status === 'fulfilled') {
          const available = certificate.value.docs.find(item => item.data().status === 'Available');
          summary.certificateTitle = available?.data().eventTitle || null;
        }
        if (attendance.status === 'fulfilled') summary.attended = !attendance.value.empty;
        if (rank.status === 'fulfilled' && rank.value && projection.status === 'fulfilled' && projection.value?.exists() && Number(projection.value.data().totalPoints) === points) summary.rank = rank.value.data().count + 1;
        summary.rankUnavailable = points > 0 && summary.rank === null;
        summary.failed = [registration, certificate, attendance, rank].some(result => result.status === 'rejected');
      } catch {
        summary.failed = true;
        summary.rankUnavailable = points > 0;
      }
      if (alive) setActivity(summary);
    };
    void fetchSummary();
    return () => { alive = false; };
  }, [userId, eventId, points]);

  const summary = activity && activity.userId === userId && activity.eventId === eventId && activity.points === points ? activity : null;
  const pending = !!user && !summary;
  const activityText = summary?.certificateTitle
    ? (isAr ? 'شهادتك جاهزة للعرض' : 'Your certificate is ready')
    : summary?.registration
      ? registrationLabel(summary.registration, isAr)
      : summary?.attended
        ? (isAr ? 'حضورك موثّق' : 'Your attendance is verified')
        : summary?.failed
          ? (isAr ? 'افتح حسابك لمراجعة نشاطك' : 'Open your account to review activity')
          : (isAr ? 'تسجيلاتك وشهاداتك في مكان واحد' : 'Your registrations and certificates in one place');
  const title = latestEvent ? (isAr ? latestEvent.title : latestEvent.titleEn || latestEvent.title) : '';
  const location = latestEvent ? (isAr ? latestEvent.location : latestEvent.locationEn || latestEvent.location) : '';
  const dateLocale = isAr ? ar : enUS;

  return (
    <div className="w-full space-y-3 text-start">
      {latestEvent ? (
        <Link href={`/events/${latestEvent.id}`} className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-800 to-slate-900 sm:h-40">
            {latestEvent.coverUrl && <Image src={latestEvent.coverUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 520px" className="object-cover object-center" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
            <span className="absolute start-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-blue-700">{latestEvent.state === 'Ongoing' ? (isAr ? 'تجري الآن' : 'Happening now') : (isAr ? 'الفعالية القادمة' : 'Next event')}</span>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-blue-700">{eventStateLabel(latestEvent.state, isAr)}</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">{isAr ? 'التفاصيل' : 'Details'} <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" /></span>
            </div>
            <h2 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><Calendar aria-hidden="true" className="h-4 w-4 text-blue-600" />{formatDateSafe(latestEvent.date, 'd MMMM', { locale: dateLocale })}</span>
              <span className="inline-flex items-center gap-2"><Clock aria-hidden="true" className="h-4 w-4 text-blue-600" /><span dir="ltr">{formatDateSafe(latestEvent.date, 'HH:mm')}</span><span>{isAr ? 'بتوقيت الرياض' : 'Riyadh time'}</span></span>
              <span className="inline-flex min-w-0 items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" /><span className="break-words">{location}</span></span>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <Calendar aria-hidden="true" className="mb-3 h-7 w-7 text-blue-600" />
          <h2 className="mb-2 text-lg font-bold text-slate-900">{isAr ? 'فعاليات جديدة قريبًا' : 'New events coming soon'}</h2>
          <p className="text-sm leading-relaxed text-slate-600">{isAr ? 'تصفّح الفعاليات السابقة وتعرّف على أنشطة المجتمع.' : 'Explore past events and discover the community’s activities.'}</p>
          <Link href="/events" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-blue-700">{isAr ? 'استكشف الفعاليات' : 'Explore events'}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" /></Link>
        </div>
      )}

      {loading ? <div aria-label={isAr ? 'جارٍ تحميل حسابك' : 'Loading your account'} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" /> : user ? (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Link href="/leaderboard" className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <Trophy aria-hidden="true" className="h-6 w-6 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm text-slate-600">{isAr ? 'نقاطك' : 'Your points'}</p>
              <p className="text-xl font-bold text-slate-900">{points} <span className="text-sm font-medium">{isAr ? 'نقطة' : 'points'}</span></p>
              <p className="text-sm text-slate-600">{pending ? (isAr ? 'جارٍ تحميل المركز…' : 'Loading rank…') : summary?.rank ? (isAr ? `المركز ${summary.rank}` : `Rank ${summary.rank}`) : summary?.rankUnavailable ? (isAr ? 'المركز غير متاح الآن' : 'Rank unavailable') : (isAr ? 'ابدأ المشاركة لتحصل على مركز' : 'Participate to earn a rank')}</p>
            </div>
          </Link>
          <Link href="/profile" className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <UserCircle aria-hidden="true" className="h-6 w-6 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="mb-1 text-base font-bold text-slate-900">{isAr ? 'نشاطي وشهاداتي' : 'My activity'}</p>
              <p className="text-sm leading-relaxed text-slate-600">{pending ? (isAr ? 'جارٍ تحميل النشاط…' : 'Loading activity…') : activityText}</p>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
