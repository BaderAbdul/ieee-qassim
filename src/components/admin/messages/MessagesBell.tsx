'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Mail } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { apiGet } from '@/lib/backend';

export const MESSAGES_CHANGED_EVENT = 'staff-messages-changed';

/** Topbar shortcut to the staff inbox with an unread badge; re-checks every minute and on demand. */
export default function MessagesBell() {
  const isAr = useLocale() === 'ar';
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      void apiGet<{ unread: number }>('/api/me/messages/unread-count')
        .then(result => { if (active) setUnread(result.unread); }).catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener(MESSAGES_CHANGED_EVENT, load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener(MESSAGES_CHANGED_EVENT, load); };
  }, []);

  return (
    <Link href="/admin/messages" aria-label={isAr ? 'الرسائل' : 'Messages'}
          className="cursor-pointer relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all">
      <Mail size={18} />
      {unread > 0 && (
        <span dir="ltr" className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-highlight)] text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
