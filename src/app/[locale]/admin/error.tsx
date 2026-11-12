'use client';

import React, { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    console.error('Unhandled error in admin segment:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-[var(--color-page)]">
      <div className="bg-[var(--color-surface)] rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-[var(--color-border)] shadow-xl space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] mx-auto flex items-center justify-center shadow-inner">
          <AlertCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-cairo text-[var(--color-text-primary)]">
            {isAr ? 'حدث خطأ في لوحة الإدارة' : 'Admin Dashboard Error'}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm sm:text-base leading-relaxed">
            {isAr
              ? 'حدث خطأ أثناء معالجة البيانات الإدارية أو استرجاع العمليات. يرجى إعادة المحاولة.'
              : 'An error occurred while loading administrative records. Please try again.'}
          </p>
          {error.digest && (
            <p className="text-xs text-[var(--color-text-muted)] font-mono pt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold py-3.5 px-6 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
          </button>

          <Link
            href="/admin"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] font-bold py-3.5 px-6 rounded-xl transition-colors hover:opacity-80"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
