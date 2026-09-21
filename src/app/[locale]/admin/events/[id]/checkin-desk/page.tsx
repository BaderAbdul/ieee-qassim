'use client';

import React, { useEffect, useState, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { QRCodeSVG } from 'qrcode.react';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { Loader2, ArrowRight, QrCode, Link as LinkIcon, UserCheck, ShieldCheck, CheckCircle2, XCircle, Camera } from 'lucide-react';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
  loading: () => <div className="p-8 text-center bg-slate-50 rounded-2xl animate-pulse text-slate-500 text-sm font-bold">جاري تحميل الكاميرا...</div>,
});

export default function CheckinDeskPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const { user, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  
  // Manual Entry State
  const [manualInput, setManualInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'already_checked_in' | null, message: string }>({ status: null, message: '' });
  const [showCamera, setShowCamera] = useState(false);

  // Self Check-in Link
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const selfCheckinUrl = event?.checkinToken ? `${baseUrl}/${locale}/events/${eventId}/checkin?token=${event.checkinToken}` : '';

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }
      } catch (error) {
        console.error("Error fetching event", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleManualSubmit = async (e?: React.FormEvent, scannedId?: string) => {
    if (e) e.preventDefault();
    
    // Support either manual input state or direct scanned ID, and strip the potential 'ieee-qu-user:' prefix
    let rawInput = scannedId || manualInput;
    const targetUserId = rawInput.replace('ieee-qu-user:', '').trim();
    
    if (!targetUserId) return;

    setIsSubmitting(true);
    setScanResult({ status: null, message: '' });

    try {
      const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
      const response = await submitCheckInFn({
        eventId,
        targetUserId
      });
      
      const result = response.data as any;
      if (result.status === 'success') {
        setScanResult({ status: 'success', message: `تم تحضير الطالب بنجاح! النقاط المكتسبة: ${result.awardedPoints || 0}` });
        setManualInput('');
      } else if (result.status === 'already_checked_in') {
        setScanResult({ status: 'already_checked_in', message: 'الطالب محضر مسبقاً.' });
        setManualInput('');
      }
    } catch (error: any) {
      console.error("Checkin error", error);
      setScanResult({ status: 'error', message: error.message || 'فشل التحضير. تأكد من أن الطالب مسجل في الفعالية.' });
    } finally {
      setIsSubmitting(false);
      // Auto clear success message after 5 seconds
      setTimeout(() => setScanResult({ status: null, message: '' }), 5000);
    }
  };

  if (loading || authLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-gray-500">الفعالية غير موجودة.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center mb-2">
            <Link href={`/admin/events/${eventId}/registrations`} className="text-slate-500 hover:text-slate-900 me-3 bg-slate-100 p-2 rounded-lg transition-colors">
              <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 font-cairo">مكتب التحضير (Check-in Desk)</h1>
          </div>
          <p className="text-slate-600 font-medium ms-12">{event.title}</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-sm border border-blue-100">
          الحالة: {event.state}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab('qr')}
          className={`flex-1 flex items-center justify-center py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'qr' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <QrCode className="w-5 h-5 me-2" />
          تحضير ذاتي للطلاب (QR)
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserCheck className="w-5 h-5 me-2" />
          التحضير اليدوي / قارئ الباركود
        </button>
      </div>

      {/* Tab Content: QR Code */}
      {activeTab === 'qr' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-center">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-3xl font-black mb-2 font-cairo">امسح الرمز للتحضير</h2>
            <p className="text-blue-100 text-lg opacity-90">افتح الكاميرا وقم بتوجيهها نحو الرمز لتسجيل حضورك في {event.title}</p>
          </div>
          
          <div className="p-12 flex flex-col items-center bg-slate-50 relative">
            {selfCheckinUrl ? (
              <>
                <div className="bg-white p-6 rounded-3xl shadow-xl mb-8 border border-slate-100 relative group">
                  <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative">
                    <QRCodeSVG 
                      value={selfCheckinUrl} 
                      size={280}
                      bgColor={"#ffffff"}
                      fgColor={"#0f172a"}
                      level={"H"}
                      includeMargin={false}
                    />
                  </div>
                </div>
                
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 mb-1 text-start">رابط التحضير المباشر (للمشاركة في الواتساب)</p>
                    <input 
                      type="text" 
                      readOnly 
                      value={selfCheckinUrl} 
                      className="w-full bg-slate-50 text-slate-700 border-none rounded-lg p-2 text-sm focus:ring-0 cursor-copy dir-ltr text-start"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selfCheckinUrl);
                      alert('تم نسخ الرابط!');
                    }}
                    className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center shadow-sm w-full sm:w-auto justify-center"
                  >
                    <LinkIcon className="w-4 h-4 me-2" />
                    نسخ الرابط
                  </button>
                </div>
              </>
            ) : (
              <div className="text-slate-500">
                <p className="mb-4">لا يوجد رابط تحضير لهذه الفعالية.</p>
                <Link href={`/admin/events/${eventId}/registrations`} className="text-blue-600 hover:underline">
                  قم بتوليد الرابط من مكتب التسجيل أولاً
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Manual/Scanner */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-cairo mb-3">
            المسح السريع للبطاقات الجامعية أو الرقمية
          </h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            قم بتوصيل جهاز قراءة الباركود (USB Scanner) أو استخدم كاميرا جوالك الأساسية لمسح رمز الطالب من بطاقته الرقمية ولصق المعرّف هنا.
          </p>

          {!showCamera ? (
            <button
              onClick={() => setShowCamera(true)}
              className="mb-8 mx-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-200"
            >
              <Camera className="w-4 h-4" />
              افتح كاميرا الجوال للمسح
            </button>
          ) : (
            <div className="mb-8 max-w-sm mx-auto overflow-hidden rounded-2xl border-4 border-slate-100 shadow-inner relative">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const scannedText = result[0].rawValue;
                    setManualInput(scannedText);
                    setShowCamera(false); // Close camera after scan
                    handleManualSubmit(undefined, scannedText); // Auto submit
                  }
                }}
                onError={(err) => console.error("Scanner Error:", err)}
                formats={['qr_code']}
              />
              <button
                onClick={() => setShowCamera(false)}
                className="absolute top-3 right-3 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-lg backdrop-blur-sm shadow-sm transition-colors z-10"
              >
                إغلاق
              </button>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="max-w-md mx-auto relative">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="امسح الـ QR أو اكتب معرّف الطالب (ID)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl p-4 text-center font-mono text-slate-700 text-lg transition-all outline-none disabled:opacity-50"
              />
              {isSubmitting && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
            
            {scanResult.status && (
              <div className={`mt-6 p-4 rounded-xl flex items-start text-start gap-3 border ${
                scanResult.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                scanResult.status === 'already_checked_in' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="shrink-0 mt-0.5">
                  {scanResult.status === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                   scanResult.status === 'already_checked_in' ? <CheckCircle2 className="w-5 h-5 text-amber-600" /> :
                   <XCircle className="w-5 h-5 text-rose-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-0.5">
                    {scanResult.status === 'success' ? 'تم التحضير بنجاح!' :
                     scanResult.status === 'already_checked_in' ? 'محضر مسبقاً' : 'خطأ'}
                  </h4>
                  <p className="text-xs opacity-90">{scanResult.message}</p>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !manualInput.trim()}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold transition-colors shadow-lg shadow-blue-600/20"
            >
              تحضير الطالب
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-xs font-bold text-slate-400">
            تلميحة: مؤشر الفأرة (Focus) سيعود تلقائياً للحقل بعد كل عملية مسح.
          </div>
        </div>
      )}

    </div>
  );
}
