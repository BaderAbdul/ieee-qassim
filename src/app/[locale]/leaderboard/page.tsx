'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  photoUrl?: string;
  department?: string;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    let active = true;

    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
        const snap = await getDocs(q);
        
        const topUsers = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.arabicFullName || data.displayName || (isAr ? 'طالب هندسي' : 'Engineering Student'),
            points: data.totalPoints || 0,
            photoUrl: data.photoURL || data.photoUrl,
            department: data.department
          };
        }).filter(u => u.points > 0);
        
        if (active) setUsers(topUsers);
      } catch (error) {
        console.error("Error fetching leaderboard", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchLeaderboard();

    return () => {
      active = false;
    };
  }, [isAr]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <span className="text-sm font-medium text-slate-500">{isAr ? 'جاري تحميل لوحة الشرف...' : 'Loading leaderboard...'}</span>
      </div>
    );
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
            {isAr ? 'لوحة الشرف الهندسية' : 'Engineering Leaderboard'}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr 
              ? 'تعرّف على أكثر طلاب الهندسة تميزاً وتفاعلاً في فعاليات وأنشطة مجتمع IEEE هذا الفصل.' 
              : 'Recognizing the most active and distinguished engineering students in IEEE community events this semester.'}
          </p>
        </div>

        {/* Board Container */}
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
                      <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center overflow-hidden border border-blue-200 shadow-xs flex-shrink-0">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt={u.name} className="h-full w-full object-cover" />
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

      </div>
    </div>
  );
}
