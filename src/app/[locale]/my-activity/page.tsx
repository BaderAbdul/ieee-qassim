'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/context/AuthContext';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Trophy, Award, Calendar, ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

interface RegistrationWithEvent {
  status: string;
  timestamp: any;
  event: PlatformEvent;
}

import { PointTransaction } from '@/lib/types';

interface Certificate {
  id: string;
  eventId: string;
  eventTitle: string;
  issueDate: any;
  fileUrl: string;
}

export default function MyActivityPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;

  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'points' | 'certificates'>('events');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Registrations
        const regQ = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const regSnap = await getDocs(regQ);
        
        const regsData: RegistrationWithEvent[] = [];
        for (const regDoc of regSnap.docs) {
          const regInfo = regDoc.data();
          // Fetch event details for each registration
          const eventDoc = await getDoc(doc(db, 'events', regInfo.eventId));
          if (eventDoc.exists()) {
            regsData.push({
              status: regInfo.status,
              timestamp: regInfo.timestamp,
              event: { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent
            });
          }
        }
        
        regsData.sort((a, b) => {
          const tA = a.timestamp?.toDate()?.getTime() || 0;
          const tB = b.timestamp?.toDate()?.getTime() || 0;
          return tB - tA;
        });
        setRegistrations(regsData);

        // Fetch Point Transactions
        const ptQ = query(collection(db, 'point_transactions'), where('userId', '==', user.uid));
        const ptSnap = await getDocs(ptQ);
        const ptsData = ptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PointTransaction[];
        ptsData.sort((a, b) => {
          const tA = (a.createdAt as any)?.toDate()?.getTime() || 0;
          const tB = (b.createdAt as any)?.toDate()?.getTime() || 0;
          return tB - tA;
        });
        setTransactions(ptsData);

        // Fetch Certificates
        const certQ = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const certSnap = await getDocs(certQ);
        const certsData = certSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Certificate[];
        certsData.sort((a, b) => {
          const tA = a.issueDate?.toDate()?.getTime() || 0;
          const tB = b.issueDate?.toDate()?.getTime() || 0;
          return tB - tA;
        });
        setCertificates(certsData);

      } catch (error) {
        console.error("Error fetching activity data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <h2 className="text-2xl font-bold mb-4 font-cairo">يرجى تسجيل الدخول</h2>
        <p className="text-gray-600 mb-6">يجب عليك تسجيل الدخول لرؤية نشاطك.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
              {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : <div className="text-3xl text-blue-600 font-bold">{user.displayName?.[0] || 'U'}</div>}
            </div>
            <div className="ms-6">
              <h1 className="text-2xl font-bold text-gray-900 font-cairo">{user.displayName}</h1>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 px-8 py-4 rounded-xl flex items-center shadow-inner">
            <Trophy className="h-10 w-10 text-yellow-500 me-4" />
            <div>
              <div className="text-sm text-blue-800 font-medium">مجموع النقاط</div>
              <div className="text-3xl font-bold text-blue-900">{userData?.totalPoints || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${activeTab === 'events' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              الفعاليات ({registrations.length})
            </button>
            <button 
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${activeTab === 'points' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              سجل النقاط ({transactions.length})
            </button>
            <button 
              onClick={() => setActiveTab('certificates')}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${activeTab === 'certificates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              الشهادات ({certificates.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'events' && (
              <div className="space-y-4">
                {registrations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">لم تقم بالتسجيل في أي فعالية حتى الآن.</div>
                ) : (
                  registrations.map((reg, idx) => (
                    <Link key={idx} href={`/events/${reg.event.id}`} className="block border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center me-4">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{locale === 'en' ? reg.event.titleEn : reg.event.title}</h4>
                          <p className="text-sm text-gray-500">{reg.timestamp?.toDate ? format(reg.timestamp.toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                          reg.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                          reg.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                        {reg.status}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'points' && (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">لا يوجد سجل للنقاط حتى الآن.</div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${tx.source === 'attendance' ? 'bg-blue-100 text-blue-700' : tx.source === 'manual_adjustment' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                            {tx.source === 'attendance' ? 'حضور' : tx.source === 'manual_adjustment' ? 'تعديل يدوي' : 'إدارة'}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900">{tx.reason}</h4>
                        <p className="text-sm text-gray-500">{(tx.createdAt as any)?.toDate ? format((tx.createdAt as any).toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}</p>
                      </div>
                      <div className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'certificates' && (
              <div className="space-y-4">
                {certificates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">لا توجد شهادات متوفرة.</div>
                ) : (
                  certificates.map((cert) => (
                    <div key={cert.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center me-4">
                          <Award className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{cert.eventTitle}</h4>
                          <p className="text-sm text-gray-500">تم الإصدار في {cert.issueDate?.toDate ? format(cert.issueDate.toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}</p>
                        </div>
                      </div>
                      <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm font-medium">
                        عرض الشهادة <ExternalLink className="ms-1 h-4 w-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
