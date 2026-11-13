'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { apiGet, apiSend, uploadImage } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { imageDimensions, type EmailBoilerplate, type EmailBoilerplateSummary } from '@/lib/emailTemplates';
import TemplateDialog from './TemplateDialog';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)]`;

export default function EmailBoilerplateManager({ isAr, onClose }: { isAr: boolean; onClose: () => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [list, setList] = useState<EmailBoilerplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EmailBoilerplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageForm, setImageForm] = useState(false);
  const [imageWidth, setImageWidth] = useState(320);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  const [imageBusy, setImageBusy] = useState(false);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList((await apiGet<{ boilerplates: EmailBoilerplateSummary[] }>('/api/admin/mail/boilerplates')).boilerplates); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load boilerplates'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const open = async (id?: string) => {
    if (!id) { setEditing({ id: '', name: '', html: '', revision: 0 }); return; }
    setBusy(true);
    try { setEditing(await apiGet<EmailBoilerplate>(`/api/admin/mail/boilerplates/${id}`)); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to open boilerplate', 'error'); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await apiSend(editing.id ? 'PUT' : 'POST', editing.id ? `/api/admin/mail/boilerplates/${editing.id}` : '/api/admin/mail/boilerplates',
        { name: editing.name, html: editing.html, revision: editing.revision });
      setEditing(null); await load();
      showToast(t('تم الحفظ.', 'Saved.'), 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save boilerplate', 'error'); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm(t('حذف هذا القالب الأساسي؟', 'Delete this boilerplate?'))) return;
    setBusy(true);
    try { await apiSend('DELETE', `/api/admin/mail/boilerplates/${id}`); await load(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to delete boilerplate', 'error'); } finally { setBusy(false); }
  };
  const insertImage = async (file: File) => {
    if (!editing) return;
    setImageBusy(true);
    try {
      const [url, natural] = await Promise.all([uploadImage(file, 'email'), imageDimensions(file)]);
      // The width/height HTML attributes (not just CSS) are what keep some mail clients from
      // mis-sizing the image -- without them a client with patchy max-width support can stretch
      // it well past its native resolution, which looks pixelated even though the file is sharp.
      const height = natural ? Math.round(imageWidth * natural.height / natural.width) : undefined;
      const align = imageAlign === 'center' ? 'display:block;margin:0 auto' : `float:${imageAlign};margin:${imageAlign === 'left' ? '0 12px 12px 0' : '0 0 12px 12px'}`;
      const tag = `<img src="${url}" alt="" width="${imageWidth}"${height ? ` height="${height}"` : ''} style="width:${imageWidth}px;max-width:100%;height:auto;${align}" />`;
      const field = htmlRef.current;
      const start = field?.selectionStart ?? editing.html.length;
      const end = field?.selectionEnd ?? editing.html.length;
      const next = editing.html.slice(0, start) + tag + editing.html.slice(end);
      setEditing({ ...editing, html: next });
      setImageForm(false);
      requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + tag.length, start + tag.length); });
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر رفع الصورة', 'Unable to upload the image'), 'error'); } finally { setImageBusy(false); }
  };
  if (editing) return <TemplateDialog title={editing.id ? t('تعديل القالب الأساسي', 'Edit boilerplate') : t('قالب أساسي جديد', 'New boilerplate')} onClose={() => setEditing(null)}>
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-4">
      <p className="text-xs text-[var(--color-text-muted)]">{t('القوالب الأساسية تحتوي على تنسيق HTML/CSS فقط، بلا متغيرات.', 'Boilerplates hold pure HTML/CSS styling only -- no variables.')}</p>
      <label className="block space-y-2"><span>{t('الاسم', 'Name')}</span><input className={input} maxLength={120} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
      <div className="flex items-center justify-between"><span dir="ltr" className="text-sm font-bold">HTML / CSS</span><button type="button" className={button} onClick={() => setImageForm(previous => !previous)}><ImageIcon size={16} />{t('إدراج صورة', 'Insert image')}</button></div>
      {imageForm && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] p-3 text-xs">
        <label className="flex items-center gap-2"><span>{t('العرض (بكسل)', 'Width (px)')}</span><input type="number" min={40} max={1000} value={imageWidth} onChange={event => setImageWidth(Number(event.target.value) || imageWidth)} className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1" /></label>
        <select value={imageAlign} onChange={event => setImageAlign(event.target.value as typeof imageAlign)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1">
          <option value="left">{t('يسار', 'Left')}</option><option value="center">{t('وسط', 'Center')}</option><option value="right">{t('يمين', 'Right')}</option>
        </select>
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={imageBusy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void insertImage(file); }} />
        {imageBusy && <span>{t('جارٍ الرفع…', 'Uploading…')}</span>}
      </div>}
      <label className="block space-y-2"><span dir="ltr">HTML / CSS</span><textarea ref={htmlRef} dir="ltr" rows={14} className={`${input} font-mono`} value={editing.html} onChange={event => setEditing({ ...editing, html: event.target.value })} /></label>
      <details className="rounded-xl border border-[var(--color-border)] p-4"><summary className="cursor-pointer font-bold">{t('معاينة', 'Preview')}</summary><iframe title={t('معاينة القالب الأساسي', 'Boilerplate preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={editing.html} className="mt-3 h-72 w-full rounded-lg bg-white" /></details>
      <div className="flex justify-end gap-2"><button type="button" className={primary} disabled={busy} onClick={() => void save()}><Save size={16} />{busy ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ', 'Save')}</button></div>
    </div>
  </TemplateDialog>;
  return <TemplateDialog title={t('القوالب الأساسية للبريد', 'Email boilerplates')} onClose={onClose}>
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}
      <div className="flex justify-end"><button type="button" className={primary} disabled={busy} onClick={() => void open()}><Plus size={16} />{t('قالب أساسي جديد', 'New boilerplate')}</button></div>
      {loading ? <p>{t('جارٍ التحميل…', 'Loading…')}</p> : list.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]"><Layers className="mx-auto mb-2" />{t('لا توجد قوالب أساسية بعد.', 'No boilerplates yet.')}</div> : <ul className="space-y-2">
        {list.map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-2)] px-4 py-3"><button type="button" className="text-start font-bold hover:underline" disabled={busy} onClick={() => void open(item.id)}>{item.name || t('(بدون اسم)', '(untitled)')}</button><button type="button" aria-label={t('حذف', 'Delete')} disabled={busy} onClick={() => void remove(item.id)}><Trash2 size={16} /></button></li>)}
      </ul>}
    </div>
  </TemplateDialog>;
}
