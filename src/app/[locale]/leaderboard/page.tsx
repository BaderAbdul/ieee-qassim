'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import LeaderboardList, { LeaderboardUser } from './LeaderboardList';
import LeaderboardSkeleton from '@/components/skeletons/LeaderboardSkeleton';
import { useLocale } from 'next-intl';

export default function LeaderboardPage() {

  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'public_profiles'), orderBy('totalPoints', 'desc'), limit(50));
    return onSnapshot(q, snap => {
          
        const users = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.arabicFullName || data.displayName || (isAr ? 'عضو' : 'Member'),
            points: data.totalPoints || 0,
            photoUrl: data.photoURL || data.photoUrl,
            department: data.major || data.department
          };
        }).filter(u => u.points > 0);
        
        setTopUsers(users);
        setLoadError(null);
        setLoading(false);
      }, error => {
        console.error("Error fetching leaderboard", error);
        setLoadError(error instanceof Error ? error : new Error('Unable to load leaderboard'));
        setLoading(false);
      });
  }, [isAr, reloadKey]);

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-2xl text-amber-700">
            <Trophy className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-cairo">
            {isAr ? 'المتصدرون' : 'Leaderboard'}
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr 
              ? 'أعلى 50 عضوًا حسب مجموع نقاط المشاركة.'
              : 'The top 50 members by participation points.'}
          </p>
          <details className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-3 text-start text-sm text-slate-600">
            <summary className="min-h-6 cursor-pointer font-semibold text-blue-700">{isAr ? 'كيف يُحسب الترتيب؟' : 'How are ranks calculated?'}</summary>
            <p className="mt-3 leading-relaxed">{isAr ? 'يُرتب الأعضاء بحسب مجموع نقاط المشاركة طوال مدة العضوية. النقاط المتساوية تشترك في المركز نفسه، مثل 1، 1، 3. يظهر فقط الأعضاء الذين لديهم نقاط وملف عام متاح.' : 'Members are ranked by their lifetime participation points. Equal scores share the same rank, such as 1, 1, 3. Members appear when they have points and an available public profile.'}</p>
          </details>
        </div>

        {/* Board Container */}
        {loadError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="flex items-center gap-2"><AlertCircle className="h-5 w-5" aria-hidden="true" />{isAr ? 'تعذر تحميل لوحة الشرف حاليًا.' : 'The leaderboard could not be loaded.'}</p><button type="button" onClick={() => { setLoading(true); setLoadError(null); setReloadKey(key => key + 1); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold"><RefreshCw className="h-4 w-4" aria-hidden="true" />{isAr ? 'إعادة المحاولة' : 'Retry'}</button></div> : <LeaderboardList users={topUsers} />}

      </div>
    </div>
  );
}
