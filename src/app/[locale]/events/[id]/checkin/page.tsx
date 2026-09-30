'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SelfCheckinPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations();

  const initialStatus = !token ? 'error' : 'loading';
  const initialErrorMessage = !token ? (locale === 'ar' ? 'الرابط غير صالح أو مفقود رمزه السري' : 'Invalid link or missing token') : '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_attended'>(initialStatus);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Need to login first
      const currentUrl = encodeURIComponent(`/events/${eventId}/checkin?token=${token}`);
      router.push(`/?redirect=${currentUrl}`);
      return;
    }

    if (!token) {
      return;
    }

    const processCheckin = async () => {
      try {
        const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
        const response = await submitCheckInFn({
          eventId,
          token
        });
        
        const result = response.data as { status?: string; message?: string };
        if (result.status === 'already_checked_in') {
          setStatus('already_attended');
        } else {
          setStatus('success');
        }
      } catch (error: unknown) {
        console.error("Error during self check-in:", error);
        setStatus('error');
        const err = error as Error;
        setErrorMessage(err.message || (locale === 'ar' ? 'حدث خطأ أثناء التحضير' : 'Error during check-in'));
      }
    };

    processCheckin();
  }, [user, authLoading, eventId, token, router, locale]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 font-cairo">
              {locale === 'ar' ? 'جاري التحضير...' : 'Checking in...'}
            </h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 font-cairo mb-2">
              {locale === 'ar' ? 'تم التحضير بنجاح!' : 'Checked in successfully!'}
            </h2>
            <p className="text-gray-600 mb-8">
              {locale === 'ar' ? 'شكراً لحضورك الفعالية.' : 'Thank you for attending.'}
            </p>
            <Link href={`/events/${eventId}`} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              {locale === 'ar' ? 'العودة للفعالية' : 'Back to Event'}
            </Link>
          </div>
        )}

        {status === 'already_attended' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-cairo mb-2">
              {locale === 'ar' ? 'أنت محضر بالفعل!' : 'You are already checked in!'}
            </h2>
            <p className="text-gray-600 mb-8">
              {locale === 'ar' ? 'تم تسجيل حضورك مسبقاً.' : 'Your attendance was already recorded.'}
            </p>
            <Link href={`/events/${eventId}`} className="bg-gray-100 text-gray-800 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
              {locale === 'ar' ? 'العودة للفعالية' : 'Back to Event'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 font-cairo mb-2">
              {locale === 'ar' ? 'فشل التحضير' : 'Check-in Failed'}
            </h2>
            <p className="text-gray-700 mb-8 font-medium">
              {errorMessage}
            </p>
            <Link href={`/events/${eventId}`} className="bg-gray-100 text-gray-800 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
              {locale === 'ar' ? 'العودة للفعالية' : 'Back to Event'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
