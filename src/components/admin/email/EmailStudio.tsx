'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, FileUp, Loader2, Monitor, Paperclip, Replace, Save, Smartphone, Trash2, Undo2, Wand2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiGet, apiSend } from '@/lib/backend';
import { EMAIL_VARIABLE_GROUPS, MAX_TEMPLATE_ATTACHMENTS, insertAtCursor, variableToken } from '@/lib/emailTemplates';
import {
  type Candidate, type StudioSamples, countOccurrences, detectCandidates, escapeHtml, fileToBase64, highlightVariables,
  addGreeting, replaceLiteral, scanHardcoded, unknownVariables, usedVariables,
} from '@/lib/emailStudio';

interface StudioApi { getHtml: () => string; getSubject: () => string; getSamples: () => StudioSamples }
interface AttachmentDraft { key: string; kind: 'certificate' | 'fixed'; title: string; certificateTemplateId?: string; file?: File }
interface Snapshot { html: string; subject: string }

const field = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const small = 'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${btn} bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent`;
const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/70 backdrop-blur-md shadow-sm';

const VARIABLE_OPTIONS = EMAIL_VARIABLE_GROUPS.flatMap(group => group.variables.map(variable => ({ ...variable, group: group })));

function VariableSelect({ value, onChange, isAr }: { value: string; onChange: (next: string) => void; isAr: boolean }) {
  return (
    <select className={small} value={value} onChange={event => onChange(event.target.value)} aria-label={isAr ? 'المتغير' : 'Variable'}>
      {EMAIL_VARIABLE_GROUPS.map(group => (
        <optgroup key={group.id} label={isAr ? group.ar : group.en}>
          {group.variables.map(variable => <option key={variable.source} value={variable.source}>{isAr ? variable.ar : variable.en} — {variable.source}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Guided template creation: (1) design the email with the IEEE QU builder, (2) swap its hard-written
 * sample data for platform variables, (3) say whether anything is attached, (4) name it, set the
 * subject, and save. Saved by a super admin / Technician = approved immediately; anyone else = draft for review.
 */
export default function EmailStudio() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { userData } = useAuth();
  const { showToast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const canApprove = !!(userData?.isSuperAdmin || userData?.role === 'super_admin' || userData?.canManageEmail);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [samples, setSamples] = useState<StudioSamples | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [applied, setApplied] = useState<{ literal: string; variable: string }[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [manualFind, setManualFind] = useState('');
  const [manualVar, setManualVar] = useState('student.name');
  const [previewMobile, setPreviewMobile] = useState(false);
  const [greetingVar, setGreetingVar] = useState<'student.name' | 'student.firstName'>('student.name');

  const [wantsAttachments, setWantsAttachments] = useState<boolean | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [certOptions, setCertOptions] = useState<{ id: string; nameAr: string }[]>([]);
  const [certChoice, setCertChoice] = useState('');
  const [certTitle, setCertTitle] = useState('');
  const [fileTitle, setFileTitle] = useState('');

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ id: string; status: 'draft' | 'approved'; failed: string[] } | null>(null);

  const candidates: Candidate[] = useMemo(() => (samples ? detectCandidates(html, samples) : []), [html, samples]);
  const leftovers = useMemo(() => scanHardcoded(html), [html]);
  const unknown = useMemo(() => unknownVariables(html, subject), [html, subject]);
  const used = useMemo(() => usedVariables(html, subject), [html, subject]);
  const manualCount = manualFind ? Math.max(countOccurrences(html, escapeHtml(manualFind)), countOccurrences(html, manualFind)) : 0;

  useEffect(() => {
    if (wantsAttachments && certOptions.length === 0) {
      void apiGet<{ templates: { id: string; nameAr: string }[] }>('/api/admin/templates', { scope: 'approved' })
        .then(response => { setCertOptions(response.templates); if (response.templates[0]) { setCertChoice(response.templates[0].id); setCertTitle(response.templates[0].nameAr); } })
        .catch(() => showToast(t('تعذر تحميل قوالب الشهادات.', 'Could not load certificate templates.'), 'error'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsAttachments]);

  const fromDesign = () => {
    const api = (iframeRef.current?.contentWindow as (Window & { studioApi?: StudioApi }) | null)?.studioApi;
    if (!api) { showToast(t('لم يكتمل تحميل أداة التصميم بعد.', 'The design tool has not finished loading.'), 'error'); return; }
    if (history.length && !confirm(t('المتابعة من التصميم ستعيد توليد الكود وتلغي الاستبدالات التي أجريتها. هل تريد المتابعة؟', 'Continuing from the design regenerates the code and discards your variable replacements. Continue?'))) return;
    setHtml(api.getHtml()); setSamples(api.getSamples()); setSubject(api.getSubject());
    setHistory([]); setApplied([]); setChoices({});
    setStep(2);
  };

  const snapshot = () => setHistory(list => [...list, { html, subject }]);

  const apply = (literal: string, variable: string) => {
    const inHtml = replaceLiteral(html, literal, variable);
    const inSubject = replaceLiteral(subject, literal, variable);
    if (!inHtml.replaced && !inSubject.replaced) { showToast(t('لم يوجد هذا النص في الرسالة.', 'That text is not in the message.'), 'error'); return false; }
    snapshot();
    setHtml(inHtml.html); setSubject(inSubject.html);
    setApplied(list => [...list, { literal, variable }]);
    return true;
  };

  const applyAll = () => {
    let nextHtml = html; let nextSubject = subject; const done: { literal: string; variable: string }[] = [];
    for (const candidate of candidates) {
      const variable = choices[candidate.id] ?? candidate.variable;
      const a = replaceLiteral(nextHtml, candidate.literal, variable); const b = replaceLiteral(nextSubject, candidate.literal, variable);
      if (a.replaced || b.replaced) { nextHtml = a.html; nextSubject = b.html; done.push({ literal: candidate.literal, variable }); }
    }
    if (!done.length) return;
    snapshot(); setHtml(nextHtml); setSubject(nextSubject); setApplied(list => [...list, ...done]);
    showToast(t(`تم استبدال ${done.length} عناصر بمتغيرات.`, `Replaced ${done.length} items with variables.`), 'success');
  };

  const insertGreeting = () => {
    const result = addGreeting(html, greetingVar);
    if (!result.added) { showToast(t('تعذر العثور على نص الرسالة الأساسي لإضافة التحية.', 'Could not find the main message to add the greeting to.'), 'error'); return; }
    snapshot(); setHtml(result.html);
    setApplied(list => [...list, { literal: 'أهلًا …', variable: greetingVar }]);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHtml(last.html); setSubject(last.subject); setHistory(list => list.slice(0, -1)); setApplied(list => list.slice(0, -1));
  };

  const addCertificate = () => {
    if (!certChoice) return;
    if (attachments.length >= MAX_TEMPLATE_ATTACHMENTS) { showToast(t('وصلت إلى الحد الأقصى للمرفقات.', 'Attachment limit reached.'), 'error'); return; }
    setAttachments(list => [...list, { key: crypto.randomUUID(), kind: 'certificate', certificateTemplateId: certChoice, title: certTitle.trim() || certOptions.find(item => item.id === certChoice)?.nameAr || 'certificate' }]);
  };
  const addFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast(t('الملف أكبر من ١٠ ميجابايت.', 'File exceeds 10 MB.'), 'error'); return; }
    if (attachments.length >= MAX_TEMPLATE_ATTACHMENTS) { showToast(t('وصلت إلى الحد الأقصى للمرفقات.', 'Attachment limit reached.'), 'error'); return; }
    setAttachments(list => [...list, { key: crypto.randomUUID(), kind: 'fixed', file, title: fileTitle.trim() || file.name }]);
    setFileTitle('');
  };

  const save = async () => {
    if (!name.trim()) { showToast(t('اكتب اسم القالب.', 'Enter a template name.'), 'error'); return; }
    if (!subject.trim()) { showToast(t('اكتب عنوان الرسالة.', 'Enter the email subject.'), 'error'); return; }
    if (unknown.length) { showToast(t(`متغيرات غير معروفة: ${unknown.join('، ')}`, `Unknown variables: ${unknown.join(', ')}`), 'error'); return; }
    setSaving(true);
    try {
      const created = await apiSend<{ id: string; revision: number; status: 'draft' | 'approved' }>('POST', '/api/admin/mail/templates', {
        name: name.trim(), subject: subject.trim(), html, allowAttachments: attachments.length > 0, boilerplateId: null,
      });
      const failed: string[] = [];
      for (const item of attachments) {
        try {
          await apiSend('POST', `/api/admin/mail/templates/${created.id}/attachments`, item.kind === 'certificate'
            ? { kind: 'certificate', title: item.title, certificateTemplateId: item.certificateTemplateId }
            : { kind: 'fixed', title: item.title, filename: item.file!.name, contentType: item.file!.type || 'application/octet-stream', contentBase64: await fileToBase64(item.file!) });
        } catch { failed.push(item.title); }
      }
      setResult({ id: created.id, status: created.status, failed });
      showToast(created.status === 'approved' ? t('تم حفظ القالب واعتماده.', 'Template saved and approved.') : t('تم حفظ القالب كمسودة بانتظار الاعتماد.', 'Template saved as a draft awaiting approval.'), 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : t('تعذر حفظ القالب.', 'Could not save the template.'), 'error');
    } finally { setSaving(false); }
  };

  const steps = [t('التصميم', 'Design'), t('المتغيرات', 'Variables'), t('المرفقات', 'Attachments'), t('البيانات والحفظ', 'Details & save')];

  if (result) {
    return (
      <div className={`${panel} mx-auto max-w-xl space-y-4 p-8 text-center`}>
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
        <h1 className="font-cairo text-2xl font-black">{result.status === 'approved' ? t('تم حفظ القالب واعتماده', 'Template saved and approved') : t('تم حفظ القالب كمسودة', 'Template saved as a draft')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {result.status === 'approved' ? t('أصبح متاحًا للاستخدام في الفعاليات والرسائل فورًا.', 'It is immediately available for events and mail.') : t('سيظهر للاستخدام بعد اعتماده من مدير عام أو صاحب وسام تقني.', 'It becomes usable once a super admin or Technician approves it.')}
        </p>
        {result.failed.length > 0 && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{t('تعذر رفع هذه المرفقات، أضفها من المحرر:', 'These attachments could not be added; add them from the editor:')} {result.failed.join('، ')}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/admin/mail/templates/${result.id}`} className={primary}>{t('فتح القالب في المحرر', 'Open in the editor')}</Link>
          <Link href="/admin/templates" className={btn}>{t('كل القوالب', 'All templates')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="space-y-3">
        <h1 className="font-cairo text-2xl font-black">{t('استوديو قوالب البريد', 'Email template studio')}</h1>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3 | 4;
            const state = number === step ? 'active' : number < step ? 'done' : 'todo';
            return (
              <li key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${state === 'active' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : state === 'done' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10">{state === 'done' ? <Check size={12} /> : number}</span>{label}
              </li>
            );
          })}
        </ol>
      </header>

      {/* Step 1 stays mounted (hidden) so going back never loses the design. */}
      <section className={step === 1 ? 'space-y-3' : 'hidden'} aria-hidden={step !== 1}>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('صمّم الرسالة بأداة IEEE QU، ثم اضغط «التالي» للحصول على الكود واستبدال البيانات المكتوبة يدويًا بمتغيرات.', 'Design the message with the IEEE QU builder, then press Next to take its code and swap the hard-written data for variables.')}</p>
        <iframe ref={iframeRef} title="IEEE QU email builder" src="/email-studio/builder.html?embedded=1"
                className="h-[calc(100dvh-17rem)] min-h-[560px] w-full rounded-2xl border border-[var(--color-border)] bg-white" />
        <div className="flex justify-end"><button type="button" onClick={fromDesign} className={primary}>{t('التالي: استبدال البيانات بمتغيرات', 'Next: replace data with variables')}<ArrowLeft size={16} className="rtl:hidden" /><ArrowRight size={16} className="ltr:hidden" /></button></div>
      </section>

      {step === 2 && (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className={`${panel} space-y-3 p-4`}>
              <h2 className="flex items-center gap-2 font-bold"><Wand2 size={16} />{t('بيانات مكتوبة يدويًا تم اكتشافها', 'Hard-written data found')}</h2>
              {candidates.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">{t('لا توجد بيانات تجريبية متبقية من الأداة.', 'None of the builder’s sample data is left.')}</p> : (
                <ul className="space-y-2">
                  {candidates.map(candidate => (
                    <li key={candidate.id} className="space-y-1.5 rounded-xl bg-[var(--color-surface-2)] p-3">
                      <p className="text-xs font-bold">{candidate.label} <span className="font-normal text-[var(--color-text-muted)]">({candidate.count}×)</span></p>
                      <p dir="auto" className="truncate rounded-lg bg-[var(--color-surface)] px-2 py-1 text-xs">{candidate.literal}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <VariableSelect value={choices[candidate.id] ?? candidate.variable} onChange={next => setChoices(map => ({ ...map, [candidate.id]: next }))} isAr={isAr} />
                        <button type="button" className={`${btn} px-3 py-1.5 text-xs`} onClick={() => apply(candidate.literal, choices[candidate.id] ?? candidate.variable)}>{t('استبدال', 'Replace')}</button>
                      </div>
                    </li>
                  ))}
                  <li><button type="button" className={`${primary} w-full`} onClick={applyAll}><Replace size={15} />{t('استبدال الكل', 'Replace all')}</button></li>
                </ul>
              )}
              {applied.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 text-[11px]">
                  {applied.map((item, index) => <li key={index} className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">✓ {item.literal.slice(0, 18)} → {item.variable}</li>)}
                </ul>
              )}
              <button type="button" className={`${btn} w-full`} disabled={history.length === 0} onClick={undo}><Undo2 size={15} />{t('تراجع عن آخر استبدال', 'Undo last replacement')}</button>
            </div>

            <div className={`${panel} space-y-3 p-4`}>
              <h2 className="font-bold">{t('اسم المستلم', 'Recipient name')}</h2>
              <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
                {t('الأداة لا تكتب اسمًا للمستلم إلا إذا كان نص الرسالة التلقائي يحتويه، لذلك قد لا يوجد اسم لاستبداله. أضف تحية تستخدم متغير اسم الطالب ليصل كل شخص باسمه.', 'The builder only prints a recipient name when its automatic text contains one, so there may be none to replace. Add a greeting that uses the student-name variable so each person is greeted by name.')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select className={small} value={greetingVar} onChange={event => setGreetingVar(event.target.value as 'student.name' | 'student.firstName')}>
                  <option value="student.name">{t('الاسم الكامل', 'Full name')}</option>
                  <option value="student.firstName">{t('الاسم الأول', 'First name')}</option>
                </select>
                <button type="button" className={`${btn} px-3 py-1.5 text-xs`} disabled={used.includes('student.name') && used.includes(greetingVar)} onClick={insertGreeting}>{t('إضافة تحية باسم الطالب', 'Add greeting with the student name')}</button>
              </div>
            </div>

            <div className={`${panel} space-y-3 p-4`}>
              <h2 className="font-bold">{t('استبدال يدوي', 'Manual replace')}</h2>
              <input className={field} value={manualFind} onChange={event => setManualFind(event.target.value)} placeholder={t('النص المراد استبداله بالضبط…', 'Exact text to replace…')} dir="auto" />
              <div className="flex flex-wrap items-center gap-2">
                <VariableSelect value={manualVar} onChange={setManualVar} isAr={isAr} />
                <button type="button" className={`${btn} px-3 py-1.5 text-xs`} disabled={!manualFind || manualCount === 0}
                        onClick={() => { if (apply(manualFind, manualVar)) setManualFind(''); }}>{t(`استبدال (${manualCount})`, `Replace (${manualCount})`)}</button>
              </div>
              {manualFind && manualCount === 0 && <p className="text-xs text-[var(--color-text-muted)]">{t('لا يوجد تطابق.', 'No match.')}</p>}
            </div>

            {leftovers.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <h2 className="text-sm font-bold">{t('قد تكون هذه بيانات مكتوبة يدويًا', 'These may still be hard-coded')}</h2>
                <ul className="flex flex-wrap gap-2">
                  {leftovers.map(item => <li key={item.text}><button type="button" onClick={() => setManualFind(item.text)} className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">{item.label}: {item.text}</button></li>)}
                </ul>
                <p className="text-xs">{t('اضغط على أي عنصر لتجهيزه في الاستبدال اليدوي. يمكنك المتابعة إذا كانت ثابتة فعلًا.', 'Click one to load it into manual replace. Continue if it is genuinely fixed text.')}</p>
              </div>
            )}
          </div>

          <div className={`${panel} flex min-h-[520px] flex-col overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">{t('المعاينة — المتغيرات تظهر بالأصفر', 'Preview — variables show in yellow')}</p>
              <div className="flex gap-1">
                <button type="button" aria-pressed={!previewMobile} onClick={() => setPreviewMobile(false)} className={`${small} ${!previewMobile ? 'bg-[var(--color-accent)] text-white' : ''}`}><Monitor size={14} /></button>
                <button type="button" aria-pressed={previewMobile} onClick={() => setPreviewMobile(true)} className={`${small} ${previewMobile ? 'bg-[var(--color-accent)] text-white' : ''}`}><Smartphone size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-3">
              <iframe title="preview" srcDoc={highlightVariables(html)} sandbox="" className={`mx-auto h-[640px] w-full rounded-xl bg-white ${previewMobile ? 'max-w-[390px]' : 'max-w-[680px]'}`} />
            </div>
          </div>
          <div className="flex justify-between xl:col-span-2">
            <button type="button" onClick={() => setStep(1)} className={btn}>{t('رجوع للتصميم', 'Back to design')}</button>
            <button type="button" onClick={() => setStep(3)} className={primary}>{t('التالي: المرفقات', 'Next: attachments')}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={`${panel} mx-auto max-w-2xl space-y-5 p-6`}>
          <h2 className="font-cairo text-lg font-black">{t('هل ستُرفق شيئًا مع هذه الرسالة؟', 'Will you attach anything to this email?')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {([[false, t('لا، بدون مرفقات', 'No attachments')], [true, t('نعم، سأرفق', 'Yes, attach')]] as const).map(([value, label]) => (
              <button key={String(value)} type="button" aria-pressed={wantsAttachments === value} onClick={() => { setWantsAttachments(value); if (!value) setAttachments([]); }}
                      className={`rounded-2xl border-2 px-4 py-4 text-sm font-bold ${wantsAttachments === value ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}>{label}</button>
            ))}
          </div>
          {wantsAttachments && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl bg-[var(--color-surface-2)] p-4">
                <p className="flex items-center gap-2 text-sm font-bold"><Award size={15} />{t('قالب شهادة (يُنشأ لكل مستلم)', 'Certificate template (generated per recipient)')}</p>
                <select className={field} value={certChoice} onChange={event => { setCertChoice(event.target.value); setCertTitle(certOptions.find(item => item.id === event.target.value)?.nameAr ?? ''); }}>
                  {certOptions.length === 0 && <option value="">{t('لا توجد قوالب شهادات معتمدة', 'No approved certificate templates')}</option>}
                  {certOptions.map(option => <option key={option.id} value={option.id}>{option.nameAr}</option>)}
                </select>
                <input className={field} value={certTitle} onChange={event => setCertTitle(event.target.value)} placeholder={t('اسم المرفق', 'Attachment name')} />
                <button type="button" className={btn} disabled={!certChoice} onClick={addCertificate}>{t('إضافة الشهادة', 'Add certificate')}</button>
              </div>
              <div className="space-y-2 rounded-xl bg-[var(--color-surface-2)] p-4">
                <p className="flex items-center gap-2 text-sm font-bold"><FileUp size={15} />{t('ملف ثابت (يصل كما هو للجميع)', 'Fixed file (sent as-is to everyone)')}</p>
                <input className={field} value={fileTitle} onChange={event => setFileTitle(event.target.value)} placeholder={t('اسم المرفق (اختياري)', 'Attachment name (optional)')} />
                <input type="file" className="block w-full text-xs" onChange={event => { addFile(event.target.files?.[0]); event.target.value = ''; }} />
              </div>
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map(item => (
                    <li key={item.key} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm">
                      {item.kind === 'certificate' ? <Award size={16} /> : <Paperclip size={16} />}
                      <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{item.kind === 'certificate' ? t('شهادة', 'Certificate') : item.file?.name}</span>
                      <button type="button" aria-label={t('حذف', 'Remove')} onClick={() => setAttachments(list => list.filter(entry => entry.key !== item.key))} className="text-red-500"><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className={btn}>{t('رجوع', 'Back')}</button>
            <button type="button" disabled={wantsAttachments === null} onClick={() => setStep(4)} className={primary}>{t('التالي: البيانات', 'Next: details')}</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={`${panel} space-y-4 p-6`}>
            <label className="block space-y-1"><span className="text-xs font-bold">{t('اسم القالب', 'Template name')}</span>
              <input className={field} value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-xs font-bold">{t('عنوان الرسالة (Subject) — يقبل المتغيرات', 'Email subject — variables allowed')}</span>
              <input ref={subjectRef} className={field} value={subject} maxLength={200} onChange={event => setSubject(event.target.value)} dir="auto" /></label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{t('إدراج متغير:', 'Insert variable:')}</span>
              <select className={small} value="" onChange={event => { if (event.target.value) insertAtCursor(subjectRef.current, subject, setSubject, variableToken(event.target.value)); }}>
                <option value="">{t('اختر…', 'Choose…')}</option>
                {VARIABLE_OPTIONS.map(option => <option key={option.source} value={option.source}>{isAr ? option.ar : option.en} — {option.source}</option>)}
              </select>
            </div>
            {unknown.length > 0 && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{t('متغيرات غير معروفة:', 'Unknown variables:')} {unknown.join(', ')}</p>}
            <div className={`rounded-xl p-3 text-xs ${canApprove ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
              {canApprove ? t('بصفتك مديرًا عامًا أو صاحب وسام تقني سيُعتمد القالب فور حفظه.', 'As a super admin or Technician, the template is approved the moment you save it.') : t('سيُحفظ القالب كمسودة حتى يعتمده مدير عام أو صاحب وسام تقني.', 'The template is saved as a draft until a super admin or Technician approves it.')}
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(3)} className={btn}>{t('رجوع', 'Back')}</button>
              <button type="button" disabled={saving} onClick={() => void save()} className={primary}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{t('حفظ القالب', 'Save template')}</button>
            </div>
          </div>
          <div className={`${panel} space-y-3 p-6 text-sm`}>
            <h2 className="font-bold">{t('الملخص', 'Summary')}</h2>
            <p><span className="text-[var(--color-text-muted)]">{t('المتغيرات المستخدمة:', 'Variables used:')}</span> {used.length ? used.join(' · ') : t('لا يوجد', 'none')}</p>
            <p><span className="text-[var(--color-text-muted)]">{t('المرفقات:', 'Attachments:')}</span> {attachments.length ? attachments.map(item => item.title).join(' · ') : t('لا يوجد', 'none')}</p>
            {leftovers.length > 0 && <p className="text-amber-700">{t('تنبيه: ما زالت توجد بيانات تبدو مكتوبة يدويًا:', 'Heads up — possibly hard-coded data remains:')} {leftovers.map(item => item.text).join(' · ')}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
