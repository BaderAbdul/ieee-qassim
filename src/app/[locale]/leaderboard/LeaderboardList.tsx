'use client';

import React from 'react';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { competitionRanks } from '@/lib/studentExperience';
import { memberMajorLabel } from '@/lib/memberPresentation';

export interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  photoUrl?: string;
  department?: string;
}

export default function LeaderboardList({ users }: { users: LeaderboardUser[] }) {
  const { user } = useAuth();
  const isAr = useLocale() === 'ar';
  if (!users.length) return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">
      <Sparkles className="mx-auto mb-3 h-10 w-10 text-blue-400" aria-hidden="true" />
      <p>{isAr ? 'لم تُسجل نقاط بعد. شارك في فعالية وابدأ رحلتك!' : 'No points recorded yet. Join an event to get started!'}</p>
    </div>
  );

  const ranks = competitionRanks(users.map(member => member.points));
  const top3 = users.slice(0, 3);
  const remaining = users.slice(3);
  const you = <span className="inline-flex rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">{isAr ? 'أنت' : 'You'}</span>;
  return (
    <div className="space-y-5">
      <ol aria-label={isAr ? 'أعلى الأعضاء نقاطًا' : 'Highest scoring members'} className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end sm:gap-5">
        {top3.map((member, index) => {
          const first = index === 0;
          const current = member.id === user?.uid;
          const colors = first ? 'border-amber-300 bg-amber-50' : index === 1 ? 'border-slate-200 bg-white' : 'border-orange-200 bg-orange-50/40';
          return (
            <li key={member.id} value={ranks[index]} className={`rounded-2xl border p-4 sm:p-5 ${colors} ${first ? 'sm:order-2' : index === 1 ? 'sm:order-1' : 'sm:order-3'} ${current ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
              <div className="flex items-center gap-3 sm:flex-col sm:text-center">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${first ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                  {first ? <Trophy className="h-6 w-6" aria-hidden="true" /> : <Medal className="h-6 w-6" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1 sm:w-full">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600 sm:justify-center">
                    <bdi>#{ranks[index]}</bdi>{first && <span>{isAr ? 'المتصدر' : 'Leader'}</span>}{current && you}
                  </div>
                  <h2 className="break-words text-base font-bold leading-relaxed text-slate-900">{member.name}</h2>
                  {member.department && <p className="mt-1 break-words text-sm text-slate-600">{memberMajorLabel(member.department, isAr)}</p>}
                </div>
                <div className="shrink-0 text-center sm:mt-2">
                  <p className={`text-2xl font-bold ${first ? 'text-amber-800' : 'text-slate-800'}`}>{member.points}</p>
                  <p className="text-xs text-slate-600">{isAr ? 'نقطة' : 'points'}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {remaining.length > 0 && <ol start={4} aria-label={isAr ? 'بقية الترتيب' : 'Remaining members'} className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {remaining.map((member, index) => {
          const current = member.id === user?.uid;
          return (
            <li key={member.id} value={ranks[index + 3]} className={`flex items-center justify-between gap-3 p-4 ${current ? 'border-s-4 border-blue-600 bg-blue-50' : ''}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="w-7 shrink-0 pt-1 text-sm font-semibold text-slate-600"><bdi>#{ranks[index + 3]}</bdi></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-sm font-bold leading-relaxed text-slate-900">{member.name}</h2>{current && you}</div>
                  {member.department && <p className="mt-1 break-words text-sm text-slate-600">{memberMajorLabel(member.department, isAr)}</p>}
                </div>
              </div>
              <div className="shrink-0 text-end">
                <p className="flex items-center gap-1 text-lg font-bold text-blue-700">{member.points}<Award className="h-4 w-4 text-amber-600" aria-hidden="true" /></p>
                <p className="text-xs text-slate-500">{isAr ? 'نقطة' : 'points'}</p>
              </div>
            </li>
          );
        })}
      </ol>}
    </div>
  );
}
