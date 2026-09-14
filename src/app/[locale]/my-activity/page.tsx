'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Trophy, Award, Calendar, ExternalLink, Activity, ArrowUpRight, Clock } from 'lucide-react';
import { useLocale } from 'next-intl';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RegistrationWithEvent {
  status: string;
  timestamp: any;
  event: PlatformEvent;
  certificate?: Certificate;
}

import { PointTransaction } from '@/lib/types';

interface Certificate {
  id: string;
  eventId: string;
  eventTitle: string;
  issueDate: any;
  fileUrl: string;
  status?: string;
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
        // Fetch Certificates to match with events
        const certQ = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const certSnap = await getDocs(certQ);
        const certsData = certSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Certificate[];
        const certsByEvent = certsData.reduce((acc, cert) => {
          acc[cert.eventId] = cert;
          return acc;
        }, {} as Record<string, Certificate>);

        for (const regDoc of regSnap.docs) {
          const regInfo = regDoc.data();
          // Fetch event details for each registration
          const eventDoc = await getDoc(doc(db, 'events', regInfo.eventId));
          if (eventDoc.exists()) {
            regsData.push({
              status: regInfo.status,
              timestamp: regInfo.timestamp,
              event: { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent,
              certificate: certsByEvent[eventDoc.id]
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

        // Sort Certificates for display
        const sortedCerts = [...certsData].sort((a, b) => {
          const tA = a.issueDate?.toDate()?.getTime() || 0;
          const tB = b.issueDate?.toDate()?.getTime() || 0;
          return tB - tA;
        });
        setCertificates(sortedCerts);

      } catch (error) {
        console.error("Error fetching activity data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);

  const handleDownloadCertificate = async (certificateId: string) => {
    try {
      setDownloadingCert(certificateId);
      const getCertUrl = httpsCallable(functions, 'getCertificateDownloadUrl');
      const result = await getCertUrl({ certificateId });
      const { url } = result.data as { url: string };
      window.open(url, '_blank');
    } catch (error: any) {
      alert(error.message || 'Error downloading certificate');
    } finally {
      setDownloadingCert(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" color="border-blue-600" />
        <p className="mt-4 text-blue-600 font-medium">جاري تحميل بيانات النشاط...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4 font-cairo text-slate-800">يرجى تسجيل الدخول</h2>
          <p className="text-slate-600 mb-8">يجب عليك تسجيل الدخول لرؤية نشاطك وفعالياتك ونقاطك.</p>
          <Link href="/login" className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
          
          <div className="flex items-center mb-6 md:mb-0 relative z-10 w-full md:w-auto">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md flex-shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="text-4xl text-blue-600 font-bold font-cairo">{user.displayName?.[0] || 'U'}</div>
              )}
            </div>
            <div className="ms-6">
              <h1 className="text-3xl font-bold text-slate-900 font-cairo mb-1">{user.displayName}</h1>
              <p className="text-slate-500">{user.email}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-5 rounded-2xl flex items-center shadow-lg shadow-blue-500/20 w-full md:w-auto relative z-10 text-white">
            <div className="bg-white/20 p-3 rounded-xl rtl:ml-5 ltr:mr-5">
              <Trophy className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <div className="text-sm text-blue-100 font-medium mb-1">مجموع النقاط</div>
              <div className="text-4xl font-extrabold font-cairo">{userData?.totalPoints || 0}</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-5 font-bold text-center transition-all text-lg font-cairo ${activeTab === 'events' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              الفعاليات <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs rtl:mr-2 ltr:ml-2 ${activeTab === 'events' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{registrations.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-5 font-bold text-center transition-all text-lg font-cairo ${activeTab === 'points' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              سجل النقاط <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs rtl:mr-2 ltr:ml-2 ${activeTab === 'points' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{transactions.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('certificates')}
              className={`flex-1 py-5 font-bold text-center transition-all text-lg font-cairo ${activeTab === 'certificates' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              الشهادات <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs rtl:mr-2 ltr:ml-2 ${activeTab === 'certificates' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{certificates.length}</span>
            </button>
          </div>

          <div className="p-8">
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                {registrations.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <Calendar className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">لا توجد فعاليات مسجلة</h3>
                    <p className="text-slate-500 mb-6">لم تقم بالتسجيل في أي فعالية حتى الآن. تصفح الفعاليات المتاحة وسجل الآن!</p>
                    <Link href="/events" className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors">
                      تصفح الفعاليات
                    </Link>
                  </div>
                ) : (
                  registrations.map((reg, idx) => (
                    <Link key={idx} href={`/events/${reg.event.id}`} className="group block border border-slate-100 rounded-2xl p-5 hover:bg-slate-50 hover:border-blue-100 transition-all shadow-sm hover:shadow-md relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center">
                          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center me-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Calendar className="h-7 w-7" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{locale === 'en' ? reg.event.titleEn : reg.event.title}</h4>
                            <div className="flex items-center text-sm text-slate-500">
                              <Clock className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
                              {reg.timestamp?.toDate ? format(reg.timestamp.toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}
                            </div>
                          </div>
                        </div>
                        <div className={`self-start md:self-center px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${
                            reg.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                            reg.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            reg.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {reg.status === 'approved' ? 'تم القبول' :
                           reg.status === 'waitlisted' ? 'قائمة الانتظار' :
                           reg.status === 'cancelled' ? 'ملغى' : reg.status}
                        </div>
                      </div>
                      
                      {/* Certificate Status Section */}
                      {reg.event.state === 'Completed' && reg.status === 'approved' && (
                        <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end w-full">
                          {!reg.certificate || reg.certificate.status === 'Not Issued' ? (
                            <span className="text-sm text-slate-400 font-medium">الشهادة قيد التجهيز</span>
                          ) : reg.certificate.status === 'Generating' ? (
                            <span className="text-sm text-blue-600 animate-pulse font-medium flex items-center">
                              <LoadingSpinner size="sm" color="border-blue-600" className="rtl:ml-2 ltr:mr-2" />
                              جاري إصدار الشهادة...
                            </span>
                          ) : reg.certificate.status === 'Failed' ? (
                            <span className="text-sm text-red-600 font-medium">حدث خطأ في إصدار الشهادة</span>
                          ) : reg.certificate.status === 'Revoked' ? (
                            <span className="text-sm text-slate-400 line-through font-medium">تم إلغاء الشهادة</span>
                          ) : reg.certificate.status === 'Available' ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault(); // Prevent navigating to event page
                                handleDownloadCertificate(reg.certificate!.id);
                              }}
                              disabled={downloadingCert === reg.certificate.id}
                              className="text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-colors disabled:opacity-50"
                            >
                              {downloadingCert === reg.certificate.id ? (
                                <>
                                  <LoadingSpinner size="sm" color="border-current" className="rtl:ml-2 ltr:mr-2" />
                                  جاري الفتح...
                                </>
                              ) : (
                                <>
                                  <Award className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                  عرض الشهادة
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Points Tab */}
            {activeTab === 'points' && (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <Trophy className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">لا يوجد سجل للنقاط</h3>
                    <p className="text-slate-500">احضر الفعاليات واجمع النقاط لرفع مستواك.</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="border border-slate-100 rounded-2xl p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-start">
                        <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center rtl:ml-4 ltr:mr-4 ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {tx.amount > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5 rotate-90" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tx.source === 'attendance' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                              tx.source === 'manual_adjustment' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {tx.source === 'attendance' ? 'حضور فعالية' : tx.source === 'manual_adjustment' ? 'تعديل إداري' : 'نظام'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg mb-1">{tx.reason}</h4>
                          <p className="text-sm text-slate-500 flex items-center">
                            <Clock className="h-3.5 w-3.5 rtl:ml-1 ltr:mr-1" />
                            {(tx.createdAt as any)?.toDate ? format((tx.createdAt as any).toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`font-black text-2xl font-cairo ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 text-center py-16 flex flex-col items-center">
                    <Award className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">لا توجد شهادات</h3>
                    <p className="text-slate-500">احضر الفعاليات للحصول على شهادات حضور معتمدة.</p>
                  </div>
                ) : (
                  certificates.map((cert) => (
                    <div key={cert.id} className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                      <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-700 relative flex items-center justify-center p-6">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                        <Award className="h-16 w-16 text-white opacity-80" />
                      </div>
                      <div className="p-6">
                        <h4 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2" title={cert.eventTitle}>{cert.eventTitle}</h4>
                        <div className="flex flex-col gap-1 mb-6 text-sm text-slate-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            الإصدار: {cert.issueDate?.toDate ? format(cert.issueDate.toDate(), 'dd MMMM yyyy', { locale: dateLocale }) : ''}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDownloadCertificate(cert.id)}
                          disabled={downloadingCert === cert.id}
                          className="w-full inline-flex items-center justify-center bg-green-50 text-green-700 hover:bg-green-600 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {downloadingCert === cert.id ? (
                            <>
                              <LoadingSpinner size="sm" color="border-current" className="rtl:ml-2 ltr:mr-2" />
                              جاري الفتح...
                            </>
                          ) : (
                            <>
                              عرض الشهادة الأصلية <ExternalLink className="rtl:mr-2 ltr:ml-2 h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
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
