'use client';

import { useEffect, useState } from 'react';
import { Mail, Paperclip, Send, Trash2, Users } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { looksLikeEmail } from '@/lib/csv';
import { useToast } from '@/context/ToastContext';
import RecipientsFileUpload from './RecipientsFileUpload';

interface Stats { totalSent: number; sentToday: number; dailyLimit: number; remainingToday: number; totalStudents: number }
interface MailTemplate { id: string; name: string; subject: string; studentOnly: boolean }
interface CertTemplate { id: string; nameAr: string }

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7 space-y-4';

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return <div className="flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
    {options.map(opt => (
      <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${value === opt.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow' : 'text-[var(--color-text-secondary)]'}`}>
        {opt.label}
      </button>
    ))}
  </div>;
}

export default function MailSendTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [certTemplates, setCertTemplates] = useState<CertTemplate[]>([]);
  const [loadError, setLoadError] = useState('');

  const [recipientMode, setRecipientMode] = useState<'all' | 'limited'>('all');
  const [allLimit, setAllLimit] = useState(0);
  const [extraEmails, setExtraEmails] = useState('');
  const [limitedEmails, setLimitedEmails] = useState('');

  const [contentMode, setContentMode] = useState<'template' | 'manual'>('template');
  const [templateId, setTemplateId] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualHtml, setManualHtml] = useState('');

  const [attachmentMode, setAttachmentMode] = useState<'none' | 'fixed' | 'certificate'>('none');
  const [fixedFile, setFixedFile] = useState<{ filename: string; contentType: string; contentBase64: string } | null>(null);
  const [certificateTemplateId, setCertificateTemplateId] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, mail, certs] = await Promise.all([
          apiGet<Stats>('/api/admin/mail/stats'),
          apiGet<{ templates: MailTemplate[] }>('/api/admin/mail/templates', { scope: 'approved' }),
          apiGet<{ templates: CertTemplate[] }>('/api/admin/templates', { scope: 'approved' }),
        ]);
        setStats(s); setMailTemplates(mail.templates); setCertTemplates(certs.templates);
        setAllLimit(Math.min(s.totalStudents, s.remainingToday));
      } catch (reason) { setLoadError(reason instanceof Error ? reason.message : 'Unable to load mail sending data'); }
    })();
  }, []);

  const addExtracted = (emails: string[]) => {
    if (recipientMode === 'all') setExtraEmails(prev => [...new Set([...prev.split(/[\s,;\n]+/).filter(Boolean), ...emails])].join('\n'));
    else setLimitedEmails(prev => [...new Set([...prev.split(/[\s,;\n]+/).filter(Boolean), ...emails])].join('\n'));
  };

  const readFile = async (file: File) => {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setFixedFile({ filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64 });
  };

  const extraList = extraEmails.split(/[\s,;\n]+/).map(v => v.trim()).filter(looksLikeEmail);
  const limitedList = limitedEmails.split(/[\s,;\n]+/).map(v => v.trim()).filter(looksLikeEmail);
  const recipientCount = recipientMode === 'all' ? allLimit + extraList.length : limitedList.length;
  const selectedTemplate = mailTemplates.find(m => m.id === templateId);
  const contentReady = contentMode === 'template' ? !!selectedTemplate?.studentOnly : !!manualSubject.trim() && !!manualHtml.trim();
  const canSend = recipientCount > 0 && contentReady && !busy;

  const send = async () => {
    setBusy(true);
    try {
      const attachments = attachmentMode === 'fixed' && fixedFile ? [{ kind: 'fixed', ...fixedFile }]
        : attachmentMode === 'certificate' && certificateTemplateId ? [{ kind: 'certificate', certificateTemplateId, title: certificateTitle }]
        : [];
      const payload: Record<string, unknown> = {
        batchId: crypto.randomUUID(),
        recipientMode,
        ...(recipientMode === 'all' ? { allLimit, extraEmails: extraList } : { limitedEmails: limitedList }),
        contentMode,
        attachments,
        ...(contentMode === 'template' ? { templateId } : { subject: manualSubject, html: manualHtml }),
      };
      const res = await apiSend<{ recipientCount: number; queuedCount: number }>('POST', '/api/admin/mail/batch', payload);
      showToast(t(`تمت إضافة ${res.recipientCount} رسالة إلى قائمة الإرسال.`, `Queued ${res.recipientCount} emails for delivery.`), 'success');
      const refreshed = await apiGet<Stats>('/api/admin/mail/stats');
      setStats(refreshed);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر الإرسال', 'Unable to send'), 'error'); } finally { setBusy(false); }
  };

  if (loadError) return <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{loadError}</p>;
  if (!stats) return <p>{t('جارٍ التحميل…', 'Loading…')}</p>;

  return <div className="space-y-6 pb-12">
    <section className={panel}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={18} />{t('المستلمون', 'Recipients')}</h2>
      <Toggle value={recipientMode} onChange={v => setRecipientMode(v as 'all' | 'limited')}
              options={[{ id: 'all', label: t('كل الطلاب', 'All students') }, { id: 'limited', label: t('عدد محدد', 'Limited students') }]} />

      {recipientMode === 'all' ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t('عدد الطلاب المرسل إليهم', 'Number of students to send to')}: <span dir="ltr"><strong>{allLimit}</strong> / {stats.totalStudents}</span></span>
            <input type="range" min={0} max={Math.min(stats.totalStudents, stats.remainingToday)} value={allLimit}
                   onChange={e => setAllLimit(Number(e.target.value))} className="w-full" />
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t(`الحد الأقصى اليومي للرسائل ${stats.dailyLimit}، المتبقي اليوم ${stats.remainingToday} (أُرسل ${stats.sentToday} حتى الآن).`,
               `Today's sending limit is ${stats.dailyLimit}; ${stats.remainingToday} remain (${stats.sentToday} sent so far today).`)}
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t('هل هناك طلاب إضافيون لإضافتهم يدويًا؟', 'Any additional students to add manually?')}</span>
            <textarea dir="ltr" rows={2} className={input} value={extraEmails} onChange={e => setExtraEmails(e.target.value)}
                      placeholder="extra1@example.com, extra2@example.com" />
            <span className="block text-xs text-[var(--color-text-muted)]">{extraList.length} {t('عنوان صالح', 'valid addresses')}</span>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t('عناوين البريد الإلكتروني', 'Email addresses')}</span>
            <textarea dir="ltr" rows={4} className={input} value={limitedEmails} onChange={e => setLimitedEmails(e.target.value)}
                      placeholder="person@example.com, another@example.com" />
            <span className="block text-xs text-[var(--color-text-muted)]">{limitedList.length} {t('عنوان صالح', 'valid addresses')}</span>
          </label>
          <RecipientsFileUpload isAr={isAr} onExtracted={addExtracted} />
        </div>
      )}
    </section>

    <section className={panel}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Mail size={18} />{t('محتوى الرسالة', 'Message content')}</h2>
      <Toggle value={contentMode} onChange={v => setContentMode(v as 'template' | 'manual')}
              options={[{ id: 'template', label: t('قالب بريد', 'Template email') }, { id: 'manual', label: t('بريد مخصص', 'Manual email') }]} />

      {contentMode === 'template' ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t('القالب', 'Template')}</span>
            <select className={input} value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">{t('اختر قالبًا', 'Choose a template')}</option>
              {mailTemplates.map(m => (
                <option key={m.id} value={m.id} disabled={!m.studentOnly}>
                  {m.name || m.subject || m.id}{!m.studentOnly ? ` — ${t('يحتاج فعالية محددة', 'needs a specific event')}` : ''}
                </option>
              ))}
            </select>
            <span className="block text-xs text-[var(--color-text-muted)]">
              {t('يُشخصن اسم الطالب تلقائيًا من بيانات حسابه. القوالب التي تستخدم متغيرات الفعالية أو الراعي غير متاحة هنا — أرسلها من صفحة الفعالية نفسها.',
                 'The student’s name is personalized automatically from their account. Templates using event or sponsor variables aren’t available here — send those from the event itself.')}
            </span>
          </label>
          {templateId && selectedTemplate && !selectedTemplate.studentOnly && (
            <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>
              {t('هذا القالب يستخدم متغيرات غير متعلقة بالطالب ولا يمكن استخدامه هنا.', 'This template uses non-student variables and can’t be used here.')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-2"><span className="text-sm font-bold">{t('العنوان', 'Subject')}</span>
            <input className={input} maxLength={200} value={manualSubject} onChange={e => setManualSubject(e.target.value)} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">{t('محتوى الرسالة بصيغة HTML', 'HTML message body')}</span>
            <textarea dir="ltr" rows={8} className={`${input} font-mono`} value={manualHtml} onChange={e => setManualHtml(e.target.value)}
                      placeholder={'<div dir="rtl"><h1>مرحبًا</h1></div>'} /></label>
          <p className="text-xs text-[var(--color-text-muted)]">{t('لا يُحفظ هذا البريد كقالب قابل لإعادة الاستخدام.', 'This email isn’t saved as a reusable template.')}</p>
        </div>
      )}
    </section>

    <section className={panel}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Paperclip size={18} />{t('المرفقات', 'Attachments')}</h2>
      <Toggle value={attachmentMode} onChange={v => setAttachmentMode(v as typeof attachmentMode)}
              options={[{ id: 'none', label: t('بلا مرفق', 'None') }, { id: 'fixed', label: t('ملف ثابت', 'Fixed file') }, { id: 'certificate', label: t('قالب شهادة', 'Certificate') }]} />
      {attachmentMode === 'fixed' && (
        <div className="space-y-2">
          <input type="file" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }} />
          {fixedFile && <p className="flex items-center justify-between text-xs"><span>{fixedFile.filename}</span><button type="button" onClick={() => setFixedFile(null)}><Trash2 size={14} /></button></p>}
        </div>
      )}
      {attachmentMode === 'certificate' && (
        <div className="space-y-2">
          <select className={input} value={certificateTemplateId} onChange={e => setCertificateTemplateId(e.target.value)}>
            <option value="">{t('اختر قالب شهادة', 'Choose a certificate template')}</option>
            {certTemplates.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
          <input className={input} placeholder={t('عنوان المرفق (اختياري)', 'Attachment title (optional)')} value={certificateTitle} onChange={e => setCertificateTitle(e.target.value)} />
          <p className="text-xs text-[var(--color-text-muted)]">{t('تُرسل الشهادة بقيم تجريبية لأن الرسالة مشتركة بين عدة مستلمين.', 'The certificate is rendered with sample values since this message is shared across recipients.')}</p>
        </div>
      )}
    </section>

    <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-sm text-[var(--color-text-secondary)]">{t(`سيتم الإرسال إلى ${recipientCount} مستلم.`, `Will send to ${recipientCount} recipients.`)}</p>
      <button type="button" disabled={!canSend} onClick={() => void send()}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">
        <Send size={17} />{busy ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال', 'Send')}
      </button>
    </div>
  </div>;
}
