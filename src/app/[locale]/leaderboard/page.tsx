'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
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
            department: data.department
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
              ? 'تعرّف على الأعضاء الأكثر تميزاً وتفاعلاً في فعاليات وأنشطة مجتمع IEEE هذا الفصل.' 
              : 'Recognizing the most active and distinguished members in IEEE community events this semester.'}
          </p>
        </div>

        {/* Board Container */}
        <LeaderboardList users={topUsers} />

      </div>
    </div>
  );
}
