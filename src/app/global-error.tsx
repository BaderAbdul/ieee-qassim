'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled global application error in root layout:', error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-gray-100 shadow-2xl shadow-blue-900/10 space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-red-50 text-red-600 mx-auto flex items-center justify-center shadow-inner">
            <AlertCircle className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              حدث خطأ غير متوقع في النظام
            </h1>
            <p className="text-slate-500 text-sm font-semibold">
              An unexpected system error occurred
            </p>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-2">
              نعتذر عن هذا الخلل غير المتوقع. حدث انقطاع في تهيئة الصفحة الرئيسية، يمكنك محاولة إعادة التحميل الآن.
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
              <span>إعادة المحاولة / Try Again</span>
            </button>
            
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>الرئيسية / Home</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
