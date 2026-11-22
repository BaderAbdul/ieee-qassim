'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Mail, X } from 'lucide-react';
import { hasPrivilege, useAuth } from '@/context/AuthContext';
import { httpsCallable } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

export default function EventReminderButton({ eventId }: { eventId: number }) {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [join, setJoin] = useState(false);
  const [url, setUrl] = useState('');
  const [batchId, setBatchId] = useState('');
  const [error, setError] = useState('');
  const canSend = hasPrivilege(userData, 'events.read') && hasPrivilege(userData, 'mail.create');
  const call = httpsCallable(null, 'sendEventReminder');
  const preview = async () => {
    setOpen(true); setCount(null); setError(''); setBatchId(crypto.randomUUID());
    try { const result = await call({ eventId, preview: true }); setCount((result.data as { recipientCount: number }).recipientCount); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load recipients'); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !count) return;
    setBusy(true); setError('');
    try {
      const result = await call({ eventId, includeJoinLink: join, joinUrl: join ? url : '', batchId });
      const data = result.data as { queuedCount: number; alreadyQueuedCount: number };
      showToast(isAr ? `أُضيف ${data.queuedCount} بريدًا إلى قائمة الإرسال (${data.alreadyQueuedCount} أُضيف سابقًا).` : `${data.queuedCount} reminders queued (${data.alreadyQueuedCount} already queued).`, 'success');
      setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not queue reminders'); }
    finally { setBusy(false); }
  };
  if (!canSend) return null;
  return <>
    <button type="button" onClick={() => void preview()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-bold"><Mail size={16} />{isAr ? 'إيميل تذكير' : 'Reminder email'}</button>
    {open && createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={send} role="dialog" aria-modal="true" aria-labelledby="reminder-title" className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 id="reminder-title" className="text-lg font-bold">{isAr ? 'إرسال إيميل تذكير' : 'Send reminder email'}</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label={isAr ? 'إغلاق' : 'Close'}><X size={20} /></button></div>
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{count === null ? (isAr ? 'جارٍ تحميل المستلمين…' : 'Loading recipients…') : isAr ? `سيُرسل إلى ${count} بريدًا للمسجلين (المقبولين، المنتظرين، قيد المراجعة والحاضرين)، دون الملغاة والمرفوضة والحسابات المقيدة. يُستخدم قالب الطلاب من ربط الرسائل أو رسالة تذكير جاهزة.` : `Will email ${count} active registrants: approved, waitlisted, pending and attended. Cancelled, rejected and restricted accounts are excluded. Uses the student reminder mapping, or built-in reminder text.`}</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={join} disabled={busy} onChange={e => setJoin(e.target.checked)} />{isAr ? 'رابط الانضمام' : 'Include meeting link'}</label>
        {join && <label className="block space-y-2"><span>{isAr ? 'رابط اجتماع Meet / الانضمام' : 'Meet / meeting URL'}</span><input required type="url" pattern="https://.*" dir="ltr" disabled={busy} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://meet.google.com/..." className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3" /></label>}
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'تأكيد الإرسال يضيف الرسائل إلى قائمة البريد. إذا كان الإرسال متوقفًا تبقى في الانتظار.' : 'Confirming queues the messages. If delivery is paused, they remain pending.'}</p>
        <button disabled={busy || !count} type="submit" className="w-full rounded-xl bg-[var(--color-accent)] p-3 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">{isAr ? (busy ? 'جارٍ الإضافة…' : 'تأكيد إرسال التذكير') : (busy ? 'Queuing…' : 'Confirm reminder')}</button>
      </form>
    </div>, document.body)}
  </>;
}
