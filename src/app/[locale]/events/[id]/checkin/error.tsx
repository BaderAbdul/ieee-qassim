'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function CheckInError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isAr = useLocale() === 'ar';
  useEffect(() => { console.error('Check-in page failed', error); }, [error]);
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center gap-5 p-6 text-center" role="alert">
      <h1>{isAr ? 'تعذر تحميل صفحة الحضور' : 'Unable to load check-in'}</h1>
      {error.digest && <p>{error.digest}</p>}
      <button onClick={() => reset()} className="rounded-xl bg-blue-600 px-5 py-3 text-white">{isAr ? 'إعادة المحاولة' : 'Try again'}</button>
      <Link href="/events">{isAr ? 'الفعاليات' : 'Events'}</Link>
    </div>
  );
}
