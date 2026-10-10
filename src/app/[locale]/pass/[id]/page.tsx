'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import DigitalMemberCard from '@/components/ui/DigitalMemberCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserData } from '@/context/AuthContext';
import { toJsDate } from '@/lib/dateUtils';

export default function PublicPassPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => setUserId(p.id));
  }, [params]);

  const locale = useLocale();
  const isAr = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<(UserData & { name?: string }) | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userDocRef = doc(db, 'public_profiles', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          setError(isAr ? 'لم يتم العثور على هذا العضو.' : 'Member not found.');
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        setUserData(data as UserData);

        // Fetch rank
        const myPoints = data?.totalPoints || 0;
        const higherPointsQuery = query(
          collection(db, 'public_profiles'),
          where('totalPoints', '>', myPoints)
        );
        const rankCountSnap = await getCountFromServer(higherPointsQuery);
        setUserRank(rankCountSnap.data().count + 1);

      } catch (err) {
        console.error('Error fetching public pass:', err);
        setError(isAr ? 'حدث خطأ أثناء تحميل البطاقة.' : 'Failed to load pass.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, isAr]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" color="border-indigo-600" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-100">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error}</h2>
          <Link href="/" className="inline-block mt-4 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
            {isAr ? 'العودة للرئيسية' : 'Return Home'}
          </Link>
        </div>
      </div>
    );
  }

  // Mock User object for the component
  const mockUser = {
    uid: userId,
    photoURL: userData.publicProfile?.avatar || null,
    displayName: userData.arabicFullName || userData.name || '',
    metadata: {
      creationTime: toJsDate(userData.createdAt)?.toISOString() || new Date().toISOString()
    }
  } as User;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 mt-16 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-cairo text-slate-900 mb-2">
            {isAr ? 'البطاقة الرقمية للعضو' : 'Digital Member Pass'}
          </h1>
          <p className="text-slate-500">
            {isAr ? 'مجتمع التقنية الهندسي بجامعة القصيم' : 'IEEE Qassim University Student Branch'}
          </p>
        </div>

        <DigitalMemberCard 
          user={mockUser}
          userData={userData}
          rank={userRank}
          totalPoints={userData.totalPoints || 0}
          isPublicView={true}
        />

        <div className="text-center mt-8">
          <Link href="/" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            {isAr ? 'العودة للرئيسية' : 'Return Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
