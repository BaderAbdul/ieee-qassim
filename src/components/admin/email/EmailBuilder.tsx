'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Code2, Copy, Download, Monitor, Plus, RotateCcw, Smartphone, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  ATTENDANCE, AUDIENCES, PURPOSES, TIMINGS, builderWarnings, defaultBuilderState, generateEmail, normalizeBuilderState,
  type BuilderParams, type BuilderState,
} from '@/lib/emailBuilder';

type Tab = 'main' | 'content' | 'sections' | 'links' | 'theme';
type Mode = 'desktop' | 'mobile' | 'code';
type BoolKey = { [K in keyof BuilderParams]: BuilderParams[K] extends boolean ? K : never }[keyof BuilderParams];
type TextKey = Exclude<keyof BuilderParams, BoolKey>;

const control = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none';
const ghost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]';

const TABS: { id: Tab; label: string }[] = [
  { id: 'main', label: 'الباراميترات' }, { id: 'content', label: 'المحتوى' }, { id: 'sections', label: 'الإضافات' },
  { id: 'links', label: 'الروابط' }, { id: 'theme', label: 'الهوية' },
];

/**
 * The IEEE QU email builder, built into the platform: pick the purpose and details, edit the content,
 * switch sections and buttons on or off, set the colours, and watch the real email render live.
 * The studio takes the generated HTML from here and turns its sample data into variables.
 */
export default function EmailBuilder({ state, onChange }: { state: BuilderState; onChange: (next: BuilderState) => void }) {
  const { showToast } = useToast();
  const importRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('main');
  const [mode, setMode] = useState<Mode>('desktop');
  const p = state.p;
  const html = useMemo(() => generateEmail(state), [state]);
  const warnings = builderWarnings(p);

  const set = <K extends keyof BuilderParams>(key: K, value: BuilderParams[K]) => onChange({ ...state, p: { ...p, [key]: value } });
  const setBlock = (index: number, patch: Partial<{ title: string; body: string }>) =>
    onChange({ ...state, blocks: state.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)) });

  const text = (key: TextKey, label: string, kind: 'text' | 'textarea' | 'date' | 'time' | 'url' | 'color' = 'text') => (
    <label key={key} className="block space-y-1">
      <span className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</span>
      {kind === 'textarea'
        ? <textarea className={`${control} min-h-24 leading-7`} rows={4} value={p[key] as string} onChange={e => set(key, e.target.value as never)} />
        : <input className={`${kind === 'color' ? 'h-11 w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1' : control}`}
                 type={kind} dir={kind === 'url' ? 'ltr' : undefined} value={p[key] as string} onChange={e => set(key, e.target.value as never)} />}
    </label>
  );
  const choose = (key: TextKey, label: string, options: Record<string, string>) => (
    <label key={key} className="block space-y-1">
      <span className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</span>
      <select className={control} value={p[key] as string} onChange={e => set(key, e.target.value as never)}>
        {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    </label>
  );
  const toggle = (key: BoolKey, label: string, description = '') => (
    <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={p[key]} onChange={e => set(key, e.target.checked as never)} />
      <span><b className="block text-sm text-[var(--color-text-primary)]">{label}</b>{description && <small className="text-xs text-[var(--color-text-muted)]">{description}</small>}</span>
    </label>
  );

  const copy = async (value: string, done: string) => {
    try { await navigator.clipboard.writeText(value); showToast(done, 'success'); } catch { showToast('تعذر النسخ؛ استخدم عرض HTML وانسخ يدويًا.', 'error'); }
  };
  const exportSettings = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'IEEE-QU-email-settings.json';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const importSettings = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed?.p || !Array.isArray(parsed.blocks)) throw new Error('invalid');
      onChange(normalizeBuilderState(parsed)); showToast('تم استيراد الإعدادات.', 'success');
    } catch { showToast('تعذر قراءة الملف.', 'error'); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      <aside className="flex max-h-[calc(100dvh-14rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <nav role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] p-2">
          {TABS.map(item => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tab === item.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'}`}>{item.label}</button>
          ))}
        </nav>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {tab === 'main' && <>
            <h2 className="font-cairo text-base font-black">باراميترات الرسالة</h2>
            <p className="text-xs text-[var(--color-text-muted)]">لا توجد سيناريوهات مغلقة؛ تحكم في كل خاصية بشكل مستقل.</p>
            {choose('purpose', 'غرض الرسالة', PURPOSES)}{choose('timing', 'توقيت / حالة الفعالية', TIMINGS)}
            {choose('attendance', 'طريقة الحضور', ATTENDANCE)}{choose('audience', 'المستلمون', AUDIENCES)}
            {text('event', 'اسم الفعالية')}{text('name', 'اسم المستلم التجريبي')}{text('date', 'تاريخ الفعالية', 'date')}
            {text('start', 'وقت البداية', 'time')}{text('end', 'وقت النهاية', 'time')}{text('location', 'المكان / القاعة')}
          </>}
          {tab === 'content' && <>
            <h2 className="font-cairo text-base font-black">محتوى الإيميل</h2>
            <p className="text-xs text-[var(--color-text-muted)]">اترك العنوان والنص فارغين لتوليدهما تلقائيًا من الباراميترات.</p>
            {text('subject', 'عنوان الإيميل (Subject)')}{text('eyebrow', 'الشعار النصي أعلى البانر')}{text('headline', 'العنوان الرئيسي')}
            {text('message', 'النص الأساسي', 'textarea')}{text('notice', 'نص تنبيه خاص', 'textarea')}{text('agenda', 'جدول البرنامج', 'textarea')}
            {text('speaker', 'اسم المتحدث')}{text('signoff', 'الجملة الختامية')}
          </>}
          {tab === 'sections' && <>
            <h2 className="font-cairo text-base font-black">الأقسام الإضافية</h2>
            <p className="text-xs text-[var(--color-text-muted)]">كل جزء يُفعّل بشكل مستقل. قسم بيت الثقافة ليس إلزاميًا.</p>
            {toggle('details', 'تفاصيل التاريخ والوقت والمكان')}{toggle('agendaVisible', 'برنامج الفعالية')}{toggle('speakerVisible', 'المتحدث')}
            {toggle('extraVisible', 'متطلب / تسجيل إضافي')}{toggle('noticeVisible', 'تنبيه بارز')}{toggle('mapVisible', 'زر الموقع')}
            {toggle('joinVisible', 'زر الانضمام عن بُعد')}{toggle('registrationVisible', 'زر التسجيل')}{toggle('certificateVisible', 'زر الشهادة')}
            {toggle('feedbackVisible', 'زر التقييم')}{toggle('customVisible', 'زر مخصص')}{toggle('footerVisible', 'التذييل الرسمي')}
            <h3 className="pt-2 text-sm font-black">الأقسام المخصصة</h3>
            <button type="button" className={ghost} onClick={() => onChange({ ...state, blocks: [...state.blocks, { title: '', body: '' }] })}><Plus size={14} />إضافة قسم</button>
            {state.blocks.map((block, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <input className={control} placeholder="عنوان القسم" value={block.title} onChange={e => setBlock(index, { title: e.target.value })} />
                <textarea className={`${control} min-h-20`} placeholder="المحتوى" value={block.body} onChange={e => setBlock(index, { body: e.target.value })} />
                <button type="button" className={`${ghost} text-red-600`} onClick={() => onChange({ ...state, blocks: state.blocks.filter((_, i) => i !== index) })}><Trash2 size={14} />حذف القسم</button>
              </div>
            ))}
          </>}
          {tab === 'links' && <>
            <h2 className="font-cairo text-base font-black">الروابط والتعليمات</h2>
            <p className="text-xs text-[var(--color-text-muted)]">الزر لا يظهر دون رابط صحيح ومع تفعيل خياره في الإضافات.</p>
            {text('mapUrl', 'رابط الموقع', 'url')}{text('joinUrl', 'رابط الاجتماع', 'url')}{text('registrationUrl', 'رابط التسجيل', 'url')}
            {text('certificateUrl', 'رابط الشهادة', 'url')}{text('feedbackUrl', 'رابط التقييم', 'url')}{text('customLabel', 'نص الزر المخصص')}{text('customUrl', 'رابط الزر المخصص', 'url')}
            <h3 className="pt-2 text-sm font-black">متطلبات خاصة</h3>
            {text('extraTitle', 'عنوان التعليمات')}{text('extraText', 'شرح التعليمات', 'textarea')}{text('extraLabel', 'نص زر التسجيل الإضافي')}{text('extraUrl', 'رابط التسجيل الإضافي', 'url')}
          </>}
          {tab === 'theme' && <>
            <h2 className="font-cairo text-base font-black">هوية IEEE QU</h2>
            <p className="text-xs text-[var(--color-text-muted)]">الأزرق الأصلي والتدرج تركواز ← أخضر ← ذهبي. عدّل الألوان عند الحاجة.</p>
            {text('headerColor', 'لون الهيدر', 'color')}{text('accentColor', 'لون الأزرار', 'color')}{toggle('compact', 'تصميم مضغوط')}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)]">الهوية: IEEE Qassim University Student Branch</div>
          </>}
        </div>
      </aside>

      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
          <div>
            <h2 className="font-cairo text-base font-black">معاينة الإيميل المباشرة</h2>
            <p className="text-xs text-[var(--color-text-muted)]">عدّل أي قيمة وسترى النتيجة فورًا</p>
          </div>
          <div className="flex gap-1">
            {([['desktop', 'كمبيوتر', Monitor], ['mobile', 'جوال', Smartphone], ['code', 'HTML', Code2]] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${mode === value ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}><Icon size={14} />{label}</button>
            ))}
          </div>
        </div>
        {warnings.length > 0 && <p role="status" className="mx-3 mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">⚠ {warnings.join(' · ')}</p>}
        <div className="flex-1 overflow-auto bg-slate-100 p-3">
          {mode === 'code'
            ? <textarea readOnly dir="ltr" value={html} className="h-[620px] w-full rounded-xl border border-[var(--color-border)] bg-white p-3 font-mono text-xs text-slate-800" />
            : <iframe title="Email preview" srcDoc={html} sandbox="" className={`mx-auto h-[680px] w-full rounded-xl bg-white shadow ${mode === 'mobile' ? 'max-w-[390px]' : 'max-w-[680px]'}`} />}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] p-3">
          <button type="button" className={ghost} onClick={() => void copy(html, 'تم نسخ HTML')}><Copy size={14} />نسخ HTML</button>
          <button type="button" className={ghost} onClick={exportSettings}><Download size={14} />حفظ الإعدادات</button>
          <button type="button" className={ghost} onClick={() => importRef.current?.click()}><Upload size={14} />استيراد الإعدادات</button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { void importSettings(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className={ghost} onClick={() => { if (confirm('إعادة جميع الإعدادات إلى مثال IEEE Day؟')) { onChange(defaultBuilderState()); showToast('تمت إعادة الضبط.', 'success'); } }}><RotateCcw size={14} />إعادة ضبط</button>
          <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]"><Check size={12} />معاينة فقط؛ لا يُرسل بريد من هنا.</span>
        </div>
      </section>
    </div>
  );
}
