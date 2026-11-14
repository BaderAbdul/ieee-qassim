'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Download, Heart, Loader2, Mail, MailOpen, Paperclip, X } from 'lucide-react';
import { apiGet, apiSend, downloadMessageAttachment } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import Confetti from '@/components/ui/Confetti';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { MESSAGES_CHANGED_EVENT } from '@/components/admin/messages/MessagesBell';
import type { InboxMessage } from '@/components/admin/messages/messageTypes';

export default function AdminMessagesPage() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { showToast } = useToast();
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<InboxMessage | null>(null);
  const [burst, setBurst] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try { setMessages((await apiGet<{ messages: InboxMessage[] }>('/api/me/messages')).messages); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر تحميل الرسائل.', 'Could not load messages.')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);
  useEffect(() => { void load(); }, [load]);

  const openMessage = (message: InboxMessage) => {
    setOpen(message);
    if (message.kind === 'thanks') setBurst(value => value + 1);
    if (!message.readAt) {
      void apiSend('POST', `/api/me/messages/${message.id}/read`).then(() => {
        setMessages(list => list?.map(item => item.id === message.id ? { ...item, readAt: new Date().toISOString() } : item) ?? null);
        window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
      }).catch(() => {});
    }
  };

  const download = async (message: InboxMessage) => {
    setDownloading(true);
    try { await downloadMessageAttachment(message.id, `${message.attachmentEventName || 'certificate'}.pdf`); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر تنزيل المرفق.', 'Could not download the attachment.'), 'error'); }
    finally { setDownloading(false); }
  };

  if (error) return <AdminError message={error} retry={() => void load()} />;
  if (!messages) return <AdminLoading />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="font-cairo text-2xl font-black text-[var(--color-text-primary)]">{t('الرسائل', 'Messages')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('رسائل الشكر والتنبيهات من إدارة الفرع.', 'Thank-you notes and announcements from the branch leadership.')}</p>
      </header>

      {messages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-text-muted)]">
          {t('لا توجد رسائل بعد.', 'No messages yet.')}
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map(message => (
            <li key={message.id}>
              <button type="button" onClick={() => openMessage(message)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition hover:shadow-md ${message.readAt ? 'border-[var(--color-border)] bg-[var(--color-surface)]' : 'border-[var(--color-highlight)]/40 bg-[var(--color-highlight-soft)]'}`}>
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${message.kind === 'thanks' ? 'bg-pink-100 text-pink-600' : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'}`}>
                  {message.kind === 'thanks' ? <Heart size={18} /> : message.readAt ? <MailOpen size={18} /> : <Mail size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${message.readAt ? 'font-bold' : 'font-black'} text-[var(--color-text-primary)]`}>{message.title}</span>
                    {!message.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-highlight)]" aria-label={t('غير مقروءة', 'Unread')} />}
                    {message.hasAttachment && <Paperclip size={14} className="shrink-0 text-[var(--color-text-muted)]" />}
                  </span>
                  <span className="mt-1 line-clamp-2 block whitespace-pre-line text-xs text-[var(--color-text-secondary)]">{message.body}</span>
                  <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">{message.senderName} · {new Date(message.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          {open.kind === 'thanks' && <Confetti burstKey={burst} />}
          <article onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={open.title}
                   className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
            <button type="button" onClick={() => setOpen(null)} aria-label={t('إغلاق', 'Close')} className="absolute end-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            {open.kind === 'thanks' && (
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 text-white shadow-lg"><Heart size={26} /></div>
            )}
            <h2 className="pe-8 font-cairo text-xl font-black text-slate-900">{open.title}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">{open.body}</p>
            {open.hasAttachment && (
              <button type="button" disabled={downloading} onClick={() => void download(open)}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {t('تنزيل شهادتك', 'Download your certificate')}
              </button>
            )}
            <p className="mt-6 text-xs text-slate-400">{open.senderName} · {new Date(open.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
            {open.kind === 'thanks' && (
              <button type="button" onClick={() => setBurst(value => value + 1)} className="mt-3 text-xs font-bold text-pink-600">🎉 {t('مرة أخرى', 'Again')}</button>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
