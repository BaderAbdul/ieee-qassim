'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Plus, Save, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import type { EmailBoilerplate, EmailBoilerplateSummary } from '@/lib/emailTemplates';
import TemplateDialog from './TemplateDialog';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
const primary = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)]`;

export default function EmailBoilerplateManager({ isAr, onClose }: { isAr: boolean; onClose: () => void }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [list, setList] = useState<EmailBoilerplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EmailBoilerplate | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList((await apiGet<{ boilerplates: EmailBoilerplateSummary[] }>('/api/admin/mail/boilerplates')).boilerplates); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load boilerplates'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const open = async (id?: string) => {
    if (!id) { setEditing({ id: '', name: '', html: '', revision: 0 }); return; }
    setBusy(true); setError('');
    try { setEditing(await apiGet<EmailBoilerplate>(`/api/admin/mail/boilerplates/${id}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to open boilerplate'); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!editing) return;
    setBusy(true); setError('');
    try {
      await apiSend(editing.id ? 'PUT' : 'POST', editing.id ? `/api/admin/mail/boilerplates/${editing.id}` : '/api/admin/mail/boilerplates',
        { name: editing.name, html: editing.html, revision: editing.revision });
      setEditing(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save boilerplate'); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm(t('حذف هذا القالب الأساسي؟', 'Delete this boilerplate?'))) return;
    setBusy(true); setError('');
    try { await apiSend('DELETE', `/api/admin/mail/boilerplates/${id}`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete boilerplate'); } finally { setBusy(false); }
  };
  if (editing) return <TemplateDialog title={editing.id ? t('تعديل القالب الأساسي', 'Edit boilerplate') : t('قالب أساسي جديد', 'New boilerplate')} onClose={() => setEditing(null)}>
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}</p>}
      <p className="text-xs text-[var(--color-text-muted)]">{t('القوالب الأساسية تحتوي على تنسيق HTML/CSS فقط، بلا متغيرات.', 'Boilerplates hold pure HTML/CSS styling only -- no variables.')}</p>
      <label className="block space-y-2"><span>{t('الاسم', 'Name')}</span><input className={input} maxLength={120} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
      <label className="block space-y-2"><span dir="ltr">HTML / CSS</span><textarea dir="ltr" rows={14} className={`${input} font-mono`} value={editing.html} onChange={event => setEditing({ ...editing, html: event.target.value })} /></label>
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
