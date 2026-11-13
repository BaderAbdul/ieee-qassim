'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { WifiOff } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

/** Thin strip under the header while the device is offline; a toast confirms when it returns. */
export default function OfflineIndicator() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let wasOffline = !navigator.onLine;
    const sync = () => setOffline(wasOffline);
    const goOffline = () => { wasOffline = true; sync(); };
    const goOnline = () => {
      if (wasOffline) showToast(isAr ? 'عاد الاتصال بالإنترنت' : 'Back online', 'success');
      wasOffline = false;
      sync();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    const initial = window.setTimeout(sync, 0);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [isAr, showToast]);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-16 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow"
    >
      <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
      {isAr ? 'أنت غير متصل بالإنترنت — بعض الميزات قد لا تعمل' : "You're offline — some features may not work"}
    </div>
  );
}
