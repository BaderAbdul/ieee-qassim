'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload, Check, ShieldCheck } from 'lucide-react';
import { apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { arabicTemplateName, fieldGroups, newField, sources, testSources, type CertificateTemplate, type Source, type TemplateDefinition, type TemplateField } from '@/lib/certificateTemplates';
import TemplateDialog from './TemplateDialog';
import CertificateFieldPreview from './CertificateFieldPreview';
import CertificateAppearanceControls from './CertificateAppearanceControls';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)]`;

export default function CertificateTemplateEditor({ initial, isAr, canReview, canEdit, onClose, onSaved }: {
  initial?: CertificateTemplate; isAr: boolean; canReview: boolean; canEdit: boolean; onClose: () => void; onSaved: () => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [step, setStep] = useState(initial ? 3 : 0);
  const [nameAr, setName] = useState(initial?.nameAr || '');
  const [definition, setDefinition] = useState<TemplateDefinition>(initial?.definition || { background: '', width: 0, height: 0, fields: [] });
  const [selected, setSelected] = useState(initial?.definition.fields[0]?.id || '');
  const [values, setValues] = useState<Record<string, string>>({ 'student.name': 'Ahmed Mohammed Abdullah', 'student.gender': 'male', 'event.name': 'Innovation Workshop', 'event.date': '23 Nov, 2026', 'partner.name': 'Example Partner', 'event.vtoolsUUID': '123456', 'event.speakers': 'Dr. Sara Ali, Eng. Omar Khaled', 'event.speaker': 'Dr. Sara Ali', 'event.speakers.ar': 'د. سارة علي، م. عمر خالد', 'event.speaker.ar': 'د. سارة علي', 'event.interviewer': 'Eng. Ibrahim Al-Muhaisen', 'event.interviewer.ar': 'م. إبراهيم المحيسن', 'event.organizers': 'Mona Alotaibi, Khaled Aldosari', 'event.organizer': 'Mona Alotaibi', 'event.organizers.ar': 'منى العتيبي، خالد الدوسري', 'event.organizer.ar': 'منى العتيبي', 'certificate.UUID': '00000000-0000-4000-8000-000000000002' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const stage = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const uploading = useRef(0);
  const active = definition.fields.find(field => field.id === selected) || definition.fields[0];
  const usedSources = testSources(definition.fields);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  const changed = () => { setDirty(true); setPdfUrl(''); setError(''); };
  const patchField = (id: string, patch: Partial<TemplateField>) => {
    changed(); setDefinition(previous => ({ ...previous, fields: previous.fields.map(field => field.id === id ? { ...field, ...patch } : field) }));
  };
  const add = (source: Source) => {
    if (definition.fields.length >= 30) return;
    const field = newField(source); changed(); setDefinition(previous => ({ ...previous, fields: [...previous.fields, field] })); setSelected(field.id);
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const request = ++uploading.current;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error(t('اختر PNG أو JPG أو WebP بحجم أقل من ٣ ميجابايت.', 'Choose PNG, JPG or WebP under 3 MB.'));
      const background = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const image = new Image(); image.src = background; await image.decode();
      if (image.width < 100 || image.height < 100 || image.width * image.height > 20_000_000) throw new Error(t('الحد الأدنى ١٠٠ بكسل لكل ضلع والحد الأقصى ٢٠ ميجابكسل.', 'Minimum 100 pixels per side; maximum 20 megapixels.'));
      if (request !== uploading.current) return;
      changed(); setDefinition(previous => ({ ...previous, background, width: image.width, height: image.height }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر قراءة الملف', 'Unable to read file')); }
  };
  const validateStage = () => {
    if (!arabicTemplateName(nameAr) || !definition.background) { setError(t('أدخل اسمًا بالعربية فقط وارفع الشهادة الفارغة.', 'Enter an Arabic-only name and upload the blank certificate.')); return false; }
    if (step > 0 && !definition.fields.length) { setError(t('أضف متغيرًا واحدًا على الأقل.', 'Add at least one variable.')); return false; }
    setError(''); return true;
  };
  const preview = async () => {
    if (!validateStage()) return;
    setBusy(true);
    try {
      const result = await apiSend<{ pdf: string }>('POST', '/api/admin/templates/preview', { nameAr, definition, values: Object.fromEntries(usedSources.map(source => [source, values[source]])) });
      const bytes = Uint8Array.from(atob(result.pdf), character => character.charCodeAt(0));
      setPdfUrl(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Preview failed', 'error'); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!validateStage()) return;
    setBusy(true);
    try {
      const result = await apiSend<{ status?: string }>(initial ? 'PUT' : 'POST', `/api/admin/templates${initial ? `/${initial.id}` : ''}`, { nameAr, definition, revision: initial?.revision });
      showToast(result.status === 'approved' ? t('تم الحفظ والاعتماد للاستخدام العام.', 'Saved and approved for use.') : t('تم الحفظ كمسودة بانتظار الاعتماد.', 'Saved as a draft awaiting approval.'), 'success');
      onSaved();
    }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Save failed', 'error'); } finally { setBusy(false); }
  };
  const approve = async () => {
    setBusy(true);
    try { await apiSend('POST', `/api/admin/templates/${initial!.id}/approve`, { revision: initial!.revision }); showToast(t('تم الاعتماد.', 'Approved.'), 'success'); onSaved(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Approval failed', 'error'); } finally { setBusy(false); }
  };
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !canEdit || busy || !stage.current) return;
    const rect = stage.current.getBoundingClientRect();
    patchField(dragging.current, { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) });
  };
  const close = () => { if (!busy && (!dirty || window.confirm(t('إغلاق المحرر وفقدان التغييرات غير المحفوظة؟', 'Close and discard unsaved changes?')))) onClose(); };
  return <TemplateDialog title={t('محرر قالب الشهادة', 'Certificate template studio')} onClose={close}>
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6">
      <nav aria-label={t('مراحل إنشاء القالب', 'Template creation stages')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[t('الشهادة الفارغة', 'Blank certificate'), t('المتغيرات والشروط', 'Variables & logic'), t('تحديد المواضع', 'Placement'), t('اختبار ومراجعة', 'Test & review')].map((label, index) =>
          <button key={label} disabled={busy || index > step + 1} aria-current={step === index ? 'step' : undefined} onClick={() => { if (index < step || validateStage()) setStep(index); }} className={`${button} ${step === index ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}><span>{index + 1}.</span>{label}</button>)}
      </nav>
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">{t('يُحفظ القالب كمسودة قابلة للاختبار. يلزم اعتماد الفريق التقني أو حامل شارة Technician قبل الاستخدام العام. أي تعديل يلغي الاعتماد السابق.', 'Templates save as testable drafts. Technical-team or Technician approval is required for global use. Editing requires a fresh approval.')}</div>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}
      <fieldset disabled={busy || !canEdit} className={step === 0 ? 'space-y-5' : 'hidden'}>
        <label className="block space-y-2"><span>{t('اسم القالب (بالعربية فقط)', 'Template name (Arabic only)')}</span><input dir="rtl" maxLength={120} className={input} value={nameAr} onChange={event => { changed(); setName(event.target.value); }} placeholder="شهادة حضور ورشة عمل" /></label>
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-10 text-center"><Upload size={30} /><span className="font-bold">{t('رفع الشهادة الفارغة', 'Upload blank certificate')}</span><span className="text-sm text-[var(--color-text-muted)]">PNG / JPG / WebP · {t('حتى ٣ ميجابايت', 'up to 3 MB')}</span><input aria-label={t('ملف الشهادة الفارغة', 'Blank certificate file')} type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void upload(event.target.files?.[0])} /></label>
        {definition.background && <img src={definition.background} alt={t('الشهادة الفارغة', 'Blank certificate')} className="mx-auto max-h-72 rounded-xl border" />}
      </fieldset>
      {step === 1 && <fieldset disabled={busy || !canEdit} className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">{t('أضف المتغيرات أو عبارات بشروط. أول شرط مطابق يحدد النص، وإلا يُستخدم النص البديل.', 'Add variables or conditional text. The first matching rule wins; otherwise the fallback appears.')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fieldGroups.map(group => <section key={group.id} className="rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
          <h3 className="font-bold">{t(group.ar, group.en)}</h3>
          <div className="flex flex-wrap gap-2">{group.fields.map(item => <button type="button" key={item.source} className={button} onClick={() => add(item.source)} disabled={definition.fields.length >= 30}><Plus size={16} />{t(item.ar, item.en)}</button>)}</div>
        </section>)}</div>
        {definition.fields.map(field => <section key={field.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <div className="flex gap-3"><input aria-label={t('اسم المتغير', 'Variable label')} className={input} value={field.label} maxLength={80} onChange={event => patchField(field.id, { label: event.target.value })} /><button type="button" className={button} aria-label={t('حذف المتغير', 'Remove variable')} onClick={() => { changed(); setDefinition(previous => ({ ...previous, fields: previous.fields.filter(item => item.id !== field.id) })); }}><Trash2 size={16} /></button></div>
          <p className="text-xs text-[var(--color-text-muted)]" dir="ltr">{field.source}</p>
          {field.source === 'literal' && <input aria-label={t('النص الثابت', 'Static text')} className={input} value={field.value} maxLength={300} onChange={event => patchField(field.id, { value: event.target.value })} />}
          {field.source === 'conditional' && <div className="space-y-3">
            <label className="block space-y-1"><span>{t('إذا كانت قيمة', 'When the value of')}</span><select className={input} value={field.conditionSource} onChange={event => patchField(field.id, { conditionSource: event.target.value as Source })}>{field.conditionSource === 'event.title' && <option value="event.title">event.name (event.title)</option>}{sources.map(source => <option key={source}>{source}</option>)}</select></label>
            {field.rules?.map((rule, index) => <div key={index} className="flex flex-wrap items-center gap-2"><span>{t('تساوي', 'equals')}</span><input aria-label={`${t('قيمة الشرط', 'Condition value')} ${index + 1}`} className={`${input} flex-1`} maxLength={128} value={rule.equals} onChange={event => patchField(field.id, { rules: field.rules!.map((item, i) => i === index ? { ...item, equals: event.target.value } : item) })} /><span>{t('اعرض', 'show')}</span><input aria-label={`${t('نص النتيجة', 'Result text')} ${index + 1}`} className={`${input} flex-1`} maxLength={300} value={rule.text} onChange={event => patchField(field.id, { rules: field.rules!.map((item, i) => i === index ? { ...item, text: event.target.value } : item) })} /><button type="button" disabled={field.rules!.length === 1} aria-label={t('حذف الشرط', 'Remove condition')} onClick={() => patchField(field.id, { rules: field.rules!.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>)}
            <button type="button" className={button} disabled={field.rules!.length >= 10} onClick={() => patchField(field.id, { rules: [...field.rules!, { equals: '', text: '' }] })}><Plus size={16} />{t('إضافة شرط', 'Add condition')}</button>
            <label className="block space-y-1"><span>{t('النص البديل إذا لم يتطابق أي شرط', 'Fallback when no condition matches')}</span><input className={input} value={field.fallback} maxLength={300} onChange={event => patchField(field.id, { fallback: event.target.value })} /></label>
          </div>}
        </section>)}
      </fieldset>}
      {step >= 2 && <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          {step === 2 ? <fieldset disabled={busy || !canEdit} className="space-y-4">
            <label className="block space-y-2"><span>{t('المتغير المحدد', 'Selected variable')}</span><select className={input} value={active?.id || ''} onChange={event => setSelected(event.target.value)}>{definition.fields.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></label>
            <p className="text-xs text-[var(--color-text-muted)]">{t('اسحب النص أو أدخل الإحداثيات كنسبة مئوية من أعلى اليسار. يمكنك توسيط الاسم أو وضعه بحرية.', 'Drag text or enter percentage coordinates from the top left. Center the name or position it freely.')}</p>
            {active && <>
              {(['x', 'y', ...(active.source === 'certificate.QR' ? ['qrSize' as const] : ['fontSize' as const])] as const).map(key => {
                const min = key === 'qrSize' ? 24 : key === 'fontSize' ? 6 : 0;
                const max = key === 'qrSize' ? 200 : 100;
                return <label key={key} className="block space-y-1"><span>{key === 'x' ? t('الموضع الأفقي %', 'Horizontal position %') : key === 'y' ? t('الموضع الرأسي %', 'Vertical position %') : key === 'qrSize' ? t('حجم QR (نقطة)', 'QR size (points)') : t('حجم الخط (نقطة)', 'Font size (points)')}</span><input type="number" min={min} max={max} step={key === 'x' || key === 'y' ? 0.1 : 1} className={input} value={Math.round((active[key] ?? 80) * 10) / 10} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= min && value <= max) patchField(active.id, { [key]: value }); }} /></label>;
              })}
              <label className="block space-y-1"><span>{t('الارتكاز واتجاه التوسع', 'Anchor and text growth')}</span><select className={input} value={active.align} onChange={event => patchField(active.id, { align: event.target.value as TemplateField['align'] })}><option value="left">{t('يسار ثابت — يتوسع يمينًا', 'Fixed left edge — grow right')}</option><option value="center">{t('وسط ثابت — يتوسع للجانبين', 'Fixed center — grow both ways')}</option><option value="right">{t('يمين ثابت — يتوسع يسارًا', 'Fixed right edge — grow left')}</option></select></label>
              <button type="button" className={button} onClick={() => patchField(active.id, { x: 50, align: 'center' })}>{t('توسيط في الشهادة', 'Center on certificate')}</button>
              <CertificateAppearanceControls field={active} isAr={isAr} onChange={patch => patchField(active.id, patch)} />
              {active.source !== 'certificate.QR' && <><label className="flex items-center justify-between gap-2"><span>{t('لون النص', 'Text color')}</span><input type="color" value={active.color} onChange={event => patchField(active.id, { color: event.target.value })} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={active.bold} onChange={event => patchField(active.id, { bold: event.target.checked })} />{t('خط عريض', 'Bold')}</label></>}
            </>}
          </fieldset> : <div className="space-y-3"><h3 className="font-bold">{t('بيانات التجربة', 'Test data')}</h3><p className="text-xs text-[var(--color-text-muted)]">{t('هذه قيم تجريبية للمتغيرات المستخدمة فقط. عند الإصدار تُملأ تلقائيًا من الفعالية والمشارك، ويستخدم اسم المشارك بالإنجليزية.', 'Only variables used in this template are shown. These are test values; issuance fills them from the event and participant automatically, using the participant’s English name.')}</p>{usedSources.map(source => <label key={source} className="block space-y-1 text-xs"><span dir="ltr">{source}</span>{source === 'student.gender' ? <select disabled={busy} className={input} value={values[source]} onChange={event => { setPdfUrl(''); setValues(previous => ({ ...previous, [source]: event.target.value })); }}><option value="male">{t('ذكر', 'Male')}</option><option value="female">{t('أنثى', 'Female')}</option><option value="">{t('غير محدد (اختبار النص البديل)', 'Unspecified (test fallback)')}</option></select> : <input disabled={busy} className={input} value={values[source]} maxLength={300} onChange={event => { setPdfUrl(''); setValues(previous => ({ ...previous, [source]: event.target.value })); }} />}</label>)}
            <button type="button" className={primary} disabled={busy} onClick={() => void preview()}>{t('إنشاء نسخة PDF تجريبية', 'Generate test PDF')}</button>
            {pdfUrl && <a href={pdfUrl} download="certificate-test.pdf" className={button}><Download size={16} />{t('تنزيل الاختبار', 'Download test')}</a>}
          </div>}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white" dir="ltr">
            <svg ref={stage} viewBox={`0 0 842 ${842 * definition.height / (definition.width || 1)}`} className={`block w-full ${step === 2 ? 'touch-none' : ''}`} role="img" aria-label={t('معاينة مواضع المتغيرات', 'Variable placement preview')}
              onPointerMove={move} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
              <image href={definition.background} width="100%" height="100%" preserveAspectRatio="none" />
              {definition.fields.map(field => <g key={field.id} style={{ cursor: step === 2 && canEdit ? 'move' : 'default' }} onPointerDown={event => { if (step !== 2 || !canEdit || busy) return; setSelected(field.id); dragging.current = field.id; stage.current?.setPointerCapture(event.pointerId); }}>
                <CertificateFieldPreview field={field} values={values} height={842 * definition.height / (definition.width || 1)} selected={step === 2 && field.id === active?.id} editing={step === 2} />
              </g>)}
            </svg>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{t('المعاينة لتحديد المواضع. ملف PDF التجريبي هو المرجع النهائي للخطوط والمحاذاة. التجربة لا تصدر شهادة حقيقية.', 'Use the canvas for placement. The test PDF is the final reference for fonts and alignment. Tests do not issue real certificates.')}</p>
          {pdfUrl && <iframe title={t('نسخة PDF التجريبية', 'Test PDF')} src={pdfUrl} className="h-[420px] w-full rounded-xl border" />}
        </div>
      </div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
        <button type="button" className={button} disabled={busy || step === 0} onClick={() => setStep(step - 1)}>{t('السابق', 'Back')}</button>
        <div className="flex flex-wrap gap-2">
          {step < 3 ? <button type="button" className={primary} disabled={busy} onClick={() => { if (validateStage()) { if (step === 1 && !selected) setSelected(definition.fields[0]?.id || ''); setStep(step + 1); } }}>{t('التالي', 'Continue')}</button> : <>
            {canEdit && <button type="button" className={primary} disabled={busy} onClick={() => void save()}><Check size={16} />{busy ? t('جارٍ التنفيذ…', 'Working…') : canReview ? t('حفظ', 'Save') : t('حفظ كمسودة للمراجعة', 'Submit draft for review')}</button>}
            {canReview && initial?.status === 'draft' && <button type="button" className={button} disabled={busy || dirty || !pdfUrl} title={t('اختبر النسخة المحفوظة قبل اعتمادها', 'Test the saved revision before approval')} onClick={() => void approve()}><ShieldCheck size={16} />{t('اعتماد للاستخدام العام', 'Approve for global use')}</button>}
            {canReview && initial?.status === 'draft' && (dirty || !pdfUrl) && <span className="basis-full text-xs text-[var(--color-text-muted)]">{dirty ? t('احفظ التعديلات أولًا ثم اختبر النسخة المحفوظة.', 'Save your changes first, then test the saved revision.') : t('لتفعيل الاعتماد: أنشئ نسخة PDF تجريبية من الخطوة السابقة.', 'To enable approval: generate a test PDF in the previous step.')}</span>}
          </>}
        </div>
      </footer>
    </div>
  </TemplateDialog>;
}
