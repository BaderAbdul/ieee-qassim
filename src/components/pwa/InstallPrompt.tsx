'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Download, Share, X } from 'lucide-react';
import { usePathname } from '@/i18n/routing';
import { isAdminRole, useAuth } from '@/context/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 12_000;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch { return false; }
}

/**
 * Small bottom card offering installation. Chromium browsers give us a real install prompt;
 * iOS Safari has none, so there we explain Share → Add to Home Screen. The app is for staff only
 * (it will carry their tasks and project notifications): it is offered solely to signed-in super
 * admins / admins / members, solely inside the admin area. Students and visitors are never asked,
 * the app is never offered inside the installed app itself, and not for 14 days after a dismissal.
 */
export default function InstallPrompt() {
  const isAr = useLocale() === 'ar';
  const pathname = usePathname();
  const { userData } = useAuth();
  const staff = isAdminRole(userData);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || recentlyDismissed()) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    let timer: number | undefined;
    const arm = () => {
      timer = window.setTimeout(() => {
        if (isIos) setIos(true);
        setVisible(true);
      }, SHOW_AFTER_MS);
    };

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      if (timer === undefined) arm();
    };
    const onInstalled = () => { setVisible(false); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isIos) arm();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') dismiss(); else setVisible(false);
  };

  if (!staff || !pathname.startsWith('/admin') || !visible || (!deferred && !ios)) return null;

  return (
    <div
      role="dialog"
      aria-label={isAr ? 'تثبيت التطبيق' : 'Install the app'}
      className="fixed inset-x-4 z-[90] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={isAr ? 'إغلاق' : 'Close'}
        className="absolute end-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pe-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl border border-slate-100" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{isAr ? 'ثبّت تطبيق IEEE القصيم' : 'Install the IEEE Qassim app'}</p>
          {deferred ? (
            <>
              <p className="mt-0.5 text-xs text-slate-500">
                {isAr ? 'وصول أسرع من شاشتك الرئيسية وتجربة تشبه التطبيقات.' : 'Faster access from your home screen with an app-like experience.'}
              </p>
              <button
                type="button"
                onClick={install}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00629B] px-4 py-2 text-sm font-bold text-white active:scale-95"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {isAr ? 'تثبيت' : 'Install'}
              </button>
            </>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs leading-6 text-slate-500">
              {isAr ? 'اضغط على' : 'Tap'}
              <Share aria-label={isAr ? 'مشاركة' : 'Share'} className="inline h-4 w-4 text-[#00629B]" />
              {isAr ? 'ثم «إضافة إلى الشاشة الرئيسية».' : 'then “Add to Home Screen”.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
