'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, FileText, FileType2, ImagePlus, Loader2, Plus, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { API_BASE_URL, apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import type { EventReport } from '@/lib/types';
import { button, input, label, primaryButton } from './wizardTypes';

type Row = Record<string, string>;
interface Content {
  overview: string; summary: string; platform: string; howeverNote: string; preparedBy: string; reportDate: string;
  guestOpinionName: string; guestOpinionText: string;
  inPersonAttendance: number | null; remoteAttendance: number | null;
  goals: string[]; preparationNotes: string[]; announcement: string[]; howHandled: string[]; duringNotes: string[]; lessons: string[];
  components: Row[]; departmentTasks: Row[]; costs: Row[]; challengesBefore: Row[]; challengesDuring: Row[];
  deptRatings: Row[]; suggestions: Row[]; recommendations: Row[];
}
interface Workspace {
  content: Content;
  suggestedTasks: Row[];
  auto: { online: boolean; registered: number; attended: number; checkedIn: number; ratingCount: number; ratingAverage: number | null; certificates: number; gains: number; sponsors: number; choiceQuestions: number };
  photos: { id: number; caption: string }[];
}
interface FieldSpec { key: string; ar: string; en: string; long?: boolean; narrow?: boolean }

const base = (eventId: number) => `/api/admin/events/${eventId}/report-builder`;

async function authedBlob(path: string): Promise<Blob> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error('Sign in first. / سجّل دخولك أولًا.');
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || 'Request failed.');
  }
  return response.blob();
}

function Lines({ isAr, titleAr, titleEn, value, onChange, hintAr, hintEn }: {
  isAr: boolean; titleAr: string; titleEn: string; value: string[]; onChange: (next: string[]) => void; hintAr?: string; hintEn?: string;
}) {
  return (
    <label className={label}>
      <span>{isAr ? titleAr : titleEn}</span>
      <textarea className={input} rows={Math.max(3, Math.min(8, value.length + 1))} value={value.join('\n')}
                placeholder={isAr ? hintAr : hintEn} onChange={e => onChange(e.target.value.split('\n'))} />
    </label>
  );
}

function Rows({ isAr, titleAr, titleEn, fields, rows, onChange, hintAr, hintEn }: {
  isAr: boolean; titleAr: string; titleEn: string; fields: FieldSpec[]; rows: Row[]; onChange: (next: Row[]) => void; hintAr?: string; hintEn?: string;
}) {
  const empty = Object.fromEntries(fields.map(field => [field.key, ''])) as Row;
  return (
    <div className="space-y-2 rounded-2xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold">{isAr ? titleAr : titleEn}</h4>
          {(hintAr || hintEn) && <p className="text-[11px] text-[var(--color-text-muted)]">{isAr ? hintAr : hintEn}</p>}
        </div>
        <button type="button" className={button} onClick={() => onChange([...rows, { ...empty }])}><Plus size={14} />{isAr ? 'إضافة' : 'Add'}</button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-2)] p-2">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-6">
            {fields.map(field => (
              <label key={field.key} className={`${label} ${field.narrow ? 'sm:col-span-1' : field.long ? 'sm:col-span-3' : 'sm:col-span-2'}`}>
                <span className="text-[11px]">{isAr ? field.ar : field.en}</span>
                {field.long
                  ? <textarea className={input} rows={3} value={row[field.key] ?? ''} onChange={e => onChange(rows.map((r, at) => at === index ? { ...r, [field.key]: e.target.value } : r))} />
                  : <input className={input} value={row[field.key] ?? ''} onChange={e => onChange(rows.map((r, at) => at === index ? { ...r, [field.key]: e.target.value } : r))} />}
              </label>
            ))}
          </div>
          <button type="button" aria-label={isAr ? 'حذف' : 'Remove'} className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => onChange(rows.filter((_, at) => at !== index))}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-black text-[var(--color-text-primary)]">{title}</summary>
      <div className="space-y-4 border-t border-[var(--color-border)] p-4">{children}</div>
    </details>
  );
}

/**
 * Builds the event's report automatically: the platform fills in everything it knows (dates, place, guests, counts,
 * ratings, sponsors...), the organizers add what only they know, and the result downloads as Word and as PDF.
 */
export default function ReportBuilder({ isAr, eventId, onAdopted }: { isAr: boolean; eventId: number; onAdopted: (report: EventReport) => void }) {
  const { showToast } = useToast();
  const [data, setData] = useState<Workspace | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [thumbs, setThumbs] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const result = await apiGet<Workspace>(base(eventId));
      setData(result); setContent(result.content); setDirty(false); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : (isAr ? 'تعذر تحميل بيانات التقرير.' : 'Could not load the report data.')); }
  }, [eventId, isAr]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const photos = data?.photos;
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    (async () => {
      const next: Record<number, string> = {};
      for (const photo of photos ?? []) {
        try { const url = URL.createObjectURL(await authedBlob(`${base(eventId)}/photos/${photo.id}`)); created.push(url); next[photo.id] = url; } catch { /* thumbnail is optional */ }
      }
      if (active) setThumbs(next);
    })();
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [photos, eventId]);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    try { await action(); } catch (reason) { showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر إكمال الطلب.' : 'Request failed.'), 'error'); } finally { setBusy(''); }
  };
  const set = <K extends keyof Content>(key: K, value: Content[K]) => { setContent(previous => previous ? { ...previous, [key]: value } : previous); setDirty(true); };
  const save = async () => {
    if (!content) return;
    await apiSend('PUT', base(eventId), content);
    setDirty(false);
  };
  const download = (format: 'docx' | 'pdf') => run(format, async () => {
    if (dirty) await save();
    const blob = await authedBlob(`${base(eventId)}/file?format=${format}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `event-report.${format}`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
  const addPhoto = (file: File) => run('photo', async () => {
    const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
    await apiSend('POST', `${base(eventId)}/photos`, { caption: photoCaption.trim() || file.name.replace(/\.[^./\\]+$/, ''), contentBase64 });
    setPhotoCaption('');
    const refreshed = await apiGet<Workspace>(base(eventId));
    setData(previous => previous ? { ...previous, photos: refreshed.photos } : refreshed);
  });

  if (error) return <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!data || !content) return <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><Loader2 size={16} className="animate-spin" />{isAr ? 'جارٍ تحميل منشئ التقرير…' : 'Loading the report builder…'}</p>;
  const { auto } = data;
  const lines = (key: keyof Content) => (content[key] as string[]);
  const rows = (key: keyof Content) => (content[key] as Row[]);

  return (
    <div className="space-y-4 rounded-3xl border-2 border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-4">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-base font-black"><Wand2 size={18} className="text-[var(--color-accent)]" />{isAr ? 'منشئ التقرير التلقائي' : 'Automatic report builder'}</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          {isAr ? 'يملأ النظام بيانات الفعالية والحضور والتقييم تلقائيًا؛ أضف أنت ما يخصّك ثم نزّل نسخة Word وPDF جاهزة. يُعاد بناء الملف من أحدث البيانات عند كل تنزيل.' : 'The platform fills in the event, attendance and rating data; add what only you know, then download a ready Word and PDF copy. The file is rebuilt from the latest data on every download.'}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {[
          [String(auto.registered), isAr ? 'مسجّل' : 'Registered'], [String(auto.attended), isAr ? 'حضور' : 'Attended'],
          [auto.ratingAverage === null ? '—' : `${auto.ratingAverage} / 5`, isAr ? `التقييم (${auto.ratingCount})` : `Rating (${auto.ratingCount})`],
          [String(auto.certificates), isAr ? 'شهادات صادرة' : 'Certificates'],
        ].map(([value, text]) => (
          <div key={text} className="rounded-xl bg-[var(--color-surface)] p-2"><div className="text-lg font-black text-[var(--color-accent)]">{value}</div><div className="text-[11px] text-[var(--color-text-muted)]">{text}</div></div>
        ))}
      </div>
      <p className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-muted)]"><Sparkles size={13} className="mt-0.5 shrink-0" />
        {isAr ? `يُضاف تلقائيًا: البيانات الأساسية والزمان والمكان، المحاور (${auto.gains})، الضيف والمحاور والمنظمون، الرعاة (${auto.sponsors})، الحضور والتسجيل، توزيع التقييم${auto.choiceQuestions ? `، ونتائج ${auto.choiceQuestions} أسئلة اختيارية` : ''}، والأقسام المشاركة من إعدادات فرق المراحل.`
          : `Added automatically: main data, time & place, topics (${auto.gains}), guest/interviewer/organizers, sponsors (${auto.sponsors}), attendance, rating distribution${auto.choiceQuestions ? `, ${auto.choiceQuestions} choice-question results` : ''}, and the participating teams from the stage-team settings.`}
      </p>

      <Section title={isAr ? 'الملخص والبيانات العامة' : 'Summary & general'} open>
        <label className={label}><span>{isAr ? 'نظرة عامة (اتركها فارغة ليكتبها النظام)' : 'Overview (leave empty to let the platform write it)'}</span>
          <textarea className={input} rows={3} value={content.overview} onChange={e => set('overview', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'الخلاصة' : 'Conclusion'}</span>
          <textarea className={input} rows={4} value={content.summary} onChange={e => set('summary', e.target.value)} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {auto.online && <label className={label}><span>{isAr ? 'منصة البث' : 'Platform'}</span>
            <input className={input} placeholder="Google Meet" value={content.platform} onChange={e => set('platform', e.target.value)} /></label>}
          <label className={label}><span>{isAr ? 'الحضور الحضوري' : 'In-person attendance'}</span>
            <input className={input} type="number" min={0} value={content.inPersonAttendance ?? ''} onChange={e => set('inPersonAttendance', e.target.value === '' ? null : Number(e.target.value))} /></label>
          <label className={label}><span>{isAr ? 'الحضور عن بُعد' : 'Remote attendance'}</span>
            <input className={input} type="number" min={0} value={content.remoteAttendance ?? ''} onChange={e => set('remoteAttendance', e.target.value === '' ? null : Number(e.target.value))} /></label>
        </div>
        <Lines isAr={isAr} titleAr="أهداف الفعالية (سطر لكل هدف)" titleEn="Goals (one per line)" value={lines('goals')} onChange={v => set('goals', v)} />
        <Rows isAr={isAr} titleAr="مكوّنات الفعالية" titleEn="Event components" hintAr="للفعاليات متعددة الأجزاء كالبوثات والمعارض." hintEn="For multi-part events such as booths and exhibitions."
              fields={[{ key: 'title', ar: 'المكوّن', en: 'Component' }, { key: 'titleEn', ar: 'English', en: 'English' }, { key: 'description', ar: 'الوصف', en: 'Description', long: true }]}
              rows={rows('components')} onChange={v => set('components', v)} />
      </Section>

      <Section title={isAr ? '01 · قبل الفعالية' : '01 · Before the event'}>
        <Rows isAr={isAr} titleAr="مهام الأقسام في التحضير" titleEn="Teams' preparation tasks" hintAr="إن تركتها فارغة تُملأ من فرق المراحل المضبوطة في الإعدادات." hintEn="If left empty it is filled from the stage-team settings."
              fields={[{ key: 'department', ar: 'القسم', en: 'Team' }, { key: 'tasks', ar: 'المهام (سطر لكل مهمة)', en: 'Tasks (one per line)', long: true }]}
              rows={rows('departmentTasks')} onChange={v => set('departmentTasks', v)} />
        {content.departmentTasks.length === 0 && data.suggestedTasks.length > 0 && (
          <button type="button" className={button} onClick={() => set('departmentTasks', data.suggestedTasks)}><Wand2 size={14} />{isAr ? 'تعبئة المهام من الفرق المسؤولة عن المراحل' : 'Prefill from the stage teams'}</button>
        )}
        <Lines isAr={isAr} titleAr="التحضير والتنسيق مع الضيف" titleEn="Preparation & guest coordination" value={lines('preparationNotes')} onChange={v => set('preparationNotes', v)} />
        <Lines isAr={isAr} titleAr="الإعلان" titleEn="Announcement" value={lines('announcement')} onChange={v => set('announcement', v)} />
        <Rows isAr={isAr} titleAr="التكاليف" titleEn="Costs" fields={[{ key: 'item', ar: 'البند', en: 'Item' }, { key: 'details', ar: 'التفاصيل', en: 'Details' }, { key: 'amount', ar: 'المبلغ (ريال)', en: 'Amount (SAR)', narrow: true }]}
              rows={rows('costs')} onChange={v => set('costs', v)} hintAr="يُحسب الإجمالي تلقائيًا." hintEn="The total is computed automatically." />
        <Rows isAr={isAr} titleAr="التحديات قبل الفعالية" titleEn="Challenges before"
              fields={[{ key: 'challenge', ar: 'التحدي', en: 'Challenge' }, { key: 'cause', ar: 'السبب', en: 'Cause' }, { key: 'impact', ar: 'الأثر', en: 'Impact' }, { key: 'source', ar: 'المصدر', en: 'Source', narrow: true }]}
              rows={rows('challengesBefore')} onChange={v => set('challengesBefore', v)} />
        <Lines isAr={isAr} titleAr="كيف تم التعامل مع التحديات" titleEn="How the challenges were handled" value={lines('howHandled')} onChange={v => set('howHandled', v)} />
        <label className={label}><span>{isAr ? '«ومع ذلك…» — خلاصة إيجابية' : '“And yet…” — positive note'}</span>
          <textarea className={input} rows={2} value={content.howeverNote} onChange={e => set('howeverNote', e.target.value)} /></label>
      </Section>

      <Section title={isAr ? '02 · أثناء الفعالية' : '02 · During the event'}>
        <Lines isAr={isAr} titleAr="ملاحظات سير الفعالية (يضيف النظام الموعد والمكان والحضور)" titleEn="Notes on how it went (date, place and attendance are added automatically)" value={lines('duringNotes')} onChange={v => set('duringNotes', v)} />
        <div className="space-y-2 rounded-2xl border border-[var(--color-border)] p-3">
          <h4 className="text-sm font-bold">{isAr ? 'صور التوثيق' : 'Documentation photos'}</h4>
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${label} min-w-[12rem] flex-1`}><span className="text-[11px]">{isAr ? 'وصف الصورة' : 'Caption'}</span>
              <input className={input} value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} /></label>
            <label className={`${button} cursor-pointer`}>
              {busy === 'photo' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{isAr ? 'إضافة صورة' : 'Add photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy === 'photo'} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void addPhoto(file); }} />
            </label>
          </div>
          {data.photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.photos.map(photo => (
                <li key={photo.id} className="space-y-1 rounded-xl bg-[var(--color-surface-2)] p-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumbs[photo.id] ? <img src={thumbs[photo.id]} alt={photo.caption} className="h-24 w-full rounded-lg object-cover" /> : <div className="h-24 rounded-lg bg-[var(--color-border)]" />}
                  <p className="truncate text-[11px]">{photo.caption}</p>
                  <button type="button" className="text-red-500" aria-label={isAr ? 'حذف الصورة' : 'Remove photo'} onClick={() => void run('del', async () => { await apiSend('DELETE', `${base(eventId)}/photos/${photo.id}`); setData(previous => previous ? { ...previous, photos: previous.photos.filter(p => p.id !== photo.id) } : previous); })}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Rows isAr={isAr} titleAr="التحديات أثناء الفعالية" titleEn="Challenges during"
              fields={[{ key: 'challenge', ar: 'التحدي', en: 'Challenge' }, { key: 'impact', ar: 'الأثر', en: 'Impact' }, { key: 'handling', ar: 'المعالجة', en: 'Handling' }]}
              rows={rows('challengesDuring')} onChange={v => set('challengesDuring', v)} />
      </Section>

      <Section title={isAr ? '03 · بعد الفعالية' : '03 · After the event'}>
        <Rows isAr={isAr} titleAr="تقييم أداء الأقسام" titleEn="Team ratings" fields={[{ key: 'item', ar: 'البند', en: 'Item' }, { key: 'score', ar: 'التقييم (من 5)', en: 'Score (of 5)', narrow: true }]}
              rows={rows('deptRatings')} onChange={v => set('deptRatings', v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={label}><span>{isAr ? 'اسم الضيف (رأي الضيف)' : 'Guest name (guest opinion)'}</span>
            <input className={input} value={content.guestOpinionName} onChange={e => set('guestOpinionName', e.target.value)} /></label>
          <label className={`${label} sm:col-span-2`}><span>{isAr ? 'رأي الضيف' : 'Guest opinion'}</span>
            <textarea className={input} rows={3} value={content.guestOpinionText} onChange={e => set('guestOpinionText', e.target.value)} /></label>
        </div>
        <Rows isAr={isAr} titleAr="مقترحات الأقسام للفعاليات القادمة" titleEn="Teams' suggestions" fields={[{ key: 'department', ar: 'القسم', en: 'Team', narrow: true }, { key: 'text', ar: 'المقترح', en: 'Suggestion', long: true }]}
              rows={rows('suggestions')} onChange={v => set('suggestions', v)} />
        <Lines isAr={isAr} titleAr="الدروس المستفادة" titleEn="Lessons learned" value={lines('lessons')} onChange={v => set('lessons', v)} />
        <Rows isAr={isAr} titleAr="التوصيات" titleEn="Recommendations" fields={[{ key: 'text', ar: 'التوصية', en: 'Recommendation', long: true }, { key: 'reason', ar: 'المبرر', en: 'Reason', long: true }]}
              rows={rows('recommendations')} onChange={v => set('recommendations', v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}><span>{isAr ? 'معدّ التقرير' : 'Prepared by'}</span>
            <input className={input} value={content.preparedBy} onChange={e => set('preparedBy', e.target.value)} /></label>
          <label className={label}><span>{isAr ? 'تاريخ التقرير' : 'Report date'}</span>
            <input className={input} type="date" dir="ltr" value={content.reportDate} onChange={e => set('reportDate', e.target.value)} /></label>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <button type="button" disabled={!dirty || busy !== ''} className={button} onClick={() => void run('save', async () => { await save(); showToast(isAr ? 'تم حفظ بيانات التقرير.' : 'Report data saved.', 'success'); })}>
          {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{isAr ? (dirty ? 'حفظ بيانات التقرير' : 'محفوظ') : (dirty ? 'Save report data' : 'Saved')}
        </button>
        <button type="button" disabled={busy !== ''} className={primaryButton} onClick={() => void download('docx')}>
          {busy === 'docx' ? <Loader2 size={15} className="animate-spin" /> : <FileType2 size={15} />}{isAr ? 'تنزيل نسخة Word' : 'Download Word'}
        </button>
        <button type="button" disabled={busy !== ''} className={primaryButton} onClick={() => void download('pdf')}>
          {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}{isAr ? 'تنزيل نسخة PDF' : 'Download PDF'}
        </button>
        <button type="button" disabled={busy !== ''} className={button} title={isAr ? 'يحفظ نسخة PDF كتقرير الفعالية الرسمي' : 'Keeps the PDF as the official event report'}
                onClick={() => void run('adopt', async () => { if (dirty) await save(); const saved = await apiSend<EventReport>('POST', `${base(eventId)}/adopt`); onAdopted(saved); showToast(isAr ? 'اعتُمدت النسخة كتقرير للفعالية.' : 'Saved as the event report.', 'success'); })}>
          {busy === 'adopt' ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}{isAr ? 'اعتماد PDF كتقرير الفعالية' : 'Use PDF as the event report'}
        </button>
      </div>
    </div>
  );
}
