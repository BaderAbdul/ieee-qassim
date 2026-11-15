'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { Monitor } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { isMobileDevice } from '@/lib/pwa';

const QUERY = '(max-width: 767px)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const snapshot = () => window.matchMedia(QUERY).matches || isMobileDevice();

/** True on phones (and any narrow window): creating templates needs a computer. Server render = false. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Small notice that says template creation is a computer-only task. */
export function DesktopOnlyNotice({ backHref = '/admin/templates' }: { backHref?: string }) {
  const isAr = useLocale() === 'ar';
  return (
    <div role="status" className="mx-auto mt-6 max-w-md space-y-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Monitor size={22} /></span>
      <h2 className="font-cairo text-lg font-black text-[var(--color-text-primary)]">{isAr ? 'إنشاء القوالب من الحاسوب فقط' : 'Templates are created on a computer'}</h2>
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        {isAr ? 'محرر القوالب يحتاج شاشة أكبر. افتح لوحة الإدارة من حاسوبك لإنشاء قالب جديد.' : 'The template editor needs a bigger screen. Open the admin board on a computer to create a new template.'}
      </p>
      <Link href={backHref} className="inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-contrast)]">{isAr ? 'العودة إلى القوالب' : 'Back to templates'}</Link>
    </div>
  );
}

/** Renders its children on computers and a notice on phones. */
export default function DesktopOnlyGate({ children, backHref }: { children: ReactNode; backHref?: string }) {
  const phone = useIsPhone();
  return phone ? <DesktopOnlyNotice backHref={backHref} /> : <>{children}</>;
}
