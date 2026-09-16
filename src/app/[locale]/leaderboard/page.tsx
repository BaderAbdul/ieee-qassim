import React from 'react';
import { Trophy } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import LeaderboardList, { LeaderboardUser } from './LeaderboardList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const isAr = resolvedParams.locale === 'ar';

  let topUsers: LeaderboardUser[] = [];
  try {
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
    const snap = await getDocs(q);
      
    topUsers = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.arabicFullName || data.displayName || (isAr ? 'عضو' : 'Member'),
        points: data.totalPoints || 0,
        photoUrl: data.photoURL || data.photoUrl,
        department: data.department
      };
    }).filter(u => u.points > 0);
  } catch (error) {
    console.error("Error fetching leaderboard", error);
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
