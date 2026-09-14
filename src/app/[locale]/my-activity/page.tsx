'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { PlatformEvent, PointTransaction } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ar, enUS } from 'date-fns/locale';
import { Trophy, Award, Calendar, ExternalLink, Activity, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateSafe, toJsDate } from '@/lib/dateUtils';

interface CertificateData {
  id: string;
  eventId: string;
  eventTitle: string;
  issueDate?: unknown;
  createdAt?: unknown;
  status?: string;
}

interface RegistrationWithEvent {
  status: string;
  timestamp: unknown;
  event: PlatformEvent;
  certificate?: CertificateData;
}

export default function MyActivityPage() {
  const { user, userData, loading: authLoading, login } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  const t = useTranslations('Activity');

  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'points' | 'certificates'>('events');
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const fetchData = async () => {
      try {
        // Fetch Registrations
        const regQ = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const regSnap = await getDocs(regQ);
        
        // Fetch Certificates to match with events
        const certQ = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const certSnap = await getDocs(certQ);
        const certsData = certSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CertificateData[];
        const certsByEvent = certsData.reduce((acc, cert) => {
          acc[cert.eventId] = cert;
          return acc;
        }, {} as Record<string, CertificateData>);

        const regsData: RegistrationWithEvent[] = [];
        for (const regDoc of regSnap.docs) {
          const regInfo = regDoc.data();
          const eventDoc = await getDoc(doc(db, 'events', regInfo.eventId));
          if (eventDoc.exists()) {
            regsData.push({
              status: regInfo.status,
              timestamp: regInfo.timestamp || regInfo.registeredAt,
              event: { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent,
              certificate: certsByEvent[eventDoc.id]
            });
          }
        }
        
        regsData.sort((a, b) => {
          const tA = toJsDate(a.timestamp)?.getTime() || 0;
          const tB = toJsDate(b.timestamp)?.getTime() || 0;
          return tB - tA;
        });
        if (active) setRegistrations(regsData);

        // Fetch Point Transactions
        const ptQ = query(collection(db, 'point_transactions'), where('userId', '==', user.uid));
        const ptSnap = await getDocs(ptQ);
        const ptsData = ptSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PointTransaction[];
        
        ptsData.sort((a, b) => {
          const tA = toJsDate(a.createdAt)?.getTime() || 0;
          const tB = toJsDate(b.createdAt)?.getTime() || 0;
          return tB - tA;
        });
        if (active) setTransactions(ptsData);

        // Sort Certificates for display
        const sortedCerts = [...certsData].sort((a, b) => {
          const tA = toJsDate(a.issueDate || a.createdAt)?.getTime() || 0;
          const tB = toJsDate(b.issueDate || b.createdAt)?.getTime() || 0;
          return tB - tA;
        });
        if (active) setCertificates(sortedCerts);

      } catch (error) {
        console.error("Error fetching activity data", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [user]);

  const handleDownloadCertificate = async (certificateId: string) => {
    try {
      setDownloadingCert(certificateId);
      const getCertUrl = httpsCallable(functions, 'getCertificateDownloadUrl');
      const result = await getCertUrl({ certificateId });
      const { downloadUrl, url } = (result.data as { downloadUrl?: string; url?: string }) || {};
      const targetUrl = downloadUrl || url;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      } else {
        alert(isAr ? 'الشهادة قيد التجهيز من قبل المنظمين.' : 'Certificate is being processed.');
      }
    } catch (error: unknown) {
      console.error("Error opening certificate:", error);
      alert(isAr ? 'تعذر فتح الشهادة حالياً. يرجى المحاولة لاحقاً.' : 'Unable to view certificate.');
    } finally {
      setDownloadingCert(null);
    }
  };

  const isPageLoading = authLoading || (!!user && loading);

  if (isPageLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" color="border-blue-600" />
        <p className="mt-4 text-slate-600 text-sm font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 text-center px-4">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-3 font-cairo text-slate-800">
            {isAr ? 'يرجى تسجيل الدخول' : 'Sign In Required'}
          </h2>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            {isAr ? 'يجب عليك تسجيل الدخول لرؤية نشاطك وفعالياتك ونقاطك.' : 'Please sign in to view your activity history, events, and certificates.'}
          </p>
          <button 
            onClick={login} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-blue-500/20 transition-colors"
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Profile Header Summary */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden gap-6">
          <div className="absolute top-0 end-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -me-32 -mt-32 opacity-50 pointer-events-none" />
          
          <div className="flex items-center relative z-10 w-full md:w-auto">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-md flex-shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="ms-5 text-start">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-cairo leading-tight">{displayName}</h1>
                <Link href="/profile" className="text-xs text-blue-600 hover:underline font-bold">
                  {isAr ? '(الملف الهندسي)' : '(Profile)'}
                </Link>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{user.email}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 px-7 py-4 rounded-2xl flex items-center shadow-lg shadow-blue-500/20 w-full md:w-auto relative z-10 text-white">
            <div className="bg-white/20 p-3 rounded-xl me-4">
              <Trophy className="h-7 w-7 text-yellow-300" />
            </div>
            <div className="text-start">
              <div className="text-xs text-blue-100 font-medium mb-0.5">{t('totalPoints')}</div>
              <div className="text-3xl font-black font-cairo">{userData?.totalPoints || 0}</div>
            </div>
          </div>
        </div>

        {/* Main Tabs Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'events' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{t('tabs.events')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'events' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {registrations.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'points' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{t('tabs.points')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'points' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {transactions.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('certificates')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'certificates' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{t('tabs.certificates')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'certificates' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {certificates.length}
              </span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                {registrations.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <Calendar className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{t('noEvents')}</h3>
                    <Link href="/events" className="mt-4 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-xs">
                      {isAr ? 'تصفح الفعاليات' : 'Browse Events'}
                    </Link>
                  </div>
                ) : (
                  registrations.map((reg, idx) => (
                    <div 
                      key={idx} 
                      className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50/50 hover:border-blue-100 transition-all shadow-xs flex flex-col gap-4 text-start"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <Link 
                              href={`/events/${reg.event.id}`}
                              className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors block"
                            >
                              {isAr ? reg.event.title : (reg.event.titleEn || reg.event.title)}
                            </Link>
                            <div className="flex items-center text-xs text-slate-500 mt-1">
                              <Clock className="h-3.5 w-3.5 me-1 text-slate-400" />
                              <span>{formatDateSafe(reg.timestamp, 'dd MMMM yyyy', { locale: dateLocale })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start md:self-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            reg.status === 'approved' || reg.status === 'attended' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : reg.status === 'waitlisted' 
                                ? 'bg-amber-100 text-amber-800' 
                                : reg.status === 'cancelled' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-slate-100 text-slate-700'
                          }`}>
                            {reg.status === 'approved' ? t('statusApproved') :
                             reg.status === 'waitlisted' ? t('statusWaitlisted') :
                             reg.status === 'cancelled' ? t('statusCancelled') :
                             reg.status === 'attended' ? (isAr ? 'تم الحضور' : 'Attended') : reg.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* Certificate status if available */}
                      {reg.certificate && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{isAr ? 'شهادة الحضور معتمدة' : 'Verified Certificate Available'}</span>
                          </span>
                          <button
                            onClick={() => handleDownloadCertificate(reg.certificate!.id)}
                            disabled={downloadingCert === reg.certificate.id}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>{isAr ? 'عرض الشهادة' : 'View Certificate'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Points Tab */}
            {activeTab === 'points' && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <Trophy className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{t('noPoints')}</h3>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          <ArrowUpRight className={`h-5 w-5 ${tx.amount < 0 ? 'rotate-90' : ''}`} />
                        </div>
                        <div>
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold mb-1 ${
                            tx.source === 'attendance' ? 'bg-blue-100 text-blue-800' : 
                            tx.source === 'manual_adjustment' ? 'bg-purple-100 text-purple-800' : 
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.source === 'attendance' ? t('sourceAttendance') : 
                             tx.source === 'manual_adjustment' ? t('sourceManual') : 
                             tx.source === 'attendance_override' ? t('sourceOverride') : 'System'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{tx.reason}</h4>
                          <p className="text-xs text-slate-400 flex items-center mt-0.5">
                            <Clock className="h-3 w-3 me-1" />
                            <span>{formatDateSafe(tx.createdAt, 'dd MMMM yyyy HH:mm', { locale: dateLocale })}</span>
                          </p>
                        </div>
                      </div>

                      <div className={`font-black text-xl font-cairo ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 text-center py-16 flex flex-col items-center">
                    <Award className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{t('noCertificates')}</h3>
                  </div>
                ) : (
                  certificates.map((cert) => (
                    <div 
                      key={cert.id} 
                      className="border border-emerald-100 bg-emerald-50/20 rounded-2xl p-5 hover:bg-emerald-50/50 transition-colors space-y-4 text-start"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                            <Award className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={cert.eventTitle}>
                              {cert.eventTitle}
                            </h4>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {formatDateSafe(cert.issueDate || cert.createdAt, 'dd MMMM yyyy', { locale: dateLocale })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDownloadCertificate(cert.id)}
                        disabled={downloadingCert === cert.id}
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {downloadingCert === cert.id ? (
                          <>
                            <LoadingSpinner size="sm" color="border-white" className="me-1.5" />
                            <span>{isAr ? 'جاري الفتح...' : 'Opening...'}</span>
                          </>
                        ) : (
                          <>
                            <span>{isAr ? 'عرض الشهادة المعتمدة' : 'View Accredited Certificate'}</span>
                            <ExternalLink className="h-3.5 w-3.5 ms-1" />
                          </>
                        )}
                      </button>
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
