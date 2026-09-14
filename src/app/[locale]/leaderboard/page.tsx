'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Trophy, Medal, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  photoUrl?: string;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Query users by totalPoints descending, limit to top 50
        // In a real production app we'd fetch usernames from a public profile collection
        // Since we don't store full names directly on the user doc natively (we might just have auth info),
        // for v1 we'll fetch the users collection which would have denormalized points and display names.
        const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
        const snap = await getDocs(q);
        
        const topUsers = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.displayName || 'طالب', // Fallback
            points: data.totalPoints || 0,
            photoUrl: data.photoUrl
          };
        }).filter(u => u.points > 0); // Only show users with > 0 points
        
        setUsers(topUsers);
      } catch (error) {
        console.error("Error fetching leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-yellow-100 rounded-full mb-6">
            <Trophy className="h-12 w-12 text-yellow-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 font-cairo mb-4">لوحة الشرف</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            تعرّف على أكثر الطلاب تفاعلاً ونشاطاً في مجتمع التكنولوجيا هذا الفصل الدراسي.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              لا توجد نقاط مسجلة بعد. كن أول من يحصل على النقاط!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((u, idx) => {
                const isCurrentUser = user?.uid === u.id;
                return (
                  <li key={u.id} className={`p-4 sm:p-6 flex items-center transition-colors ${isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    
                    {/* Rank */}
                    <div className="w-12 text-center font-bold text-lg flex-shrink-0">
                      {idx === 0 ? <Trophy className="h-8 w-8 text-yellow-500 mx-auto" /> :
                       idx === 1 ? <Medal className="h-8 w-8 text-gray-400 mx-auto" /> :
                       idx === 2 ? <Medal className="h-8 w-8 text-amber-700 mx-auto" /> :
                       <span className="text-gray-400">#{idx + 1}</span>}
                    </div>
                    
                    {/* User Info */}
                    <div className="ms-4 flex items-center flex-grow">
                      <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} className="h-full w-full object-cover" /> : 
                         <span className="text-lg">{u.name.charAt(0)}</span>}
                      </div>
                      <div className="ms-4">
                        <div className="font-bold text-gray-900 text-lg flex items-center">
                          {u.name}
                          {isCurrentUser && <span className="ms-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">أنت</span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Points */}
                    <div className="text-right">
                      <div className="font-bold text-2xl text-blue-700 font-cairo flex items-center">
                        {u.points}
                        <Award className="ms-1 h-5 w-5 text-blue-400" />
                      </div>
                      <div className="text-xs text-gray-500 font-medium">نقطة</div>
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
