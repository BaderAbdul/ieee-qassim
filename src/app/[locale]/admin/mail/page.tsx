'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { Mail, Paperclip, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiSend } from '@/lib/backend';

interface Attachment { filename: string; contentType: string; contentBase64: string; size: number }
interface Delivery { id: string; recipient: string; status: string; attempts: number; lastError?: string }
const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';

export default function AdminMailPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const t = (ar: string, en: string) => isAr ? ar : en;
  const allowed = userData?.isSuperAdmin || userData?.role === 'super_admin' || userData?.canManageEmail || userData?.privileges?.includes('operations.update');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [requestKey, setRequestKey] = useState('');
  const changed = () => { setRequestKey(''); setMessageId(''); setDeliveries([]); setError(''); };
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError('');
    try {
      const selected = Array.from(files);
      if (attachments.length + selected.length > 10 || selected.some(file => file.size > 10 * 1024 * 1024) || [...attachments, ...selected].reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024) throw new Error(t('بحد أقصى ١٠ ملفات، ١٠ ميجابايت للملف و١٥ ميجابايت للمجموع.', 'Maximum 10 files, 10 MB per file and 15 MB total.'));
      const encoded = await Promise.all(selected.map(async file => {
        const value = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
        return { filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64: value, size: file.size };
      }));
      changed(); setAttachments(previous => [...previous, ...encoded]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر قراءة الملفات', 'Unable to read files')); } finally { setBusy(false); }
  };
  const refresh = async (id = messageId) => {
    if (!id) return;
    setBusy(true); setError('');
    try { setDeliveries((await apiGet<{ deliveries: Delivery[] }>(`/api/admin/mail/messages/${id}`)).deliveries); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load delivery status'); } finally { setBusy(false); }
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const key = requestKey || crypto.randomUUID(); setRequestKey(key);
    try {
      const result = await apiSend<{ messageId: string }>('POST', '/api/admin/mail/messages', {
        to: to.split(/[,;\s]+/).filter(Boolean), subject, html, idempotencyKey: key,
        attachments: attachments.map(({ filename, contentType, contentBase64 }) => ({ filename, contentType, contentBase64 })),
      });
      setMessageId(result.messageId); await refresh(result.messageId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to queue email'); } finally { setBusy(false); }
  };
  if (!allowed) return <p role="alert">{t('لا تملك صلاحية إرسال البريد.', 'You do not have permission to send email.')}</p>;
  return <div className="space-y-6">
    <header className="flex items-start gap-3"><Mail className="mt-1 text-[var(--color-accent)]" /><div><h1 className="text-2xl font-bold font-cairo">{t('البريد', 'Mail')}</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('يستلم كل مستفيد نسخة مستقلة لحماية عناوين البريد. المرفقات اختيارية.', 'Each recipient receives a private copy. Attachments are optional.')}</p></div></header>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}
    <form onSubmit={send} className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <fieldset disabled={busy} className="space-y-5">
        <label className="block space-y-2"><span>{t('المستلمون (حتى ١٠٠ عنوان)', 'Recipients (up to 100 addresses)')}</span><textarea dir="ltr" required className={input} value={to} onChange={event => { changed(); setTo(event.target.value); }} placeholder="person@example.com, another@example.com" /><span className="block text-xs text-[var(--color-text-muted)]">{t('افصل العناوين بفاصلة أو سطر جديد.', 'Separate addresses with commas or new lines.')}</span></label>
        <label className="block space-y-2"><span>{t('العنوان', 'Subject')}</span><input required maxLength={200} className={input} value={subject} onChange={event => { changed(); setSubject(event.target.value); }} /></label>
        <label className="block space-y-2"><span>{t('محتوى الرسالة بصيغة HTML', 'HTML message body')}</span><textarea dir="ltr" required rows={10} className={`${input} font-mono`} value={html} onChange={event => { changed(); setHtml(event.target.value); }} placeholder="<div dir=&quot;rtl&quot;><h1>مرحبًا</h1><p>محتوى الرسالة</p></div>" /></label>
        <details className="rounded-xl border border-[var(--color-border)] p-4"><summary className="cursor-pointer font-bold">{t('معاينة HTML', 'Preview HTML')}</summary><iframe title={t('معاينة محتوى البريد', 'Email HTML preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">${html}`} className="mt-3 h-72 w-full rounded-lg bg-white" /></details>
        <label className="block space-y-2"><span className="flex items-center gap-2"><Paperclip size={17} />{t('مرفقات اختيارية', 'Optional attachments')}</span><input type="file" multiple onChange={event => { void addFiles(event.target.files); event.target.value = ''; }} /><span className="block text-xs text-[var(--color-text-muted)]">{t('حتى ١٠ ملفات. ١٠ ميجابايت لكل ملف و١٥ ميجابايت للمجموع.', 'Up to 10 files. 10 MB per file, 15 MB total.')}</span></label>
        <ul className="space-y-2">{attachments.map((attachment, index) => <li key={`${index}-${attachment.filename}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm"><span>{attachment.filename} · {Math.ceil(attachment.size / 1024)} KB</span><button type="button" aria-label={`${t('حذف', 'Remove')} ${attachment.filename}`} onClick={() => { changed(); setAttachments(previous => previous.filter((_, i) => i !== index)); }}><Trash2 size={16} /></button></li>)}</ul>
        <button type="submit" disabled={!!messageId} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50"><Send size={17} />{busy ? t('جارٍ التنفيذ…', 'Working…') : t('إضافة إلى قائمة الإرسال', 'Queue email')}</button>
      </fieldset>
    </form>
    {messageId && <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{t('تمت إضافة الرسالة للقائمة — حالة التسليم', 'Email queued — delivery status')}</h2><button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-xl border border-[var(--color-border)] px-4 py-2 disabled:opacity-50">{t('تحديث الحالة', 'Refresh status')}</button></div><p className="text-xs text-[var(--color-text-muted)]">{t('الإضافة للقائمة لا تعني التسليم. يتولى العامل الإرسال باستخدام إعدادات المرسل الحالية.', 'Queued does not mean delivered. The worker sends using the current sender settings.')}</p>{deliveries.map(delivery => <div key={delivery.id} className="rounded-xl bg-[var(--color-surface-2)] p-3 text-sm"><p dir="ltr">{delivery.recipient} · {delivery.status}</p>{delivery.lastError && <p className="mt-1 text-amber-600">{delivery.lastError}</p>}</div>)}</section>}
  </div>;
}
