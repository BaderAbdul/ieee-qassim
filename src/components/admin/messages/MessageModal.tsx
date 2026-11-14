'use client';

import { useState } from 'react';
import { Download, Heart, Loader2, X } from 'lucide-react';
import { downloadMessageAttachment } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import Confetti from '@/components/ui/Confetti';
import type { InboxMessage } from './messageTypes';

/** A staff message shown on top of whatever page the person is on; thank-you messages throw confetti. */
export default function MessageModal({ message, isAr, onClose }: { message: InboxMessage; isAr: boolean; onClose: () => void }) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { showToast } = useToast();
  const [burst, setBurst] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const base = message.attachmentName || 'attachment';
      await downloadMessageAttachment(message.id, message.attachmentKind === 'template' ? `${base}.pdf` : base);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر تنزيل المرفق.', 'Could not download the attachment.'), 'error'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      {message.kind === 'thanks' && <Confetti burstKey={burst} />}
      <article onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={message.title}
               className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
               style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={onClose} aria-label={t('إغلاق', 'Close')} className="absolute end-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        {message.kind === 'thanks' && (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 text-white shadow-lg"><Heart size={26} /></div>
        )}
        <h2 className="pe-8 font-cairo text-xl font-black text-slate-900">{message.title}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">{message.body}</p>
        {message.hasAttachment && (
          <button type="button" disabled={downloading} onClick={() => void download()}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {message.attachmentKind === 'template' ? t('تنزيل شهادتك', 'Download your certificate') : t('تنزيل المرفق', 'Download attachment')}
          </button>
        )}
        <p className="mt-6 text-xs text-slate-400">{message.senderName} · {new Date(message.showAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
        {message.kind === 'thanks' && (
          <button type="button" onClick={() => setBurst(value => value + 1)} className="mt-3 text-xs font-bold text-pink-600">🎉 {t('مرة أخرى', 'Again')}</button>
        )}
      </article>
    </div>
  );
}
