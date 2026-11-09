'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowRight, Check, Code2, Eye, Image as ImageIcon, Paperclip, Send, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiSend, uploadImage } from '@/lib/backend';
import {
  EMAIL_VARIABLE_GROUPS, MAX_TEMPLATE_ATTACHMENTS, MAX_TEST_RECIPIENTS, imageDimensions, insertAtCursor,
  variableToken, type EmailBoilerplateSummary, type EmailTemplate, type EmailTemplateAttachment,
} from '@/lib/emailTemplates';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const smallSelect = 'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)]`;
const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md shadow-sm';

interface ApiErrorLike { code?: string; message?: string }
type Draft = Pick<EmailTemplate, 'id' | 'name' | 'subject' | 'html' | 'allowAttachments' | 'revision' | 'status'> & { boilerplateId: string | null };
const emptyDraft: Draft = { id: '', name: '', subject: '', html: '', allowAttachments: false, boilerplateId: null, revision: 0, status: 'draft' };

export default function EmailTemplateFullPage({ templateId }: { templateId?: string }) {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;
  const router = useRouter();
  const { userData } = useAuth();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [attachments, setAttachments] = useState<EmailTemplateAttachment[]>([]);
  const [createdBy, setCreatedBy] = useState<string | undefined>(undefined);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(!!templateId);
  const [notFound, setNotFound] = useState(false);
  const [certOptions, setCertOptions] = useState<{ id: string; nameAr: string }[] | null>(null);
  const [boilerplates, setBoilerplates] = useState<EmailBoilerplateSummary[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [mobile, setMobile] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState('');
  const [testOk, setTestOk] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);

  const canEdit = !templateId || canManage || createdBy === userData?.id;
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadBoilerplates = useCallback(async () => {
    try {
      const result = await apiGet<{ boilerplates: EmailBoilerplateSummary[]; canManage: boolean }>('/api/admin/mail/boilerplates');
      setBoilerplates(result.boilerplates);
      if (!templateId) setCanManage(result.canManage);
    } catch { /* non-critical: the "start from boilerplate" list just stays empty */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadBoilerplates();
    if (!templateId) return;
    setLoading(true);
    apiGet<EmailTemplate>(`/api/admin/mail/templates/${templateId}`)
      .then(result => {
        setDraft({ id: result.id, name: result.name, subject: result.subject, html: result.html, allowAttachments: result.allowAttachments, boilerplateId: result.boilerplateId, revision: result.revision, status: result.status });
        setAttachments(result.attachments); setCreatedBy(result.createdBy); setCanManage(!!result.canManage);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const save = useCallback(async (payload: Draft) => {
    setSaveState('saving'); setError('');
    try {
      const body = { name: payload.name, subject: payload.subject, html: payload.html, allowAttachments: payload.allowAttachments, boilerplateId: payload.boilerplateId, revision: payload.revision };
      const result = await apiSend<{ id: string; revision: number; status: 'draft' | 'approved' }>(payload.id ? 'PUT' : 'POST', payload.id ? `/api/admin/mail/templates/${payload.id}` : '/api/admin/mail/templates', body);
      setDraft(current => current.html === payload.html && current.name === payload.name && current.subject === payload.subject
        ? { ...current, id: result.id, revision: result.revision, status: result.status } : current);
      if (!payload.id) router.replace(`/admin/mail/templates/${result.id}`);
      setSaveState('saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('تعذر الحفظ التلقائي', 'Autosave failed'));
      setSaveState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canEdit || loading) return;
    if (!mounted.current) { mounted.current = true; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void save(draft); }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.name, draft.subject, draft.html, draft.allowAttachments]);

  const loadCertOptions = async () => {
    if (certOptions) return;
    try { setCertOptions((await apiGet<{ templates: { id: string; nameAr: string }[] }>('/api/admin/templates', { scope: 'approved' })).templates); }
    catch { setCertOptions([]); }
  };
  useEffect(() => { if (draft.allowAttachments) void loadCertOptions(); }, [draft.allowAttachments]); // eslint-disable-line react-hooks/exhaustive-deps

  const insertVariableInCode = (source: string) => insertAtCursor(codeRef.current, draft.html, html => setDraft(previous => ({ ...previous, html })), variableToken(source));
  const insertVariableInSubject = (source: string) => insertAtCursor(subjectRef.current, draft.subject, subject => setDraft(previous => ({ ...previous, subject })), variableToken(source));

  const startFromBoilerplate = async (boilerplateId: string) => {
    if (draft.html.trim() && !window.confirm(t('سيستبدل هذا المحتوى الحالي بالقالب الأساسي. متابعة؟', 'This replaces the current content with the boilerplate. Continue?'))) return;
    setError('');
    try {
      const boilerplate = await apiGet<{ html: string }>(`/api/admin/mail/boilerplates/${boilerplateId}`);
      setDraft(previous => ({ ...previous, html: boilerplate.html, boilerplateId }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر تحميل القالب الأساسي', 'Unable to load the boilerplate')); }
  };

  const insertImage = async (file: File) => {
    setImageBusy(true); setError('');
    try {
      const [url, natural] = await Promise.all([uploadImage(file, 'email'), imageDimensions(file)]);
      const width = 320;
      const height = natural ? Math.round(width * natural.height / natural.width) : undefined;
      const tag = `<img src="${url}" alt="" width="${width}"${height ? ` height="${height}"` : ''} style="display:block;margin:0 auto;width:${width}px;max-width:100%;height:auto;" />`;
      insertAtCursor(codeRef.current, draft.html, html => setDraft(previous => ({ ...previous, html })), tag);
      setTab('code');
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر رفع الصورة', 'Unable to upload the image')); }
    finally { setImageBusy(false); }
  };

  const addFixedAttachment = async (file: File, title: string) => {
    if (!draft.id) return;
    if (file.size > 10 * 1024 * 1024) { setError(t('الملف أكبر من ١٠ ميجابايت.', 'File exceeds 10 MB.')); return; }
    setAttachBusy(true); setError('');
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const row = await apiSend<EmailTemplateAttachment>('POST', `/api/admin/mail/templates/${draft.id}/attachments`, { kind: 'fixed', title, filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64 });
      setAttachments(previous => [...previous, row]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر إضافة المرفق', 'Unable to add attachment')); } finally { setAttachBusy(false); }
  };
  const addCertificateAttachment = async (certificateTemplateId: string, title: string) => {
    if (!draft.id) return;
    setAttachBusy(true); setError('');
    try {
      const row = await apiSend<EmailTemplateAttachment>('POST', `/api/admin/mail/templates/${draft.id}/attachments`, { kind: 'certificate', title, certificateTemplateId });
      setAttachments(previous => [...previous, row]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر إضافة المرفق', 'Unable to add attachment')); } finally { setAttachBusy(false); }
  };
  const removeAttachment = async (id: string) => {
    if (!draft.id) return;
    setAttachBusy(true); setError('');
    try { await apiSend('DELETE', `/api/admin/mail/templates/${draft.id}/attachments/${id}`); setAttachments(previous => previous.filter(item => item.id !== id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر حذف المرفق', 'Unable to remove attachment')); } finally { setAttachBusy(false); }
  };

  const sendTest = async () => {
    const list = recipients.split(/[,;\s]+/).filter(Boolean);
    if (list.length === 0 || list.length > MAX_TEST_RECIPIENTS) { setTestError(t(`أدخل بين ١ و٥ عناوين.`, `Enter between 1 and ${MAX_TEST_RECIPIENTS} addresses.`)); return; }
    if (!draft.id) { setTestError(t('احفظ القالب أولًا.', 'Save the template first.')); return; }
    setTestBusy(true); setTestError(''); setTestOk(false);
    try { await apiSend('POST', `/api/admin/mail/templates/${draft.id}/test-send`, { recipients: list }); setTestOk(true); }
    catch (reason) {
      const apiError = reason as ApiErrorLike;
      if (apiError?.code === 'sender-not-configured') {
        if (window.confirm(t('لم يُضبط بريد المرسل بعد. الانتقال لإعدادات البريد الآن؟', 'The sender email isn’t configured yet. Go to email settings now?'))) { router.push('/admin/mail'); return; }
        setTestError(t('لم يُضبط بريد المرسل بعد.', 'Sender email isn’t configured yet.'));
      } else setTestError(apiError?.message || t('تعذر إرسال الاختبار', 'Unable to send the test'));
    } finally { setTestBusy(false); }
  };

  const deleteTemplate = async () => {
    if (!draft.id || !window.confirm(t('حذف هذا القالب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.', 'Permanently delete this template? This cannot be undone.'))) return;
    setDeleteBusy(true); setError('');
    try { await apiSend('DELETE', `/api/admin/mail/templates/${draft.id}`); router.push('/admin/templates'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر حذف القالب', 'Unable to delete the template')); setDeleteBusy(false); }
  };
  const approveTemplate = async () => {
    if (!draft.id) return;
    setApproveBusy(true); setError('');
    try { await apiSend('POST', `/api/admin/mail/templates/${draft.id}/approve`, { revision: draft.revision }); setDraft(previous => ({ ...previous, status: 'approved' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر الاعتماد', 'Unable to approve')); } finally { setApproveBusy(false); }
  };

  if (loading) return <p role="status" className="p-10 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>;
  if (notFound) return <div className={`${panel} p-10 text-center`}>{t('القالب غير موجود.', 'Template not found.')}</div>;

  return <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-5 pb-16">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/templates" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        <ArrowRight size={16} className={isAr ? '' : 'rotate-180'} />{t('رجوع إلى القوالب', 'Back to templates')}
      </Link>
      <div className="flex items-center gap-2">
        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${draft.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{draft.status === 'approved' ? t('معتمد', 'Approved') : t('مسودة', 'Draft')}</span>
        <span className="text-xs text-[var(--color-text-muted)]">{saveState === 'saving' ? t('جارٍ الحفظ…', 'Saving…') : saveState === 'saved' ? t('تم الحفظ', 'Saved') : saveState === 'error' ? t('فشل الحفظ', 'Save failed') : ''}</span>
      </div>
    </div>
    {!canEdit && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{t('هذا القالب لمنشئ آخر — للعرض فقط.', 'This template belongs to another author -- read only.')}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}

    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      {/* Main: always-visible preview/code, never covered by side-panel actions */}
      <div className={`${panel} min-w-0 space-y-3 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
          <div className="flex gap-1">
            <button type="button" onClick={() => setTab('preview')} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold ${tab === 'preview' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}><Eye size={16} />{t('المعاينة', 'Preview')}</button>
            <button type="button" onClick={() => setTab('code')} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold ${tab === 'code' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}><Code2 size={16} />{t('الكود', 'Code')}</button>
          </div>
          {tab === 'preview' && <button type="button" className={button} onClick={() => setMobile(previous => !previous)}><Smartphone size={16} />{mobile ? t('عرض سطح المكتب', 'Desktop view') : t('معاينة الجوال', 'Mobile preview')}</button>}
        </div>
        {tab === 'code' && canEdit && <div className="flex flex-wrap items-center gap-1.5">
          <VariablePicker isAr={isAr} onInsert={insertVariableInCode} />
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void insertImage(file); }} />
          <button type="button" disabled={imageBusy} className={`${smallSelect} inline-flex items-center gap-1.5 font-bold hover:border-[var(--color-accent)]`} onClick={() => imageInputRef.current?.click()}><ImageIcon size={14} />{imageBusy ? t('جارٍ الرفع…', 'Uploading…') : t('إدراج صورة', 'Insert image')}</button>
        </div>}
        {tab === 'preview'
          ? <div className={mobile ? 'mx-auto w-[375px] overflow-hidden rounded-2xl border-4 border-[var(--color-border)] bg-white' : 'overflow-hidden rounded-xl border border-[var(--color-border)] bg-white'}>
              <iframe title={t('معاينة البريد', 'Email preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={draft.html || '<p></p>'} className={mobile ? 'h-[600px] w-full' : 'h-[640px] w-full'} />
            </div>
          : <textarea ref={codeRef} dir="ltr" disabled={!canEdit} rows={28} className={`${input} font-mono text-xs`} value={draft.html} onChange={event => setDraft({ ...draft, html: event.target.value })} />}
      </div>

      {/* Side panel: metadata, variables, attachments, test-send -- always visible regardless of main tab */}
      <aside className={`${panel} space-y-4 p-5`}>
        {canEdit && boilerplates.length > 0 && <label className="block space-y-2"><span className="text-xs font-bold">{t('ابدأ من قالب أساسي (اختياري)', 'Start from a boilerplate (optional)')}</span>
          <select className={input} value="" onChange={event => { if (event.target.value) void startFromBoilerplate(event.target.value); }}>
            <option value="">{t('ابدأ من الصفر', 'Start blank')}</option>
            {boilerplates.map(item => <option key={item.id} value={item.id}>{item.name || t('(بدون اسم)', '(untitled)')}</option>)}
          </select>
        </label>}
        <fieldset disabled={!canEdit} className="space-y-4">
          <label className="block space-y-2"><span>{t('اسم القالب', 'Template name')}</span><input className={input} maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
          <div className="space-y-2">
            <label className="block space-y-2"><span>{t('عنوان البريد', 'Email subject')}</span><input ref={subjectRef} className={input} maxLength={200} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>
            <VariablePicker isAr={isAr} onInsert={insertVariableInSubject} />
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.allowAttachments} disabled={!draft.id} onChange={event => setDraft({ ...draft, allowAttachments: event.target.checked })} />{t('السماح بالمرفقات', 'Allow attachments')}</label>
          {!draft.id && <p className="text-xs text-[var(--color-text-muted)]">{t('سيُحفظ القالب أولًا كمسودة قبل تفعيل المرفقات.', 'The template saves as a draft first before attachments can be enabled.')}</p>}
        </fieldset>

        {draft.allowAttachments && draft.id && <section className="space-y-3 border-t border-[var(--color-border)] pt-4">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Paperclip size={16} />{t('المرفقات', 'Attachments')}</h3>
          {attachments.length > 0 && <ul className="space-y-2">{attachments.map(attachment => <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm">
            <span className="truncate">{attachment.title} · {attachment.kind === 'fixed' ? t('ملف ثابت', 'Fixed file') : t('شهادة متغيرة', 'Variable certificate')}</span>
            {canEdit && <button type="button" disabled={attachBusy} aria-label={t('حذف', 'Remove')} onClick={() => void removeAttachment(attachment.id)}><Trash2 size={16} /></button>}
          </li>)}</ul>}
          {canEdit && attachments.length < MAX_TEMPLATE_ATTACHMENTS && <div className="space-y-3">
            <FixedAttachmentForm isAr={isAr} busy={attachBusy} onSubmit={addFixedAttachment} />
            <CertificateAttachmentForm isAr={isAr} busy={attachBusy} options={certOptions} onLoad={loadCertOptions} onSubmit={addCertificateAttachment} />
          </div>}
        </section>}

        <section className="space-y-3 border-t border-[var(--color-border)] pt-4">
          <button type="button" className={primary} disabled={!draft.id || testBusy} onClick={() => { setTestOpen(previous => !previous); setTestOk(false); setTestError(''); }}><Send size={16} />{t('إرسال اختباري', 'Send test')}</button>
          {testOpen && <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <label className="block space-y-2"><span className="text-xs">{t(`عناوين الاختبار (حتى ${MAX_TEST_RECIPIENTS})`, `Test recipients (up to ${MAX_TEST_RECIPIENTS})`)}</span><input dir="ltr" className={input} value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="person@example.com, another@example.com" /></label>
            {testError && <p role="alert" className="text-sm text-red-600">{testError}</p>}
            {testOk && <p role="status" className="text-sm text-emerald-600">{t('تم إضافة الرسالة الاختبارية لقائمة الإرسال.', 'Test message queued for delivery.')}</p>}
            <button type="button" className={primary} disabled={testBusy} onClick={() => void sendTest()}><Check size={16} />{testBusy ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال', 'Send')}</button>
          </div>}
          {canManage && draft.id && draft.status === 'draft' && <button type="button" className={button} disabled={approveBusy} onClick={() => void approveTemplate()}><ShieldCheck size={16} />{approveBusy ? t('جارٍ الاعتماد…', 'Approving…') : t('اعتماد القالب', 'Approve template')}</button>}
          {canManage && draft.id && <button type="button" className={`${button} border-red-500/40 text-red-600 hover:bg-red-500/10`} disabled={deleteBusy} onClick={() => void deleteTemplate()}><Trash2 size={16} />{deleteBusy ? t('جارٍ الحذف…', 'Deleting…') : t('حذف القالب', 'Delete template')}</button>}
          {!canManage && draft.id && <p className="text-xs text-[var(--color-text-muted)]">{t('حذف القالب متاح فقط للمدير العام أو حامل شارة Technician.', 'Only a super admin or Technician badge holder can delete this template.')}</p>}
        </section>
      </aside>
    </div>
  </div>;
}

function VariablePicker({ isAr, onInsert }: { isAr: boolean; onInsert: (source: string) => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  return <select className={smallSelect} value="" onChange={event => { if (event.target.value) onInsert(event.target.value); event.target.value = ''; }}>
    <option value="">{t('إدراج متغيّر…', 'Insert variable…')}</option>
    {EMAIL_VARIABLE_GROUPS.map(group => <optgroup key={group.id} label={t(group.ar, group.en)}>
      {group.variables.map(variable => <option key={variable.source} value={variable.source}>{t(variable.ar, variable.en)}</option>)}
    </optgroup>)}
  </select>;
}

function FixedAttachmentForm({ isAr, busy, onSubmit }: { isAr: boolean; busy: boolean; onSubmit: (file: File, title: string) => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [title, setTitle] = useState('');
  return <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
    <p className="text-xs font-bold">{t('ملف ثابت', 'Fixed file')}</p>
    <input className={input} placeholder={t('عنوان المرفق (اختياري)', 'Attachment title (optional)')} value={title} onChange={event => setTitle(event.target.value)} />
    <input type="file" disabled={busy} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) { onSubmit(file, title.trim() || file.name.replace(/\.[^./\\]+$/, '')); setTitle(''); }
    }} />
    <p className="text-xs text-[var(--color-text-muted)]">{t('يُضاف المرفق فور اختيار الملف.', 'The attachment is added as soon as you choose a file.')}</p>
  </div>;
}

function CertificateAttachmentForm({ isAr, busy, options, onLoad, onSubmit }: {
  isAr: boolean; busy: boolean; options: { id: string; nameAr: string }[] | null; onLoad: () => void; onSubmit: (certificateTemplateId: string, title: string) => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [title, setTitle] = useState('');
  useEffect(() => { onLoad(); }, [onLoad]);
  return <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
    <p className="text-xs font-bold">{t('شهادة متغيرة', 'Variable certificate')}</p>
    <input className={input} placeholder={t('عنوان المرفق (اختياري)', 'Attachment title (optional)')} value={title} onChange={event => setTitle(event.target.value)} />
    {options === null ? <p className="text-xs text-[var(--color-text-muted)]">{t('جارٍ التحميل…', 'Loading…')}</p>
      : options.length === 0 ? <p className="text-sm text-amber-700">{t('لا توجد قوالب شهادات معتمدة بعد. أنشئ قالب شهادة واطلب اعتماده من صفحة القوالب أولًا.', 'No approved certificate templates yet. Create one and get it approved from the Templates page first.')}</p>
      : <select disabled={busy} className={input} value="" onChange={event => {
          const id = event.target.value; if (!id) return;
          const chosen = options.find(option => option.id === id);
          onSubmit(id, title.trim() || chosen?.nameAr || ''); setTitle(''); event.target.value = '';
        }}>
          <option value="">{t('اختر قالب شهادة معتمد…', 'Choose an approved certificate template…')}</option>
          {options.map(option => <option key={option.id} value={option.id} dir="rtl">{option.nameAr}</option>)}
        </select>}
    <p className="text-xs text-[var(--color-text-muted)]">{t('تُولَّد نسخة اختبارية بقيم مؤقتة عند الإرسال الاختباري، ويُضاف المرفق فور الاختيار.', 'A test copy with placeholder values is generated at test-send time; the attachment is added as soon as you choose it.')}</p>
  </div>;
}
