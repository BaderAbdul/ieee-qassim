'use client';

import React from 'react';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { competitionRanks } from '@/lib/studentExperience';

export interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  photoUrl?: string;
  department?: string;
}

export default function LeaderboardList({ users }: { users: LeaderboardUser[] }) {
  const { user } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center text-slate-500 font-medium">
        <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-base">{isAr ? 'لا توجد نقاط مسجلة بعد. كن أول من يحصل على النقاط!' : 'No points recorded yet. Be the first to earn points!'}</p>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const remaining = users.slice(3);
  const ranks = competitionRanks(users.map(user => user.points));

  // Rearrange top3 for podium: 2nd place (idx 1), 1st place (idx 0), 3rd place (idx 2)
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="space-y-8">
      
      {/* Top 3 Podium Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-end pt-4">
        
        {/* 2nd Place (Silver) */}
        {second ? (
          <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center text-center relative shadow-sm hover:shadow-md transition-all">
            <div className="absolute -top-4 bg-slate-300 text-slate-800 text-xs font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
              <Medal className="h-3.5 w-3.5 text-slate-600" />
              <span>#{ranks[1]}</span>
            </div>
            <div className="mt-4 mb-2"></div>
            <h3 className="font-bold text-slate-900 text-base max-w-full truncate">{second.name}</h3>
            {second.department && <span className="text-xs text-slate-500 font-medium truncate max-w-full">{second.department}</span>}
            <div className="mt-3 bg-white px-4 py-1.5 rounded-xl border border-slate-200 text-slate-800 font-black text-lg flex items-center gap-1 shadow-2xs">
              <span>{second.points}</span>
              <Award className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        ) : <div className="hidden sm:block order-1" />}

        {/* 1st Place (Gold Champion) */}
        {first && (
          <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-50 to-amber-100/80 rounded-3xl border-2 border-amber-300 p-7 flex flex-col items-center text-center relative shadow-md hover:shadow-xl transition-all sm:-translate-y-3">
            <div className="absolute -top-5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 uppercase tracking-wide">
              <Trophy className="h-4 w-4" />
              <span>{isAr ? `المتصدر #${ranks[0]}` : `Leader #${ranks[0]}`}</span>
            </div>
            <div className="mt-4 mb-2"></div>
            <h3 className="font-black text-slate-900 text-lg max-w-full truncate">{first.name}</h3>
            {first.department && <span className="text-xs text-amber-800 font-bold truncate max-w-full">{first.department}</span>}
            <div className="mt-3 bg-amber-500 text-white px-5 py-2 rounded-xl font-black text-xl flex items-center gap-1.5 shadow-sm">
              <span>{first.points}</span>
              <Award className="h-5 w-5 text-amber-200" />
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {third ? (
          <div className="order-3 bg-gradient-to-b from-amber-900/5 to-amber-900/10 rounded-3xl border border-amber-800/20 p-6 flex flex-col items-center text-center relative shadow-sm hover:shadow-md transition-all">
            <div className="absolute -top-4 bg-amber-800 text-amber-100 text-xs font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
              <Medal className="h-3.5 w-3.5 text-amber-300" />
              <span>#{ranks[2]}</span>
            </div>
            <div className="mt-4 mb-2"></div>
            <h3 className="font-bold text-slate-900 text-base max-w-full truncate">{third.name}</h3>
            {third.department && <span className="text-xs text-slate-500 font-medium truncate max-w-full">{third.department}</span>}
            <div className="mt-3 bg-white px-4 py-1.5 rounded-xl border border-slate-200 text-amber-900 font-black text-lg flex items-center gap-1 shadow-2xs">
              <span>{third.points}</span>
              <Award className="h-4 w-4 text-amber-700" />
            </div>
          </div>
        ) : <div className="hidden sm:block order-3" />}

      </div>

      {/* Ranks 4+ List Container */}
      {remaining.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {remaining.map((u, idx) => {
              const rank = ranks[idx + 3];
              const isCurrentUser = user?.uid === u.id;
              return (
                <li 
                  key={u.id} 
                  className={`p-4 sm:p-5 flex items-center justify-between transition-colors ${
                    isCurrentUser ? 'bg-blue-50/80 border-s-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4 text-start min-w-0">
                    <span className="w-8 text-center font-bold text-slate-400 text-sm sm:text-base flex-shrink-0">
                      #{rank}
                    </span>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 truncate">
                        <span className="truncate">{u.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                            {isAr ? 'أنت' : 'You'}
                          </span>
                        )}
                      </div>
                      {u.department && (
                        <span className="text-xs text-slate-500 block truncate">{u.department}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-end ps-4 flex-shrink-0">
                    <div className="font-black text-lg sm:text-xl text-blue-700 font-cairo flex items-center justify-end gap-1">
                      <span>{u.points}</span>
                      <Award className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">
                      {isAr ? 'نقطة' : 'pts'}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </div>
  );
}
