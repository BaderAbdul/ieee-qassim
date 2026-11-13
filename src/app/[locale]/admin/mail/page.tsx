'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Send, TrendingUp } from 'lucide-react';
import { hasPrivilege, useAuth } from '@/context/AuthContext';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
import MailTrackingTab from '@/components/admin/mail/MailTrackingTab';
import MailSendTab from '@/components/admin/mail/MailSendTab';

export default function AdminMailPage() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const allowed = userData?.isSuperAdmin || userData?.role === 'super_admin' || userData?.canManageEmail || hasPrivilege(userData, 'mail.read') || hasPrivilege(userData, 'mail.create');
  const canSend = !!(userData?.isSuperAdmin || userData?.role === 'super_admin' || userData?.canManageEmail || hasPrivilege(userData, 'mail.create'));
  const canTrack = !!(userData?.isSuperAdmin || userData?.role === 'super_admin' || userData?.canManageEmail || hasPrivilege(userData, 'mail.read'));
  const [tab, setTab] = useState<'tracking' | 'send'>(canTrack ? 'tracking' : 'send');

  const topbarActions = useMemo(() => (
    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 p-1">
      {canTrack && <button type="button" onClick={() => setTab('tracking')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${tab === 'tracking' ? 'bg-[#00629B] text-white shadow' : 'text-slate-300'}`}>
        <TrendingUp size={14} />{t('التتبع', 'Tracking')}
      </button>}
      {canSend && <button type="button" onClick={() => setTab('send')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${tab === 'send' ? 'bg-[#00629B] text-white shadow' : 'text-slate-300'}`}>
        <Send size={14} />{t('الإرسال', 'Send')}
      </button>}
    </div>
  ), [tab, isAr]); // eslint-disable-line react-hooks/exhaustive-deps
  useAdminTopbarActions(topbarActions);

  if (!allowed) return <p role="alert">{t('لا تملك صلاحية إدارة البريد.', 'You do not have permission to manage mail.')}</p>;

  return <div className="space-y-6">
    {tab === 'tracking' ? <MailTrackingTab isAr={isAr} /> : <MailSendTab isAr={isAr} />}
  </div>;
}
