'use client';

import React, { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function LeaderboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    console.error('Unhandled error in leaderboard segment:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50 mt-16">
      <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-gray-100 shadow-xl shadow-blue-900/5 space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
          <AlertCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
            {isAr ? 'تعذر تحميل لوحة الشرف' : 'Unable to load leaderboard'}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {isAr 
              ? 'حدث خطأ أثناء احتساب تصنيف الطلاب والنقاط. يرجى إعادة المحاولة.' 
              : 'An error occurred while calculating points and student ranks. Please try again.'}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono pt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
