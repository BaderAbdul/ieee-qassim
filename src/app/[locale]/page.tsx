import React from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Calendar, Trophy, ArrowRight, UserCircle, Users, LayoutList, Sparkles } from 'lucide-react';
import HeroUserCards from './HeroUserCards';
import HeroActionButtons from './HeroActionButtons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'Index' });

  let stats = { membersCount: '+500', eventsCount: '+25', adminsCount: '+40', featuredEventId: '', showStructure: true, heroTitle: '', heroSubtitleAr: '', heroSubtitleEn: '', committees: [] as any[] };
  let eventsList: PlatformEvent[] = [];
  let latestEvent: PlatformEvent | null = null;

  try {
    const statsDoc = await getDoc(doc(db, 'settings', 'homepage'));
    if (statsDoc.exists()) {
      stats = { ...stats, ...statsDoc.data() };
    }

    const validStates = ['Published', 'Registration Open', 'Ongoing', 'Completed', 'Registration Closed'];
    const eventsSnap = await getDocs(query(collection(db, 'events'), where('state', 'in', validStates)));

    const evs = eventsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    }) as PlatformEvent[];

    evs.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : (a.date as any)?.toDate?.() || new Date(0);
      const dateB = typeof b.date === 'string' ? new Date(b.date) : (b.date as any)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    eventsList = evs.slice(0, 3);

    let featuredId = stats.featuredEventId;
    if (featuredId) {
      const evDoc = await getDoc(doc(db, 'events', featuredId));
      if (evDoc.exists()) {
        const data = evDoc.data() as any;
        latestEvent = { 
          id: evDoc.id, 
          ...data,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
        } as PlatformEvent;
      } else if (evs.length > 0) {
        latestEvent = evs[0];
      }
    } else if (evs.length > 0) {
      latestEvent = evs[0];
    }
  } catch (error) {
    console.error("Error fetching homepage data:", error);
  }

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen">
      {/* Light Mode Premium Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-12 lg:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          <div className="flex flex-col space-y-6 text-center lg:text-start lg:rtl:text-right lg:ltr:text-left">
            <div>
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
                  {t('Hero.identityLabel')}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black mb-4 font-thmanyah text-slate-900 drop-shadow-sm uppercase tracking-tight">
                {t('Hero.headline')}
              </h1>
              <p className="text-slate-600 font-medium text-sm sm:text-base max-w-lg mx-auto lg:mx-0 mb-6 lg:mb-10 leading-relaxed">
                {t('Hero.description')}
              </p>
            </div>
            
            <HeroActionButtons />
          </div>
          
          <div className="relative block w-full h-[320px] lg:h-full lg:min-h-[500px] mt-4 lg:mt-0 flex items-center justify-center lg:block">
            <div className="relative w-full max-w-sm lg:max-w-none h-full">
               <HeroUserCards latestEvent={latestEvent} activeCard={null} setActiveCard={() => {}} />
            </div>
          </div>
        </div>
      </section>

      {/* Hero Stats Strip */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-8 mb-12">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 justify-center text-center sm:text-start">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-3xl font-black text-slate-900">{stats.membersCount || '+500'}</span>
              <span className="text-[9px] sm:text-sm font-bold text-slate-500 leading-tight">{isAr ? 'عضو مجتمع' : 'Members'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 justify-center text-center sm:text-start">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-3xl font-black text-slate-900">{stats.eventsCount || '+25'}</span>
              <span className="text-[9px] sm:text-sm font-bold text-slate-500 leading-tight">{isAr ? 'فعالية وورشة' : 'Events'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 justify-center text-center sm:text-start">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-3xl font-black text-slate-900">{stats.adminsCount || '+40'}</span>
              <span className="text-[9px] sm:text-sm font-bold text-slate-500 leading-tight">{isAr ? 'في الإدارة لخدمتكم' : 'Admins to serve'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Events Carousel Section */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{isAr ? 'أحدث الفعاليات' : 'Latest Events'}</h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">{isAr ? 'اكتشف وسجل في أحدث فعاليات وورش عمل النادي' : 'Discover and register for the latest club events and workshops'}</p>
          </div>
          <Link 
            href="/events"
            className="hidden sm:inline-flex items-center justify-center bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-colors"
          >
            {isAr ? 'استعرض الكل' : 'View All'}
            <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>

        {eventsList.length > 0 ? (
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory hide-scrollbar gap-6">
            {eventsList.map((event) => {
              const isCompleted = event.state === 'Completed' || event.state === 'Archived';
              return (
                <Link 
                  href={`/events/${event.id}`} 
                  key={event.id}
                  className={`min-w-[280px] sm:min-w-[340px] max-w-[340px] flex-shrink-0 snap-start bg-white rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 hover:shadow-xl transition-all flex flex-col overflow-hidden group ${isCompleted ? 'grayscale-[40%] opacity-90' : ''}`}
                >
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    {event.coverUrl ? (
                      <Image 
                        src={event.coverUrl} 
                        alt={isAr ? event.title : (event.titleEn || event.title)} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isCompleted ? 'blur-sm brightness-90' : ''}`} 
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br from-[#00629B] to-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ${isCompleted ? 'blur-sm brightness-90' : ''}`}>
                        <span className="text-white/30 font-black text-4xl uppercase tracking-widest">IEEE QU</span>
                      </div>
                    )}
                    <div className="absolute top-4 rtl:right-4 ltr:left-4">
                      <span className={`bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black px-3 py-1.5 rounded-full shadow-sm ${isCompleted ? 'opacity-80' : ''}`}>
                        {event.state === 'Registration Open' ? (isAr ? 'التسجيل مفتوح' : 'Registration Open') : 
                         event.state === 'Completed' ? (isAr ? 'منتهية' : 'Completed') :
                         event.state === 'Archived' ? (isAr ? 'مؤرشفة' : 'Archived') :
                         event.state === 'Ongoing' ? (isAr ? 'جاري الآن' : 'Ongoing') :
                         (isAr ? 'قريباً' : 'Coming Soon')}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col relative bg-white/60">
                    <div className="flex items-center text-xs font-bold text-slate-500 mb-3 gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        {new Date(event.date as any).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2">
                      {isAr ? event.title : (event.titleEn || event.title)}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                      {isAr ? event.description : (event.descriptionEn || event.description)}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        {isAr ? 'التفاصيل' : 'Details'}
                      </span>
                      <ArrowRight className="h-5 w-5 text-blue-600 rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200 border-dashed">
            <p className="text-slate-500 font-medium">{isAr ? 'لا توجد فعاليات حالياً' : 'No events available right now'}</p>
          </div>
        )}
        
        <div className="mt-2 text-center sm:hidden">
          <Link 
            href="/events"
            className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-5 py-3.5 rounded-xl font-bold hover:bg-blue-100 transition-colors w-full shadow-sm"
          >
            {isAr ? 'استعرض الكل' : 'View All'}
            <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>

      {/* Quick Links / Feature Highlights */}
      <section className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-8 sm:mb-12">
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <Link href={latestEvent ? `/events/${latestEvent.id}` : "/events"} className="bg-white rounded-2xl p-3 sm:p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-blue-100 transition-colors">
              <Calendar className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-black text-[10px] sm:text-xl leading-tight">{latestEvent ? (isAr ? 'الفعالية القادمة' : 'Next Event') : t('upcomingEvents')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('upcomingEventsDesc')}</p>
          </Link>
          
          <Link href="/leaderboard" className="bg-white rounded-2xl p-3 sm:p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-amber-100 transition-colors">
              <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-black text-[10px] sm:text-xl leading-tight">{t('leaderboard')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('leaderboardDesc')}</p>
          </Link>

          <Link href="/my-activity" className="bg-white rounded-2xl p-3 sm:p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-emerald-100 transition-colors">
              <UserCircle className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-slate-900 font-black text-[10px] sm:text-xl leading-tight">{t('activityAndCerts')}</h3>
            <p className="hidden sm:block text-slate-500 text-sm mt-2">{t('activityAndCertsDesc')}</p>
          </Link>
        </div>
      </section>

      {/* IEEE QU Structure */}
      {stats.showStructure !== false && (
        <section className="py-16 bg-white border-t border-slate-100 mt-8 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-50 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black font-cairo text-slate-900 mb-4">هيكلة النادي</h2>
              <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                يتكون الفرع الطلابي لجمعية مهندسي الكهرباء والإلكترونيات (IEEE) بجامعة القصيم من عدة لجان ومسارات تعمل بتكامل لتحقيق أهداف النادي.
              </p>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {stats.committees && stats.committees.length > 0 ? (
                stats.committees.map((committee: any, index: number) => {
                  const colors = ['blue', 'indigo', 'emerald', 'pink', 'amber', 'purple'];
                  const color = colors[index % colors.length];
                  
                  return (
                    <Link href="/structure" key={committee.id || index} className="bg-[#F8FAFC] border border-slate-100 rounded-2xl sm:rounded-3xl p-3 sm:p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
                      <div className={`h-10 w-10 sm:h-16 sm:w-16 bg-${color}-100 text-${color}-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-5 shadow-inner`}>
                        <Users className="w-5 h-5 sm:w-8 sm:h-8" />
                      </div>
                      <h3 className="text-[10px] sm:text-lg font-black font-cairo text-slate-900 mb-1 sm:mb-2 line-clamp-2">{committee.name}</h3>
                      <p className="hidden sm:block text-sm text-slate-500 mb-4">{committee.description}</p>
                      
                      {committee.members && committee.members.length > 0 && (
                        <div className="hidden sm:flex -space-x-2 rtl:space-x-reverse justify-center mt-2">
                          {committee.members.slice(0, 4).map((member: any) => (
                            <div key={member.userId} className={`h-8 w-8 rounded-full border-2 border-white bg-${color}-200 flex items-center justify-center text-xs font-bold text-${color}-700 overflow-hidden relative group`} title={member.name}>
                              {member.avatar ? (
                                <Image 
                                  src={member.avatar} 
                                  alt={member.name} 
                                  fill
                                  sizes="32px"
                                  className="object-cover" 
                                />
                              ) : (
                                <span>{member.name.charAt(0)}</span>
                              )}
                              <div className="absolute hidden group-hover:block bottom-full mb-1 w-max px-2 py-1 bg-gray-900 text-white text-[10px] rounded z-50">
                                {member.name} - {member.role}
                              </div>
                            </div>
                          ))}
                          {committee.members.length > 4 && (
                            <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              +{committee.members.length - 4}
                            </div>
                          )}
                        </div>
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
