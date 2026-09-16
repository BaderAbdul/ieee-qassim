'use client';

import React from 'react';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';

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

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {users.length === 0 ? (
        <div className="p-16 text-center text-slate-500 font-medium">
          <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base">{isAr ? 'لا توجد نقاط مسجلة بعد. كن أول من يحصل على النقاط!' : 'No points recorded yet. Be the first to earn points!'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {users.map((u, idx) => {
            const isCurrentUser = user?.uid === u.id;
            return (
              <li 
                key={u.id} 
                className={`p-4 sm:p-6 flex items-center justify-between transition-colors ${
                  isCurrentUser ? 'bg-blue-50/70 border-s-4 border-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                
                {/* Rank & Student */}
                <div className="flex items-center gap-4 flex-grow text-start">
                  
                  {/* Rank Medal / Number */}
                  <div className="w-10 text-center font-bold text-lg flex-shrink-0">
                    {idx === 0 ? <Trophy className="h-7 w-7 text-amber-500 mx-auto" /> :
                     idx === 1 ? <Medal className="h-7 w-7 text-slate-400 mx-auto" /> :
                     idx === 2 ? <Medal className="h-7 w-7 text-amber-700 mx-auto" /> :
                     <span className="text-slate-400 font-bold text-base">#{idx + 1}</span>}
                  </div>
                  
                  {/* Avatar */}
                  <div className="h-12 w-12 relative rounded-2xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center overflow-hidden border border-blue-200 shadow-xs flex-shrink-0">
                    {u.photoUrl ? (
                      <Image src={u.photoUrl} alt={u.name} fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="text-lg">{u.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Name & Dept */}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 truncate">
                      <span className="truncate">{u.name}</span>
                      {isCurrentUser && (
                        <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                          {isAr ? 'أنت' : 'You'}
                        </span>
                      )}
                    </div>
                    {u.department && (
                      <span className="text-xs text-slate-500 block truncate">{u.department}</span>
                    )}
                  </div>
                </div>
                
                {/* Points Total */}
                <div className="text-end ps-4 flex-shrink-0">
                  <div className="font-black text-xl sm:text-2xl text-blue-700 font-cairo flex items-center justify-end gap-1">
                    <span>{u.points}</span>
                    <Award className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    {isAr ? 'نقطة معتمدة' : 'points'}
                  </div>
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
