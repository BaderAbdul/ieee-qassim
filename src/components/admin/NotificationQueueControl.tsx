'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';

export default function NotificationQueueControl() {
  const isAr = useLocale() === 'ar';
  const busy = useRef(false);
  const [status, setStatus] = useState<'checking' | 'enabled' | 'disabled' | 'error'>('checking');
  const [delivered, setDelivered] = useState(0);

  useEffect(() => {
    let active = true;
    const drain = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const result = await httpsCallable<unknown, { enabled: boolean; delivered: number }>(null, 'processNotifications')({});
        if (active) { setStatus(result.data.enabled ? 'enabled' : 'disabled'); setDelivered(n => n + result.data.delivered); }
      } catch { if (active) setStatus('error'); }
      finally { busy.current = false; }
    };
    void drain();
    const timer = window.setInterval(() => { void drain(); }, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <p className="px-3 py-2 text-xs text-slate-300" role="status">
    {status === 'enabled' ? (isAr ? `طابور البريد يعمل أثناء فتح اللوحة — أُرسلت ${delivered} رسالة في هذه الجلسة.` : `Mail queue runs while this dashboard is open — ${delivered} sent this session.`)
      : status === 'disabled' ? (isAr ? 'إرسال البريد غير مفعّل. الإشعارات محفوظة في الطابور.' : 'Email sending is disabled. Notifications are queued.')
      : status === 'error' ? (isAr ? 'تعذر معالجة البريد؛ ستتم إعادة المحاولة.' : 'Mail processing failed; will retry.')
      : (isAr ? 'جارٍ التحقق من طابور البريد…' : 'Checking mail queue…')}
  </p>;
}
