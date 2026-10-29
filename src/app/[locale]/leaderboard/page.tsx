'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { apiGet } from '@/lib/backend';
import LeaderboardList, { LeaderboardUser } from './LeaderboardList';
import LeaderboardSkeleton from '@/components/skeletons/LeaderboardSkeleton';
import { useLocale } from 'next-intl';

export default function LeaderboardPage() {

  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await apiGet<Array<{ id: string; arabicFullName?: string; displayName?: string; totalPoints?: number; photoURL?: string; major?: string }>>('/api/public/leaderboard', { limit: '50' });
        if (!alive) return;
        const users = rows.map(data => ({
          id: data.id,
          name: data.arabicFullName || data.displayName || (isAr ? 'عضو' : 'Member'),
          points: data.totalPoints || 0,
          photoUrl: data.photoURL,
          department: data.major,
        })).filter(u => u.points > 0);
        setTopUsers(users);
        setLoadError(null);
        setLoading(false);
      } catch (error) {
        if (!alive) return;
        console.error("Error fetching leaderboard", error);
        setLoadError(error instanceof Error ? error : new Error('Unable to load leaderboard'));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isAr]);

  if (loadError) throw loadError;

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-amber-100 rounded-3xl mb-2 text-amber-600 shadow-xs">
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-cairo">
            {isAr ? 'المتصدرون' : 'Leaderboard'}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr 
              ? 'أعلى 50 عضوًا حسب مجموع نقاط المشاركة. أصحاب النقاط المتساوية يشتركون في الترتيب؛ وليست هذه لوحة فصلية.'
              : 'The top 50 members by lifetime participation points. Equal scores share a rank; this is not a semester-only board.'}
          </p>
        </div>

        {/* Board Container */}
        <LeaderboardList users={topUsers} />

      </div>
    </div>
  );
}
