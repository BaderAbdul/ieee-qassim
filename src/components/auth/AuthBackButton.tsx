'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * "Back" on the dedicated auth page: prefer real browser history (works even though this page
 * can live on its own subdomain, since full-page cross-origin navigations still land in the same
 * tab's history) and only fall back to the main site's home when there's nowhere to go back to
 * (e.g. the page was opened directly).
 */
export default function AuthBackButton({ isAr, fallbackHref }: { isAr: boolean; fallbackHref: string }) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    window.location.href = fallbackHref;
  };

  const Icon = isAr ? ArrowRight : ArrowLeft;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isAr ? 'العودة' : 'Back'}
      className="fixed start-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 ps-2.5 pe-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
      style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <Icon className="h-4 w-4" />
      <span>{isAr ? 'رجوع' : 'Back'}</span>
    </button>
  );
}
