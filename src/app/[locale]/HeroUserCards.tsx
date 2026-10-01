'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Trophy, UserCircle, Pin } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface HeroUserCardsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  latestEvent: any | null;
}

export default function HeroUserCards({ latestEvent }: HeroUserCardsProps) {
  const { user, userData } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [latestEventRegStatus, setLatestEventRegStatus] = useState<string | null>(null);
  const [latestCert, setLatestCert] = useState<{title: string, date: string} | null>(null);
  const [latestAttendance, setLatestAttendance] = useState<{title: string, date: string} | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user && latestEvent) {
      const fetchRegStatus = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client');
          const regDoc = await getDoc(doc(db, 'registrations', `${latestEvent.id}_${user.uid}`));
          if (regDoc.exists()) {
            setLatestEventRegStatus(regDoc.data().status);
          }
        } catch(e) {}
      }
      fetchRegStatus();
    }
  }, [user, latestEvent]);

  useEffect(() => {
    if (user) {
      const fetchActivityAndRank = async () => {
        try {
          const { collection, query, getDocs, where, limit, orderBy, getCountFromServer } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client');

          // Fetch Certificates
          const certQ = query(
            collection(db, 'certificates'),
            where('userId', '==', user.uid),
            orderBy('issuedAt', 'desc'),
            limit(1)
          );
          
          // Fetch Attendance
          const attQ = query(
            collection(db, 'attendance_logs'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(1)
          );

          const [certSnap, attSnap] = await Promise.all([
            getDocs(certQ),
            getDocs(attQ)
          ]);

          if (!certSnap.empty) {
            const data = certSnap.docs[0].data();
            setLatestCert({ title: data.eventTitle || (isAr ? 'شهادة مشاركة' : 'Certificate of Participation'), date: isAr ? 'شهادة معتمدة صدرت' : 'Certificate Issued' });
          }

          if (!attSnap.empty) {
            setLatestAttendance({ title: isAr ? 'حضور موثّق' : 'Attendance Verified', date: isAr ? 'تم توثيق حضورك بنجاح' : 'Check-in successful' });
          }

          // Fetch Rank accurately for logged-in user
          if (user && userData !== undefined) {
            const pts = typeof userData?.totalPoints === 'number' ? userData.totalPoints : 0;
            const rankQuery = query(
              collection(db, 'users'),
              where('totalPoints', '>', pts)
            );
            const rankCountSnap = await getCountFromServer(rankQuery);
            setUserRank(rankCountSnap.data().count + 1);
          } else {
            setUserRank(null);
          }

        } catch (e) {
          console.error('Error fetching activity data', e);
        } finally {
          setLoadingData(false);
        }
      };
      fetchActivityAndRank();
    } else {
      setLoadingData(false);
    }
  }, [user, userData, isAr]);

  const handleCardClick = (cardId: number, path: string) => {
    if (activeCard === cardId || window.innerWidth >= 1024) {
      if (path.startsWith('http')) {
        window.location.href = path;
      } else {
        router.push(path);
      }
    } else {
      setActiveCard(cardId);
    }
  };

  const coverUrl = latestEvent?.coverUrl || latestEvent?.imageUrl || latestEvent?.image;

  return (
    <>
      {/* Card 1: Featured Event (Top Right) */}
      <div 
        className={`absolute top-0 lg:top-4 rtl:left-2 lg:rtl:left-0 lg:ltr:right-0 ltr:-right-2 w-72 lg:w-80 bg-white/80 backdrop-blur-md rounded-3xl p-4 lg:p-5 shadow-2xl transition-all duration-300 group cursor-pointer ${
          latestEvent?.isPinned 
            ? 'ring-2 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] border-amber-300' 
            : 'border border-white/60 shadow-blue-900/15 hover:shadow-blue-500/20'
        } transform hover:-translate-y-2 lg:hover:z-50 ${activeCard === 1 ? 'z-50 scale-105' : 'z-30'}`}
        onClick={() => { if(latestEvent) handleCardClick(1, `/events/${latestEvent.id}`) }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-50/90 text-blue-700 text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full border border-blue-200/50">
              {latestEvent?.state === 'Ongoing' ? (isAr ? 'جاري الآن' : 'Ongoing') : (latestEvent?.state === 'Registration Open' ? (isAr ? 'التسجيل مفتوح' : 'Open') : (isAr ? 'قريباً' : 'Soon'))}
            </span>
            {latestEvent?.isPinned && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                <Pin className="w-2.5 h-2.5 fill-current" />
                {isAr ? 'مثبتة' : 'Pinned'}
              </span>
            )}
          </div>
          <div className="bg-slate-100/90 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
            {latestEvent ? (latestEvent.date as any)?.toDate?.()?.toLocaleDateString(isAr ? 'ar-SA' : 'en-US') || new Date(latestEvent.date as any).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '---'}
          </div>
        </div>

        {/* Poster Card Container */}
        <div className="w-full h-28 lg:h-36 rounded-2xl mb-3 relative overflow-hidden bg-slate-900 shadow-inner group-hover:shadow-lg transition-shadow">
           {coverUrl ? (
             <Image 
               src={coverUrl}
               alt={latestEvent ? (latestEvent.title || '') : ''}
               fill
               className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
               sizes="(max-width: 768px) 100vw, 320px"
             />
           ) : (
             <div className="absolute inset-0 bg-gradient-to-br from-[#00629B] via-indigo-800 to-purple-900">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15"></div>
             </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none" />
           <div className="absolute bottom-3 right-3 left-3 z-10">
             <h4 className="text-white font-black text-sm lg:text-base leading-snug drop-shadow-md truncate font-cairo">
               {latestEvent ? (isAr ? latestEvent.title : (latestEvent.titleEn || latestEvent.title)) : (isAr ? 'لا توجد فعاليات' : 'No Events')}
             </h4>
             <p className="text-blue-200 text-[10px] lg:text-xs font-medium mt-0.5">
               {latestEvent ? `${latestEvent.registeredCount || 0} ${isAr ? 'مسجل' : 'Registered'}` : ''}
             </p>
           </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2 rtl:space-x-reverse">
            <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-100 shadow-xs"></div>
            <div className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100 shadow-xs"></div>
            <div className="h-6 w-6 rounded-full border-2 border-white bg-purple-100 shadow-xs"></div>
          </div>
          <span className="text-[10px] lg:text-xs font-bold text-slate-500">
            {latestEvent ? `+${latestEvent.registeredCount || 0} ${isAr ? 'انضموا' : 'Joined'}` : ''}
          </span>
        </div>
      </div>

      {/* Card 2: Points / Leaderboard */}
      <div 
        className={`absolute top-28 lg:top-32 rtl:-right-2 lg:rtl:-right-8 ltr:-left-2 lg:ltr:-left-8 w-56 lg:w-64 bg-white/70 backdrop-blur-md rounded-3xl p-4 lg:p-5 shadow-xl shadow-slate-200/50 border border-white/60 transform -rotate-2 hover:rotate-0 hover:-translate-y-1 hover:shadow-yellow-500/10 lg:hover:z-50 transition-all duration-300 cursor-pointer ${activeCard === 2 ? 'z-50 scale-105 rotate-0' : 'z-20'}`}
        onClick={() => handleCardClick(2, '/leaderboard')}
      >
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-2.5 lg:p-3.5 rounded-2xl text-amber-600 shadow-sm">
            <Trophy className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <div className="flex-1">
            <div className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'نقاطك' : 'Your Points'}</div>
            {loadingData ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded-md mt-1 mb-2"></div>
            ) : (
              <div className="text-lg lg:text-2xl font-black text-slate-800 font-cairo flex items-baseline gap-1">
                {user && userData ? userData.totalPoints || 0 : 0} <span className="text-[10px] font-bold text-emerald-500">Pts</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="text-[10px] lg:text-xs font-bold text-slate-500">
                {userRank ? (isAr ? `المركز: ${userRank}` : `Rank: ${userRank}`) : (user ? (isAr ? 'بدون مركز' : 'Unranked') : (isAr ? 'سجل دخولك' : 'Login'))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Activity/Certificate */}
      <div 
        className={`absolute top-56 lg:top-auto lg:bottom-10 rtl:left-6 lg:rtl:left-12 ltr:right-6 lg:ltr:right-12 w-60 lg:w-72 bg-[#002855]/70 backdrop-blur-md rounded-3xl p-4 lg:p-5 shadow-2xl shadow-blue-900/40 border-t border-l border-white/20 transform rotate-2 hover:rotate-0 hover:-translate-y-1 hover:shadow-blue-400/20 lg:hover:z-50 transition-all duration-300 cursor-pointer ${activeCard === 3 ? 'z-50 scale-105 rotate-0' : 'z-40'}`}
        onClick={() => handleCardClick(3, '/profile')}
      >
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="bg-blue-500/20 p-2 lg:p-2.5 rounded-2xl text-blue-300 ring-1 ring-white/10">
              <UserCircle className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div>
              <div className="text-xs lg:text-sm font-bold text-white tracking-wide">{isAr ? 'نشاطك' : 'Activity'}</div>
              <div className="text-[8px] lg:text-[9px] text-blue-300 font-medium">
                {latestCert 
                  ? latestCert.date
                  : latestAttendance
                    ? latestAttendance.date
                    : latestEventRegStatus === 'approved'
                      ? (isAr ? 'تم تأكيد تسجيلك' : 'Registration Confirmed')
                      : latestEventRegStatus === 'pending'
                        ? (isAr ? 'تسجيلك قيد المراجعة' : 'Registration Pending')
                        : latestEventRegStatus === 'waitlisted'
                          ? (isAr ? 'أنت في قائمة الانتظار' : 'You are Waitlisted')
                          : user
                            ? (isAr ? 'لا يوجد نشاط حديث' : 'No recent activity') 
                            : (isAr ? 'مجتمع تقني تفاعلي' : 'Interactive Community')}
              </div>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 lg:p-3 border border-white/10 flex items-center gap-2.5 lg:gap-3">
          <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-inner flex-shrink-0">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="truncate">
            {loadingData ? (
              <>
                <div className="h-3 w-24 bg-white/20 animate-pulse rounded mb-1.5"></div>
                <div className="h-2 w-16 bg-white/10 animate-pulse rounded"></div>
              </>
            ) : (
              <>
                <div className="text-[9px] lg:text-[10px] font-bold text-white truncate">
                  {latestCert 
                    ? latestCert.title 
                    : latestAttendance
                      ? latestAttendance.title
                      : latestEventRegStatus
                        ? latestEvent?.title
                        : (user ? (isAr ? 'حضور الفعاليات يمنحك شهادات' : 'Attend events to earn certificates') : (isAr ? 'اكتشف فعالياتنا وانضم إلينا' : 'Discover and join our events'))}
                </div>
                <div className="text-[8px] lg:text-[9px] text-emerald-400 font-medium mt-0.5 truncate">{latestCert ? (isAr ? 'متاحة للتحميل' : 'Ready to download') : latestAttendance ? (isAr ? 'تم تسجيل نقاطك' : 'Points awarded') : latestEventRegStatus ? (isAr ? 'الفعالية القادمة' : 'Upcoming Event') : ''}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
