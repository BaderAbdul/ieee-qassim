'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@/i18n/routing';
import { PlatformEvent } from '@/lib/types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function StudentCheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { user, loading: authLoading, login } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid_token' | 'not_registered' | 'already_checked_in'>('loading');
  const [event, setEvent] = useState<PlatformEvent | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Don't auto-fail, let them login
      return;
    }

    const checkIn = async () => {
      try {
        if (!token) {
          setStatus('invalid_token');
          return;
        }

        // We fetch event info purely to show the title in UI
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }

        const processCheckIn = httpsCallable(functions, 'processCheckIn');
        const result = await processCheckIn({ eventId, token });
        const data = result.data as any;

        if (data.status === 'already_checked_in') {
          setStatus('already_checked_in');
        } else {
          setStatus('success');
        }
      } catch (error: any) {
        console.error("Error during check-in", error);
        
        // Map backend errors to UI states
        if (error.message === 'You are not registered for this event.' || error.message === 'Your registration is not approved.') {
          setStatus('not_registered');
        } else if (error.message === 'Token is invalid or expired.' || error.message === 'Token does not match the event.') {
          setStatus('invalid_token');
        } else {
          setStatus('error');
        }
      }
    };

    checkIn();
  }, [user, authLoading, eventId, token]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin h-12 w-12 text-blue-600" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <h1 className="text-2xl font-bold font-cairo mb-4 text-gray-900">تسجيل الحضور</h1>
          <p className="text-gray-600 mb-8">يرجى تسجيل الدخول بحسابك الجامعي لتتمكن من إثبات حضورك.</p>
          <button 
            onClick={login}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md"
          >
            تسجيل الدخول للمتابعة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-16 w-16 text-blue-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">جاري تسجيل حضورك...</h2>
            <p className="text-gray-500 mt-2">يرجى الانتظار قليلاً</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 font-cairo mb-2">تم تسجيل حضورك بنجاح!</h2>
            <p className="text-gray-600 mb-6">لقد تم إثبات حضورك لفعالية <span className="font-bold">{event?.title}</span>.</p>
            <Link href="/my-activity" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors w-full inline-block">
              عرض نشاطي
            </Link>
          </div>
        )}

        {status === 'already_checked_in' && (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-blue-700 font-cairo mb-2">حضورك مسجل مسبقاً</h2>
            <p className="text-gray-600 mb-6">لقد قمت بتسجيل حضورك لهذه الفعالية مسبقاً.</p>
            <Link href="/" className="text-blue-600 font-bold hover:underline">العودة للرئيسية</Link>
          </div>
        )}

        {status === 'not_registered' && (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 font-cairo mb-2">غير مسجل أو غير مقبول</h2>
            <p className="text-gray-600 mb-6">عذراً، يجب أن تكون مسجلاً ومقبولاً في هذه الفعالية لتتمكن من تسجيل الحضور.</p>
            <Link href={`/events/${eventId}`} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors w-full inline-block">
              الذهاب لصفحة الفعالية
            </Link>
          </div>
        )}

        {status === 'invalid_token' && (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-orange-700 font-cairo mb-2">رمز غير صالح أو منتهي</h2>
            <p className="text-gray-600 mb-6">الرمز الذي قمت بمسحه غير صالح أو انتهت صلاحيته. يرجى مسح الرمز من شاشة العرض مرة أخرى.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 font-cairo mb-2">حدث خطأ</h2>
            <p className="text-gray-600 mb-6">عذراً، لم نتمكن من تسجيل حضورك بسبب مشكلة فنية أو الفعالية غير جارية الآن.</p>
            <button onClick={() => window.location.reload()} className="text-blue-600 font-bold hover:underline">المحاولة مرة أخرى</button>
          </div>
        )}
      </div>
    </div>
  );
}
