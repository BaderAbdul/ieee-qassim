'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Paperclip, Send, Smartphone, Trash2, Undo2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { apiGet, apiSend } from '@/lib/backend';
import { EMAIL_VARIABLE_GROUPS, MAX_TEMPLATE_ATTACHMENTS, MAX_TEST_RECIPIENTS, variableToken, type EmailTemplate, type EmailTemplateAttachment } from '@/lib/emailTemplates';
import TemplateDialog from './TemplateDialog';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)]`;

interface ApiErrorLike { code?: string; message?: string }
type Draft = Pick<EmailTemplate, 'id' | 'name' | 'subject' | 'html' | 'allowAttachments' | 'revision'> & { boilerplateId: string | null };

export default function EmailTemplateEditor({ initial, startHtml, isAr, canManage, currentUserId, onClose, onSaved }: {
  initial?: EmailTemplate; startHtml?: string; isAr: boolean; canManage: boolean; currentUserId?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const router = useRouter();
  const canEdit = !initial || canManage || initial.createdBy === currentUserId;
  const [draft, setDraft] = useState<Draft>(initial
    ? { id: initial.id, name: initial.name, subject: initial.subject, html: initial.html, allowAttachments: initial.allowAttachments, boilerplateId: initial.boilerplateId, revision: initial.revision }
    : { id: '', name: '', subject: '', html: startHtml || '', allowAttachments: false, boilerplateId: null, revision: 0 });
  const [attachments, setAttachments] = useState<EmailTemplateAttachment[]>(initial?.attachments || []);
  const [certOptions, setCertOptions] = useState<{ id: string; nameAr: string }[] | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);
  const [attachForm, setAttachForm] = useState<{ kind: 'fixed' | 'certificate' } | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState('');
  const [testOk, setTestOk] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const mounted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { if (previewRef.current && previewRef.current.innerHTML !== draft.html) previewRef.current.innerHTML = draft.html; }, [draft.id]);

  const commitHtml = (next: string) => {
    if (next === draft.html) return;
    setHistory(previous => [...previous, draft.html].slice(-30));
    setDraft(previous => ({ ...previous, html: next }));
  };
  const revert = () => {
    const previous = history.at(-1);
    if (previous === undefined) return;
    setHistory(current => current.slice(0, -1));
    setDraft(current => ({ ...current, html: previous }));
    if (previewRef.current) previewRef.current.innerHTML = previous;
  };
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && previewRef.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
  };
  const insertVariable = (source: string) => {
    const area = previewRef.current;
    if (!area || !canEdit) return;
    area.focus();
    const selection = window.getSelection();
    let range = savedRange.current;
    if (!range || !area.contains(range.startContainer)) { range = document.createRange(); range.selectNodeContents(area); range.collapse(false); }
    selection?.removeAllRanges(); selection?.addRange(range);
    const node = document.createTextNode(variableToken(source));
    range.deleteContents(); range.insertNode(node);
    range.setStartAfter(node); range.setEndAfter(node);
    selection?.removeAllRanges(); selection?.addRange(range);
    savedRange.current = range.cloneRange();
    commitHtml(area.innerHTML);
  };
  const insertSubjectVariable = (source: string) => {
    const field = subjectRef.current;
    const token = variableToken(source);
    const start = field?.selectionStart ?? draft.subject.length;
    const end = field?.selectionEnd ?? draft.subject.length;
    const next = draft.subject.slice(0, start) + token + draft.subject.slice(end);
    setDraft(previous => ({ ...previous, subject: next }));
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = useCallback(async (payload: Draft) => {
    setSaveState('saving'); setError('');
    try {
      const body = { name: payload.name, subject: payload.subject, html: payload.html, allowAttachments: payload.allowAttachments, boilerplateId: payload.boilerplateId, revision: payload.revision };
      const result = await apiSend<{ id: string; revision: number }>(payload.id ? 'PUT' : 'POST', payload.id ? `/api/admin/mail/templates/${payload.id}` : '/api/admin/mail/templates', body);
      setDraft(current => current.html === payload.html && current.name === payload.name && current.subject === payload.subject
        ? { ...current, id: result.id, revision: result.revision } : current);
      setSaveState('saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('تعذر الحفظ التلقائي', 'Autosave failed'));
      setSaveState('error');
    }
  }, [t]);

  useEffect(() => {
    if (!canEdit) return;
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

  const addFixedAttachment = async (file: File, title: string) => {
    if (!draft.id || !title.trim() || !file) return;
    if (file.size > 10 * 1024 * 1024) { setError(t('الملف أكبر من ١٠ ميجابايت.', 'File exceeds 10 MB.')); return; }
    setAttachBusy(true); setError('');
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const row = await apiSend<EmailTemplateAttachment>('POST', `/api/admin/mail/templates/${draft.id}/attachments`, { kind: 'fixed', title: title.trim(), filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64 });
      setAttachments(previous => [...previous, row]); setAttachForm(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر إضافة المرفق', 'Unable to add attachment')); } finally { setAttachBusy(false); }
  };
  const addCertificateAttachment = async (certificateTemplateId: string, title: string) => {
    if (!draft.id || !title.trim() || !certificateTemplateId) return;
    setAttachBusy(true); setError('');
    try {
      const row = await apiSend<EmailTemplateAttachment>('POST', `/api/admin/mail/templates/${draft.id}/attachments`, { kind: 'certificate', title: title.trim(), certificateTemplateId });
      setAttachments(previous => [...previous, row]); setAttachForm(null);
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
    try {
      await apiSend('POST', `/api/admin/mail/templates/${draft.id}/test-send`, { recipients: list });
      setTestOk(true);
    } catch (reason) {
      const error = reason as ApiErrorLike;
      if (error?.code === 'sender-not-configured') {
        if (window.confirm(t('لم يُضبط بريد المرسل بعد. الانتقال لإعدادات البريد الآن؟', 'The sender email isn’t configured yet. Go to email settings now?'))) { router.push('/admin/mail'); return; }
        setTestError(t('لم يُضبط بريد المرسل بعد.', 'Sender email isn’t configured yet.'));
      } else setTestError(error?.message || t('تعذر إرسال الاختبار', 'Unable to send the test'));
    } finally { setTestBusy(false); }
  };

  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteTemplate = async () => {
    if (!draft.id || !window.confirm(t('حذف هذا القالب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.', 'Permanently delete this template? This cannot be undone.'))) return;
    setDeleteBusy(true); setError('');
    try { await apiSend('DELETE', `/api/admin/mail/templates/${draft.id}`); onClose(); onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر حذف القالب', 'Unable to delete the template')); setDeleteBusy(false); }
  };

  const close = () => { if (saveTimer.current) clearTimeout(saveTimer.current); onClose(); onSaved(); };

  return <TemplateDialog title={t('محرر قالب البريد', 'Email template editor')} onClose={close}>
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-5">
      {!canEdit && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{t('هذا القالب لمنشئ آخر — للعرض فقط.', 'This template belongs to another author -- read only.')}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button type="button" className={button} disabled={history.length === 0} onClick={revert} title={t('تراجع عن آخر تنسيق', 'Revert last formatting change')}><Undo2 size={16} />{t('تراجع', 'Revert')}</button>
              <button type="button" className={button} onClick={() => setMobile(previous => !previous)}><Smartphone size={16} />{mobile ? t('عرض سطح المكتب', 'Desktop view') : t('معاينة الجوال', 'Mobile preview')}</button>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{saveState === 'saving' ? t('جارٍ الحفظ…', 'Saving…') : saveState === 'saved' ? t('تم الحفظ كمسودة', 'Saved as draft') : saveState === 'error' ? t('فشل الحفظ', 'Save failed') : ''}</span>
          </div>
          {!mobile && canEdit && <div className="flex flex-wrap gap-1.5">{EMAIL_VARIABLE_GROUPS.flatMap(group => group.variables).map(variable => <button key={variable.source} type="button" title={variableToken(variable.source)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-bold hover:border-[var(--color-accent)]"
            onMouseDown={event => event.preventDefault()} onClick={() => insertVariable(variable.source)}>{t(variable.ar, variable.en)}</button>)}</div>}
          {mobile ? <div className="mx-auto w-[375px] overflow-hidden rounded-2xl border-4 border-[var(--color-border)] bg-white"><iframe title={t('معاينة الجوال', 'Mobile preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={draft.html} className="h-[600px] w-full" /></div>
            : <div ref={previewRef} contentEditable={canEdit} suppressContentEditableWarning onBlur={event => commitHtml(event.currentTarget.innerHTML)}
                onMouseUp={saveSelection} onKeyUp={saveSelection}
                className="min-h-[420px] rounded-xl border border-[var(--color-border)] bg-white p-4 text-black" dir="ltr" />}
          <p className="text-xs text-[var(--color-text-muted)]">{t('المعاينة قابلة للتعديل مباشرة: غيّر النص مع الحفاظ على التنسيق. استخدم زر التراجع لاستعادة آخر تغيير تنسيق. اضغط زر متغير لإدراجه في موضع المؤشر.', 'The preview is directly editable: change text while keeping formatting. Use Revert to undo the last formatting change. Click a variable button to insert it at the cursor.')}</p>
        </div>
        <fieldset disabled={!canEdit} className="space-y-4">
          <label className="block space-y-2"><span>{t('اسم القالب', 'Template name')}</span><input className={input} maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
          <div className="space-y-2">
            <label className="block space-y-2"><span>{t('عنوان البريد', 'Email subject')}</span><input ref={subjectRef} className={input} maxLength={200} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>
            {canEdit && <div className="flex flex-wrap gap-1.5">{EMAIL_VARIABLE_GROUPS.flatMap(group => group.variables).map(variable => <button key={variable.source} type="button" title={variableToken(variable.source)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-bold hover:border-[var(--color-accent)]"
              onClick={() => insertSubjectVariable(variable.source)}>{t(variable.ar, variable.en)}</button>)}</div>}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.allowAttachments} disabled={!draft.id} onChange={event => setDraft({ ...draft, allowAttachments: event.target.checked })} />{t('السماح بالمرفقات', 'Allow attachments')}</label>
          {!draft.id && <p className="text-xs text-[var(--color-text-muted)]">{t('سيُحفظ القالب أولًا كمسودة قبل تفعيل المرفقات.', 'The template saves as a draft first before attachments can be enabled.')}</p>}
          <button type="button" className={primary} disabled={!draft.id || testBusy} onClick={() => { setTestOpen(true); setTestOk(false); setTestError(''); }}><Send size={16} />{t('إرسال اختباري', 'Send test')}</button>
          {canEdit && draft.id && <button type="button" className={`${button} border-red-500/40 text-red-600 hover:bg-red-500/10`} disabled={deleteBusy} onClick={() => void deleteTemplate()}><Trash2 size={16} />{deleteBusy ? t('جارٍ الحذف…', 'Deleting…') : t('حذف القالب', 'Delete template')}</button>}
        </fieldset>
      </div>
      {draft.allowAttachments && draft.id && <section className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <h3 className="flex items-center gap-2 font-bold"><Paperclip size={16} />{t('المرفقات', 'Attachments')}</h3>
        <ul className="space-y-2">{attachments.map(attachment => <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm">
          <span>{attachment.title} · {attachment.kind === 'fixed' ? t('ملف ثابت', 'Fixed file') : t('شهادة متغيرة', 'Variable certificate')}</span>
          {canEdit && <button type="button" disabled={attachBusy} aria-label={t('حذف', 'Remove')} onClick={() => void removeAttachment(attachment.id)}><Trash2 size={16} /></button>}
        </li>)}</ul>
        {canEdit && attachments.length < MAX_TEMPLATE_ATTACHMENTS && <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => setAttachForm({ kind: 'fixed' })}>{t('إضافة ملف ثابت', 'Add fixed file')}</button>
          <button type="button" className={button} onClick={() => { setAttachForm({ kind: 'certificate' }); void loadCertOptions(); }}>{t('إضافة شهادة متغيرة', 'Add variable certificate')}</button>
        </div>}
        {attachForm?.kind === 'fixed' && <FixedAttachmentForm isAr={isAr} busy={attachBusy} onCancel={() => setAttachForm(null)} onSubmit={addFixedAttachment} />}
        {attachForm?.kind === 'certificate' && <CertificateAttachmentForm isAr={isAr} busy={attachBusy} options={certOptions || []} onCancel={() => setAttachForm(null)} onSubmit={addCertificateAttachment} />}
      </section>}
      {testOpen && <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <label className="block space-y-2"><span>{t(`عناوين الاختبار (حتى ${MAX_TEST_RECIPIENTS})`, `Test recipients (up to ${MAX_TEST_RECIPIENTS})`)}</span><input dir="ltr" className={input} value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="person@example.com, another@example.com" /></label>
        {testError && <p role="alert" className="text-sm text-red-600">{testError}</p>}
        {testOk && <p role="status" className="text-sm text-emerald-600">{t('تم إضافة الرسالة الاختبارية لقائمة الإرسال.', 'Test message queued for delivery.')}</p>}
        <div className="flex gap-2"><button type="button" className={primary} disabled={testBusy} onClick={() => void sendTest()}><Check size={16} />{testBusy ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال', 'Send')}</button><button type="button" className={button} onClick={() => setTestOpen(false)}>{t('إغلاق', 'Close')}</button></div>
      </div>}
    </div>
  </TemplateDialog>;
}

function FixedAttachmentForm({ isAr, busy, onCancel, onSubmit }: { isAr: boolean; busy: boolean; onCancel: () => void; onSubmit: (file: File, title: string) => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  return <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
    <input className={input} placeholder={t('عنوان المرفق', 'Attachment title')} value={title} onChange={event => setTitle(event.target.value)} />
    <input type="file" onChange={event => setFile(event.target.files?.[0] || null)} />
    <div className="flex gap-2"><button type="button" className={primary} disabled={busy || !file || !title.trim()} onClick={() => file && onSubmit(file, title)}>{t('إضافة', 'Add')}</button><button type="button" className={button} onClick={onCancel}>{t('إلغاء', 'Cancel')}</button></div>
  </div>;
}

function CertificateAttachmentForm({ isAr, busy, options, onCancel, onSubmit }: { isAr: boolean; busy: boolean; options: { id: string; nameAr: string }[]; onCancel: () => void; onSubmit: (certificateTemplateId: string, title: string) => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [title, setTitle] = useState('');
  const [certId, setCertId] = useState('');
  return <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
    <input className={input} placeholder={t('عنوان المرفق', 'Attachment title')} value={title} onChange={event => setTitle(event.target.value)} />
    <select className={input} value={certId} onChange={event => setCertId(event.target.value)}><option value="">{t('اختر قالب شهادة معتمد', 'Choose an approved certificate template')}</option>{options.map(option => <option key={option.id} value={option.id} dir="rtl">{option.nameAr}</option>)}</select>
    <p className="text-xs text-[var(--color-text-muted)]">{t('تُولَّد نسخة اختبارية بقيم مؤقتة عند الإرسال الاختباري.', 'A test copy with placeholder values is generated at test-send time.')}</p>
    <div className="flex gap-2"><button type="button" className={primary} disabled={busy || !certId || !title.trim()} onClick={() => onSubmit(certId, title)}>{t('إضافة', 'Add')}</button><button type="button" className={button} onClick={onCancel}>{t('إلغاء', 'Cancel')}</button></div>
  </div>;
}
