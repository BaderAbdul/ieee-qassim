import React from 'react';
import { PlatformEvent } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import dynamic from 'next/dynamic';
import { Calendar, Trophy, ArrowRight, UserCircle, Users } from 'lucide-react';

const HeroUserCards = dynamic(() => import('./HeroUserCards'), { ssr: true });
const HeroActionButtons = dynamic(() => import('./HeroActionButtons'), { ssr: true });
import EventCard from '@/components/ui/EventCard';
import { toJsDate } from '@/lib/dateUtils';

export const revalidate = 60; // Enable ISR, cache for 60 seconds

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'Index' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stats = { membersCount: '+500', eventsCount: '+25', adminsCount: '+40', featuredEventId: '', showStructure: true, heroTitle: '', heroSubtitleAr: '', heroSubtitleEn: '', committees: [] as any[] };
  let eventsList: PlatformEvent[] = [];
  let latestEvent: PlatformEvent | null = null;

  // Capture one request time so ongoing and future sections agree.
  // eslint-disable-next-line react-hooks/purity -- Server render time determines the upcoming query.
  const now = Date.now();
  const activeStates = ['Published', 'Registration Open', 'Registration Closed', 'Ongoing'];
  let candidates: PlatformEvent[] = [];
  let recentEvents: PlatformEvent[] = [];

  const serializeEvent = (id: string, data: Record<string, unknown>): PlatformEvent => ({
    ...data,
    id,
    date: toJsDate(data.date)?.toISOString() ?? data.date,
    createdAt: toJsDate(data.createdAt)?.toISOString() ?? data.createdAt,
    updatedAt: toJsDate(data.updatedAt)?.toISOString() ?? data.updatedAt,
  }) as unknown as PlatformEvent;
  const canFeature = (event: PlatformEvent) => event.hideFromDiscovery !== true && activeStates.includes(event.state) && (event.state === 'Ongoing' || (toJsDate(event.date)?.getTime() ?? 0) >= now);

  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    if (!adminDb) throw new Error('Homepage server data is unavailable.');
    const [statsDoc, futureSnap, ongoingSnap, recentSnap] = await Promise.all([
      adminDb.collection('settings').doc('homepage').get(),
      adminDb.collection('events').where('state', 'in', activeStates).where('date', '>=', new Date(now)).orderBy('date', 'asc').limit(12).get(),
      adminDb.collection('events').where('state', '==', 'Ongoing').orderBy('date', 'desc').limit(3).get(),
      adminDb.collection('events').where('state', '==', 'Completed').orderBy('date', 'desc').limit(6).get(),
    ]);
    if (statsDoc.exists) stats = { ...stats, ...statsDoc.data() };
    candidates = [...ongoingSnap.docs, ...futureSnap.docs].map(doc => serializeEvent(doc.id, doc.data()));
    recentEvents = recentSnap.docs.map(doc => serializeEvent(doc.id, doc.data()));
    if (stats.featuredEventId) {
      const featured = await adminDb.collection('events').doc(stats.featuredEventId).get();
      if (featured.exists) {
        const event = serializeEvent(featured.id, featured.data() ?? {});
        if (canFeature(event)) latestEvent = event;
      }
    }
  } catch (error) {
    console.warn('Homepage server data unavailable; using the public event query.', error);
    const { collection, getDocs, doc, getDoc, query, where, limit, orderBy } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/client');
    const [statsDoc, futureSnap, ongoingSnap, recentSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'homepage')),
      getDocs(query(collection(db, 'events'), where('state', 'in', activeStates), where('date', '>=', new Date(now)), orderBy('date', 'asc'), limit(12))),
      getDocs(query(collection(db, 'events'), where('state', '==', 'Ongoing'), orderBy('date', 'desc'), limit(3))),
      getDocs(query(collection(db, 'events'), where('state', '==', 'Completed'), orderBy('date', 'desc'), limit(6))),
    ]);
    if (statsDoc.exists()) stats = { ...stats, ...statsDoc.data() };
    candidates = [...ongoingSnap.docs, ...futureSnap.docs].map(doc => serializeEvent(doc.id, doc.data()));
    recentEvents = recentSnap.docs.map(doc => serializeEvent(doc.id, doc.data()));
    if (stats.featuredEventId) {
      const featured = await getDoc(doc(db, 'events', stats.featuredEventId));
      if (featured.exists()) {
        const event = serializeEvent(featured.id, featured.data());
        if (canFeature(event)) latestEvent = event;
      }
    }
  }
  if (latestEvent) candidates.push(latestEvent);
  const uniqueCandidates = [...new Map(candidates.filter(canFeature).map(event => [event.id, event])).values()];
  eventsList = uniqueCandidates.sort((a, b) => {
    if (a.state === 'Ongoing' && b.state !== 'Ongoing') return -1;
    if (a.state !== 'Ongoing' && b.state === 'Ongoing') return 1;
    return (toJsDate(a.date)?.getTime() ?? 0) - (toJsDate(b.date)?.getTime() ?? 0);
  }).slice(0, 3);
  latestEvent = eventsList[0] ?? null;
  recentEvents = recentEvents.filter(event => event.hideFromDiscovery !== true).slice(0, 3);

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen">
      {/* Light Mode Premium Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-6 lg:pt-32 lg:pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(37,99,235,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          <div className="flex flex-col space-y-3 sm:space-y-4 text-center lg:text-start lg:rtl:text-right lg:ltr:text-left">
            <div>
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-3 sm:mb-4 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
                  {t('Hero.identityLabel')}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-3 font-thmanyah text-slate-900 tracking-tight leading-tight">
                {stats.heroTitle?.trim() || t('Hero.headline')}
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-lg mx-auto lg:mx-0 mb-3 lg:mb-6 leading-relaxed">
                {(isAr ? stats.heroSubtitleAr : stats.heroSubtitleEn)?.trim() || t('Hero.description')}
              </p>
            </div>
            
            <HeroActionButtons />
            <Link href="/help" className="text-sm font-semibold text-blue-700 underline underline-offset-4">{isAr ? 'كيف أسجّل وأحصل على النقاط والشهادة؟' : 'How do registration, points and certificates work?'}</Link>
          </div>
          
          <div className="w-full mt-2 lg:mt-0">
            <HeroUserCards latestEvent={latestEvent} />
          </div>
        </div>
      </section>



      <section className="max-w-7xl mx-auto w-full px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="upcoming-events-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="upcoming-events-title" className="mb-1 text-2xl font-bold text-slate-900 sm:text-3xl">{isAr ? 'القادمة والجارية' : 'Upcoming and ongoing'}</h2>
            <p className="text-base text-slate-600">{isAr ? 'اختر فعالية واطّلع على طريقة المشاركة.' : 'Choose an event and see how to take part.'}</p>
          </div>
          <Link href="/events" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-base font-semibold text-blue-700 hover:bg-blue-50">
            {isAr ? 'كل الفعاليات' : 'All events'}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>

        {eventsList.length > 0 ? (
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {eventsList.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-base text-slate-700">{isAr ? 'لا توجد فعاليات قادمة معلنة حاليًا. تابعنا لمعرفة الموعد القادم.' : 'No upcoming events have been announced yet. Check back for the next date.'}</p>
          </div>
        )}
      </section>

      {recentEvents.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="past-events-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="past-events-title" className="mb-1 text-2xl font-bold text-slate-900">{isAr ? 'من فعالياتنا السابقة' : 'From our past events'}</h2>
              <p className="text-base text-slate-600">{isAr ? 'تعرّف على اللقاءات والورش التي شارك فيها المجتمع.' : 'Explore the talks and workshops the community took part in.'}</p>
            </div>
            <Link href="/events?view=past" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-base font-semibold text-blue-700 hover:bg-blue-50">{isAr ? 'أرشيف الفعاليات' : 'Event archive'}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" /></Link>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {recentEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* Quick Links / Feature Highlights */}
      <section className="py-6 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-6 sm:mb-10">
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <Link href={latestEvent ? `/events/${latestEvent.id}` : "/events"} className="bg-gradient-to-b from-white to-slate-50 rounded-2xl p-3 sm:p-8 shadow-sm hover:shadow-md border border-slate-200/80 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-1.5 sm:top-3 end-1.5 sm:end-3 text-slate-300 group-hover:text-blue-500 transition-colors">
              <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5 rtl:-scale-x-100" />
            </div>
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 shadow-inner">
              <Calendar className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-bold text-sm sm:text-xl leading-snug group-hover:text-blue-700 transition-colors">{latestEvent ? (latestEvent.state === 'Ongoing' ? (isAr ? 'الفعالية الجارية' : 'Ongoing event') : (isAr ? 'الفعالية القادمة' : 'Next event')) : t('upcomingEvents')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('upcomingEventsDesc')}</p>
          </Link>
          
          <Link href="/leaderboard" className="bg-gradient-to-b from-white to-slate-50 rounded-2xl p-3 sm:p-8 shadow-sm hover:shadow-md border border-slate-200/80 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-1.5 sm:top-3 end-1.5 sm:end-3 text-slate-300 group-hover:text-amber-500 transition-colors">
              <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5 rtl:-scale-x-100" />
            </div>
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-amber-100 group-hover:scale-110 transition-all duration-300 shadow-inner">
              <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-bold text-sm sm:text-xl leading-snug group-hover:text-amber-700 transition-colors">{t('leaderboard')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('leaderboardDesc')}</p>
          </Link>

          <Link href="/profile" className="bg-gradient-to-b from-white to-slate-50 rounded-2xl p-3 sm:p-8 shadow-sm hover:shadow-md border border-slate-200/80 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-1.5 sm:top-3 end-1.5 sm:end-3 text-slate-300 group-hover:text-emerald-500 transition-colors">
              <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5 rtl:-scale-x-100" />
            </div>
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-300 shadow-inner">
              <UserCircle className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-bold text-sm sm:text-xl leading-snug group-hover:text-emerald-700 transition-colors">{t('activityAndCerts')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('activityAndCertsDesc')}</p>
          </Link>
        </div>
      </section>

      {/* IEEE QU Structure */}
      {stats.showStructure !== false && (
        <section className="py-10 sm:py-16 bg-white border-t border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-50 rounded-full pointer-events-none opacity-60"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-4">{isAr ? 'فريق المجتمع' : 'Community team'}</h2>
              <p className="text-slate-500 font-medium text-sm sm:text-base max-w-2xl mx-auto">
                {isAr ? 'تعرّف على لجان الفرع الطلابي ومسارات العمل في جامعة القصيم.' : 'Meet the student branch committees and teams at Qassim University.'}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
              {stats.committees && stats.committees.length > 0 ? (
                stats.committees.map((committee: { id: string; name: string; description: string; members: { userId: string; name: string; role: string; avatar?: string }[] }, index: number) => {
                  const themePalette = [
                    { badge: 'bg-blue-100 text-blue-600', avatar: 'bg-blue-200 text-blue-700' },
                    { badge: 'bg-indigo-100 text-indigo-600', avatar: 'bg-indigo-200 text-indigo-700' },
                    { badge: 'bg-emerald-100 text-emerald-600', avatar: 'bg-emerald-200 text-emerald-700' },
                    { badge: 'bg-purple-100 text-purple-600', avatar: 'bg-purple-200 text-purple-700' },
                    { badge: 'bg-amber-100 text-amber-600', avatar: 'bg-amber-200 text-amber-700' },
                    { badge: 'bg-pink-100 text-pink-600', avatar: 'bg-pink-200 text-pink-700' }
                  ];
                  const theme = themePalette[index % themePalette.length];
                  
                  return (
                    <Link href="/structure" key={committee.id || index} className="w-[45%] sm:w-[22%] group bg-white border border-slate-100 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                      <div className={`h-12 w-12 sm:h-14 sm:w-14 ${theme.badge} rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold font-cairo text-slate-900 mb-2">{committee.name}</h3>
                      {committee.members && committee.members.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-500 text-[10px] sm:text-xs font-medium border border-slate-100 mt-auto">
                          <Users className="w-3 h-3" />
                          {committee.members.length} {isAr ? 'أعضاء' : 'Members'}
                        </span>
                      )}
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  {isAr ? 'لم يتم إضافة لجان بعد.' : 'No committees added yet.'}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
