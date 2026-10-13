'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import { QRCodeSVG } from 'qrcode.react';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { Loader2, ArrowRight, QrCode, Link as LinkIcon, UserCheck, ShieldCheck, CheckCircle2, XCircle, Camera, RefreshCw, Star, X, Send, Smartphone, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

interface CheckInResult {
  status?: 'success' | 'already_checked_in' | 'error';
  awardedPoints?: number;
  message?: string;
}

interface SearchStudent {
  id: string;
  displayName?: string;
  arabicFullName?: string;
  email?: string;
  universityId?: string;
  totalPoints?: number;
}

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
  loading: () => <div className="p-8 text-center bg-slate-50 rounded-2xl animate-pulse text-slate-500 text-sm font-bold">جاري تحميل الكاميرا...</div>,
});

export default function CheckinDeskPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const { loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  
  // Manual Entry State
  const [manualInput, setManualInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'already_checked_in' | null, message: string }>({ status: null, message: '' });
  const [showCamera, setShowCamera] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenDurationMinutes, setTokenDurationMinutes] = useState<number>(15);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState('');
  const [recent, setRecent] = useState<{ id: string; message: string }[]>([]);
  const submitting = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live Student Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Survey / Feedback State on Checkin Desk
  const [requireSurvey, setRequireSurvey] = useState(true);
  const [pendingSurveyStudentId, setPendingSurveyStudentId] = useState<string | null>(null);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyHoverRating, setSurveyHoverRating] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});

  // Real-time live sync: waiting for student to complete feedback on their device
  const [waitingStudent, setWaitingStudent] = useState<{
    targetUserId: string;
    eventTitle?: string;
    points?: number;
  } | null>(null);

  useEffect(() => {
    if (!waitingStudent) return;
    const unsub = onSnapshot(doc(db, 'pending_checkins', `${eventId}_${waitingStudent.targetUserId}`), (snap) => {
      if (snap.exists() && snap.data()?.status === 'completed') {
        const pts = snap.data()?.points ?? waitingStudent.points ?? 0;
        setScanResult({
          status: 'success',
          message: `تم إكمال الاستبيان وتأكيد حضور الطالب (${waitingStudent.targetUserId}) عبر جواله بنجاح! (+${pts} نقطة)`
        });
        setRecent(prev => [{ id: crypto.randomUUID(), message: `${waitingStudent.targetUserId}: تم التحضير بالتقييم اللحظي (+${pts})` }, ...prev].slice(0, 10));
        setWaitingStudent(null);
      }
    }, (err) => console.warn('Desk pending listener:', err));

    return () => unsub();
  }, [waitingStudent, eventId]);

  // Self Check-in Link
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const secondsLeft = tokenExpiry ? Math.max(0, Math.ceil((tokenExpiry - now) / 1000)) : 0;
  const selfCheckinUrl = event?.checkinToken && secondsLeft > 0 ? `${baseUrl}/${locale}/events/${eventId}/checkin?token=${event.checkinToken}` : '';
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTimeLeft = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h} ساعة و ${m} دقيقة و ${s} ث`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleGenerateToken = async (customMinutes?: number) => {
    const mins = customMinutes ?? tokenDurationMinutes;
    setIsGeneratingToken(true);
    try {
      const generate = httpsCallable<{ eventId: string; durationMinutes?: number }, { token: string; expiresAt: number; durationMinutes?: number }>(functions, 'generateCheckInToken');
      const { data } = await generate({ eventId, durationMinutes: mins });
      setEvent(prev => prev ? { ...prev, checkinToken: data.token } : null);
      setTokenExpiry(data.expiresAt);
      setNow(Date.now());
      const label = mins >= 60 ? `${Math.round(mins / 60)} ساعة` : `${mins} دقيقة`;
      setMessage(`تم توليد رمز صالح لمدة ${label}.`);
    } catch (error) {
      console.error("Error generating check-in token:", error);
      setMessage(error instanceof Error ? error.message : 'تعذر توليد رمز التحضير');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Live Debounced Member Search for Check-in
  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const searchFn = httpsCallable<{ query: string }, { users: SearchStudent[] }>(functions, 'searchMembers');
        const res = await searchFn({ query: term });
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error('Member search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data(), checkinToken: undefined } as PlatformEvent);
        }
      } catch (error) {
        console.error("Error fetching event", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const executeCheckIn = async (userIdToSubmit: string, feedbackData?: { rating: number; answers: Record<string, string> }) => {
    if (submitting.current) return;
    submitting.current = true;

    setIsSubmitting(true);
    setScanResult({ status: null, message: '' });

    try {
      const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
      const response = await submitCheckInFn({
        eventId,
        targetUserId: userIdToSubmit,
        ...(feedbackData ? { feedbackData } : {})
      });
      
      const result = response.data as CheckInResult;
      if (result.status === 'success') {
        setScanResult({ status: 'success', message: `تم تحضير الطالب بنجاح! النقاط المكتسبة: ${result.awardedPoints || 0}` });
        setManualInput('');
        setRecent(previous => [{ id: crypto.randomUUID(), message: `${userIdToSubmit}: تم التحضير (+${result.awardedPoints || 0})` }, ...previous].slice(0, 10));
        setPendingSurveyStudentId(null);
      } else if (result.status === 'already_checked_in') {
        setScanResult({ status: 'already_checked_in', message: 'الطالب محضر مسبقاً.' });
        setManualInput('');
        setPendingSurveyStudentId(null);
      }
    } catch (error) {
      console.error('Check-in failed', error);
      setScanResult({ status: 'error', message: error instanceof Error ? error.message : 'تعذر التحضير. أعد المحاولة.' });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleManualSubmit = async (e?: React.FormEvent, scannedId?: string, skipSurveyPrompt = false) => {
    if (e) e.preventDefault();
    
    // Support either manual input state or direct scanned ID
    const rawInput = scannedId || manualInput;
    let targetUserId = rawInput.trim();
    
    // Parse ID from public pass URL or legacy prefix
    if (targetUserId.includes('/pass/')) {
      targetUserId = targetUserId.split('/pass/')[1].split('/')[0].split('?')[0];
    } else if (targetUserId.startsWith('ieee-qu-user:')) {
      targetUserId = targetUserId.replace('ieee-qu-user:', '');
    }
    
    if (!targetUserId) return;

    if (requireSurvey && !skipSurveyPrompt && event?.state === 'Ongoing') {
      try {
        setIsSubmitting(true);
        const initiateFn = httpsCallable<{ eventId: string; targetUserId: string }, { status: string; eventTitle: string; points: number }>(functions, 'initiatePendingCheckIn');
        const resp = await initiateFn({ eventId, targetUserId });
        if (resp.data.status === 'already_checked_in') {
          setScanResult({ status: 'already_checked_in', message: 'الطالب محضر مسبقاً في هذه الفعالية.' });
          setManualInput('');
          return;
        }
        setWaitingStudent({
          targetUserId,
          eventTitle: resp.data.eventTitle || event.title,
          points: resp.data.points || event.points || 0
        });
        setScanResult({ status: null, message: '' });
        setManualInput('');
      } catch (err) {
        console.error('Failed to initiate pending check-in', err);
        // Fallback to local desk survey if remote initiate fails
        setPendingSurveyStudentId(targetUserId);
        setSurveyRating(5);
        setSurveyAnswers({});
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    await executeCheckIn(targetUserId);
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
          
          <div className="p-4 sm:p-12 flex flex-col items-center bg-slate-50 relative">
            {message && <p role="status" className="mb-4 text-sm text-slate-700">{message}</p>}
            {selfCheckinUrl && <p className="mb-4 font-bold" aria-live="off">ينتهي الرمز خلال {formatTimeLeft(secondsLeft)}</p>}
            {selfCheckinUrl ? (
              <>
                <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl mb-8 border border-slate-100 relative group max-w-full">
                  <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative">
                    <QRCodeSVG 
                      value={selfCheckinUrl} 
                      size={280}
                      className="max-w-full h-auto"
                      bgColor={"#ffffff"}
                      fgColor={"#0f172a"}
                      level={"H"}
                      includeMargin={false}
                    />
                  </div>
                </div>
                
                <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 overflow-hidden w-full">
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
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(selfCheckinUrl); setMessage('تم نسخ الرابط'); }
                      catch { setMessage('تعذر النسخ؛ حدّد الرابط وانسخه يدويًا'); }
                    }}
                    className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center shadow-sm w-full sm:w-auto justify-center"
                  >
                    <LinkIcon className="w-4 h-4 me-2" />
                    نسخ الرابط
                  </button>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={tokenDurationMinutes}
                      onChange={(e) => setTokenDurationMinutes(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 outline-none"
                      aria-label="تحديد مدة الرمز الجديد"
                    >
                      <option value={15}>15 د</option>
                      <option value={30}>30 د</option>
                      <option value={60}>1 س</option>
                      <option value={120}>2 س</option>
                      <option value={240}>4 س</option>
                      <option value={480}>8 س</option>
                      <option value={1440}>24 س</option>
                    </select>
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من إنشاء رمز تحضير جديد؟ الرابط الحالي سيتوقف عن العمل.')) {
                          handleGenerateToken();
                        }
                      }}
                      disabled={isGeneratingToken}
                      className="shrink-0 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center shadow-sm w-full sm:w-auto justify-center disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 me-2 ${isGeneratingToken ? 'animate-spin' : ''}`} />
                      تحديث الرمز
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-500 py-6 max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 font-cairo">{tokenExpiry ? 'انتهت صلاحية الرمز — ولّد رمزًا جديدًا' : 'لم يتم إنشاء رمز تحضير لهذه الفعالية بعد'}</h3>
                <p className="text-sm text-slate-500 mb-4">قم بتوليد رمز التحضير الذاتي ليتمكن الحضور من مسح رمز QR أو استخدام رابط التحضير المباشر.</p>
                
                <div className="flex flex-col items-center gap-2 mb-6 w-full max-w-xs mx-auto text-start">
                  <label className="text-xs font-bold text-slate-700 w-full">تحديد مدة صلاحية الرابط / الرمز:</label>
                  <select
                    value={tokenDurationMinutes}
                    onChange={(e) => setTokenDurationMinutes(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={15}>15 دقيقة (افتراضي)</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={60}>ساعة واحدة (60 دقيقة)</option>
                    <option value={120}>ساعتان (120 دقيقة)</option>
                    <option value={240}>4 ساعات</option>
                    <option value={480}>8 ساعات</option>
                    <option value={1440}>24 ساعة (يوم كامل)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleGenerateToken()}
                  disabled={isGeneratingToken || event.state !== 'Ongoing'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-600/20 flex items-center mx-auto disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 me-2 ${isGeneratingToken ? 'animate-spin' : ''}`} />
                  {event.state !== 'Ongoing' ? 'ابدأ الفعالية لتوليد الرمز' : isGeneratingToken ? 'جاري توليد الرمز...' : 'توليد رمز التحضير الآن'}
                </button>
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

          <div className="flex justify-center mb-6">
            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={requireSurvey}
                onChange={(e) => setRequireSurvey(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>طلب استبيان وتقييم الفعالية في جوال الطالب عند المسح ⭐</span>
            </label>
          </div>

          {waitingStudent && (
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-b from-blue-50 to-indigo-50 border-2 border-blue-200 text-center animate-in fade-in zoom-in-95 duration-200 shadow-md">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black font-cairo text-slate-900 mb-1">
                تم مسح بطاقة الطالب بنجاح! 📱
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-2">
                المعرف: <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200">{waitingStudent.targetUserId}</span>
              </p>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 mb-5 bg-white/70 py-2 px-4 rounded-xl max-w-sm mx-auto">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>ظهر استبيان التقييم في جوال الطالب الآن.. بانتظار إرساله</span>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => executeCheckIn(waitingStudent.targetUserId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                >
                  تحضير فوري ومباشر (تخطي جوال الطالب)
                </button>
                <button
                  type="button"
                  onClick={() => setWaitingStudent(null)}
                  className="bg-white hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="max-w-md mx-auto relative">
            <div className="relative">
              <input
                type="text"
                ref={inputRef}
                aria-label="الرقم الجامعي أو البريد أو معرّف الطالب"
                autoFocus
                placeholder="امسح الـ QR أو اكتب الرقم الجامعي / البريد / المعرف"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl p-4 text-center font-mono text-slate-700 text-base sm:text-lg transition-all outline-none disabled:opacity-50"
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

          {/* Live Search by Name / University ID / Email */}
          <div className="mt-8 pt-8 border-t border-slate-100 text-start max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                بحث بالاسم أو الرقم الجامعي للتحضير السريع
              </h3>
              {isSearching && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="ابحث بالاسم (مثال: بدر الدخيل الله) أو الرقم الجامعي أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-2.5 px-4 text-sm transition-all outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {searchResults.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {st.arabicFullName || st.displayName || 'طالب'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {st.universityId && <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">{st.universityId}</span>}
                        <span className="truncate">{st.email}</span>
                        <span className="text-blue-700 font-bold shrink-0">({st.totalPoints || 0} نقطة)</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleManualSubmit(undefined, st.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        تحضير
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => executeCheckIn(st.id)}
                        title="تحضير فوري بدون استبيان جوال"
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        فوري
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-3 bg-slate-50 rounded-xl">
                لم يتم العثور على طالب يطابق البحث &quot;{searchQuery}&quot;.
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-xs font-bold text-slate-400">
            يعود التركيز لحقل المعرف بعد كل عملية تحضير.
          </div>
        </div>
      )}
      {/* Desk Survey / Feedback Modal */}
      {pendingSurveyStudentId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>تقييم واستبيان الفعالية</span>
                </div>
                <h3 className="text-xl font-black font-cairo text-slate-900">
                  تحضير الطالب: <span className="font-mono text-blue-600">{pendingSurveyStudentId}</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  اطلب من الطالب تقييم الفعالية أو اسأله لتأكيد حضوره وكسب نقاط الفعالية (+{event?.points || 0} نقطة)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingSurveyStudentId(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Star Rating */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center mb-6">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                تقييم التجربة في الفعالية ⭐
              </label>
              <div className="flex items-center justify-center gap-2 dir-ltr my-2">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const active = (surveyHoverRating || surveyRating) >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setSurveyRating(starVal)}
                      onMouseEnter={() => setSurveyHoverRating(starVal)}
                      onMouseLeave={() => setSurveyHoverRating(0)}
                      className="p-2 transition-transform transform active:scale-95 hover:scale-110 rounded-xl"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          active
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-bold text-slate-600">
                {surveyRating === 5 && 'ممتازة جداً 🌟'}
                {surveyRating === 4 && 'جيدة جداً 👍'}
                {surveyRating === 3 && 'جيدة 👌'}
                {surveyRating === 2 && 'مقبولة 😐'}
                {surveyRating === 1 && 'تحتاج تحسين 👎'}
              </div>
            </div>

            {/* Custom Questions if configured */}
            {event?.feedbackQuestions && event.feedbackQuestions.length > 0 && (
              <div className="space-y-4 mb-6 max-h-48 overflow-y-auto p-1">
                {event.feedbackQuestions.map((q) => (
                  <div key={q.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-start">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      {q.title}
                      {q.required && <span className="text-red-500 ms-1">*</span>}
                    </label>

                    {q.type === 'choice' && q.options && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt) => {
                          const selected = surveyAnswers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSurveyAnswers(prev => ({ ...prev, [q.id]: opt }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <input
                        type="text"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder || 'ملاحظات الطالب...'}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeCheckIn(pendingSurveyStudentId, { rating: surveyRating, answers: surveyAnswers })}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحضير...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد التحضير والتقييم (+{event?.points || 0} نقطة)</span>
                  </>
                )}
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeCheckIn(pendingSurveyStudentId)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  تحضير فوري بدون تقييم
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSurveyStudentId(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recent.length > 0 && <section className="mt-6 rounded-xl bg-white border p-4"><h2 className="font-bold mb-2">آخر عمليات هذه الجلسة — ليست بديلًا لسجل الحضور الكامل</h2>{recent.map(item => <p key={item.id} className="py-1 text-sm text-emerald-800">{item.message}</p>)}</section>}
    </div>
  );
}
