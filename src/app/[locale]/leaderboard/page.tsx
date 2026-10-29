import React from 'react';
import { Trophy } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { API_BASE_URL } from '@/lib/apiBase';
import LeaderboardList, { type LeaderboardUser } from './LeaderboardList';

export const revalidate = 30;

type LeaderboardRow = { id: string; arabicFullName?: string; displayName?: string; totalPoints?: number; major?: string };

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isAr = locale === 'ar';
  const response = await fetch(`${API_BASE_URL}/api/public/leaderboard?limit=50`, {
    next: { revalidate: 30 }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Unable to load leaderboard');
  const rows = await response.json() as LeaderboardRow[];
  if (!Array.isArray(rows)) throw new Error('Invalid leaderboard response');
  // The API orders by points DESC, then ID: preserve its deterministic tie order.
  const topUsers: LeaderboardUser[] = rows.filter(row => (row.totalPoints ?? 0) > 0).map(row => ({
    id: row.id,
    name: row.arabicFullName || row.displayName || (isAr ? 'عضو' : 'Member'),
    points: row.totalPoints ?? 0,
    department: row.major,
  }));

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
              ? 'أعلى 50 عضوًا حسب مجموع نقاط المشاركة. عند تساوي النقاط، يُحافظ على ترتيب ثابت.'
              : 'Top 50 members by lifetime participation points. Members with equal scores have a consistent order.'}
          </p>
        </div>

        {/* Board Container */}
        <LeaderboardList users={topUsers} />

      </div>
    </div>
  );
}

