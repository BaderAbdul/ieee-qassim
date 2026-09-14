'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@/i18n/routing';
import { PlatformEvent } from '@/lib/types';
import { CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

function CheckInContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const locale = useLocale();
  const isAr = locale === 'ar';
  const t = useTranslations('CheckIn');
  const tCommon = useTranslations('Common');

  const { user, loading: authLoading, login } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid_token' | 'not_registered' | 'already_checked_in'>('loading');
  const [event, setEvent] = useState<PlatformEvent | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      return;
    }

    const checkIn = async () => {
      try {
        if (!token) {
          setStatus('invalid_token');
          return;
        }

        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }

        const processCheckIn = httpsCallable(functions, 'processCheckIn');
        const result = await processCheckIn({ eventId, token });
        const data = result.data as { status?: string };

        if (data.status === 'already_checked_in') {
          setStatus('already_checked_in');
        } else {
          setStatus('success');
        }
      } catch (error: unknown) {
        console.error("Error during check-in", error);
        
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'You are not registered for this event.' || message === 'Your registration is not approved.') {
          setStatus('not_registered');
        } else if (message === 'Token is invalid or expired.' || message === 'Token does not match the event.') {
          setStatus('invalid_token');
        } else {
          setStatus('error');
        }
      }
    };

    checkIn();
  }, [user, authLoading, eventId, token]);

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm max-w-md w-full border border-gray-100 space-y-4">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-cairo text-slate-900">{t('title')}</h1>
          <p className="text-slate-600 text-sm leading-relaxed">{t('loginPrompt')}</p>
          <button 
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold transition-colors shadow-md shadow-blue-500/20"
          >
            {t('loginButton')}
          </button>
        </div>
      </div>
    );
  }

  const eventTitle = isAr ? (event?.title || '') : (event?.titleEn || event?.title || '');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm max-w-md w-full border border-gray-100 text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="animate-spin h-14 w-14 text-blue-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 font-cairo">{t('processing')}</h2>
            <p className="text-slate-500 text-xs mt-2">{t('wait')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-xs">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-700 font-cairo mb-2">
              {t('successTitle')}
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {t('successDesc')} <span className="font-bold text-slate-900">{eventTitle}</span>.
            </p>
            <Link 
              href="/my-activity" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl font-bold transition-colors w-full inline-block shadow-md shadow-emerald-600/20 text-sm"
            >
              {t('viewActivity')}
            </Link>
          </div>
        )}

        {status === 'already_checked_in' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600 shadow-xs">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-blue-700 font-cairo mb-2">
              {t('alreadyCheckedInTitle')}
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {t('alreadyCheckedInDesc')}
            </p>
            <Link 
              href="/my-activity" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold transition-colors w-full inline-block shadow-md shadow-blue-500/20 text-sm mb-3"
            >
              {t('viewActivity')}
            </Link>
            <Link href="/" className="text-xs font-bold text-slate-500 hover:text-slate-700">
              {t('returnHome')}
            </Link>
          </div>
        )}

        {status === 'not_registered' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 shadow-xs">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-red-700 font-cairo mb-2">
              {t('notRegisteredTitle')}
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {t('notRegisteredDesc')}
            </p>
            <Link 
              href={`/events/${eventId}`} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold transition-colors w-full inline-block text-sm"
            >
              {isAr ? 'الانتقال لصفحة الفعالية والتسجيل' : 'Go to Event Page to Register'}
            </Link>
          </div>
        )}

        {status === 'invalid_token' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-600 shadow-xs">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-700 font-cairo mb-2">
              {t('invalidTokenTitle')}
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {t('invalidTokenDesc')}
            </p>
            <Link href={`/events/${eventId}`} className="text-sm font-bold text-blue-600 hover:underline">
              {isAr ? 'العودة لصفحة الفعالية' : 'Return to event details'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 shadow-xs">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-red-700 font-cairo mb-2">
              {t('errorTitle')}
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {t('errorDesc')}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
            >
              {tCommon('retry')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function StudentCheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
        </div>
      }
    >
      <CheckInContent eventId={eventId} />
    </Suspense>
  );
}
