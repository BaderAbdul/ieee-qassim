'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Award, CheckCircle2, Clock3, Layers, Mail, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/backend';
import type { CertificateTemplate } from '@/lib/certificateTemplates';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
import TemplateDialog from '@/components/admin/TemplateDialog';
import CertificateTemplateEditor from '@/components/admin/CertificateTemplateEditor';

const panel = 'rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md shadow-sm';

export default function AdminTemplatesPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [chooser, setChooser] = useState(false);
  const [emailInfo, setEmailInfo] = useState(false);
  const [editor, setEditor] = useState<{ initial?: CertificateTemplate } | null>(null);
  const t = (ar: string, en: string) => isAr ? ar : en;
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await apiGet<{ templates: CertificateTemplate[]; canReview: boolean }>('/api/admin/templates'); setTemplates(result.templates); setCanReview(result.canReview); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load templates'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { setEditor({ initial: await apiGet<CertificateTemplate>(`/api/admin/templates/${id}`) }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to open template'); } finally { setBusy(false); }
  };
  useAdminTopbarActions(<button type="button" onClick={() => setChooser(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-xs font-bold text-[var(--color-accent-contrast)]"><Plus size={16} />{t('إنشاء قالب', 'Create template')}</button>);
  const visible = templates.filter(template => (!status || status === template.status) && template.nameAr.includes(search.trim()));
  return <div className="space-y-6 pb-12">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
      { label: t('قوالب الشهادات', 'Certificate templates'), value: templates.length, Icon: Award, color: 'text-indigo-500' },
      { label: t('بانتظار الاعتماد', 'Awaiting approval'), value: templates.filter(template => template.status === 'draft').length, Icon: Clock3, color: 'text-amber-500' },
      { label: t('معتمدة للاستخدام', 'Approved for use'), value: templates.filter(template => template.status === 'approved').length, Icon: CheckCircle2, color: 'text-emerald-500' },
      { label: t('قوالب البريد', 'Email templates'), value: '—', Icon: Mail, color: 'text-sky-500' },
    ].map(({ label, value, Icon, color }) => <div className={`${panel} flex items-center gap-3.5 p-5`} key={label}><div className={`rounded-xl bg-[var(--color-surface-2)] p-3 ${color}`}><Icon size={24} /></div><div><p className="text-xs font-bold text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-2xl font-black">{loading ? '…' : value}</p></div></div>)}</div>
    <div className={`${panel} flex flex-wrap items-center gap-3 p-5`}><div className="relative min-w-48 flex-1"><Search size={17} className="absolute start-3 top-3 text-[var(--color-text-muted)]" /><input aria-label={t('بحث في القوالب', 'Search templates')} placeholder={t('ابحث باسم القالب…', 'Search template name…')} value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 ps-10 pe-3 text-sm" /></div><select aria-label={t('تصفية الحالة', 'Filter status')} value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 text-sm"><option value="">{t('كل الحالات', 'All statuses')}</option><option value="draft">{t('مسودة', 'Draft')}</option><option value="approved">{t('معتمد', 'Approved')}</option></select><button type="button" onClick={() => setChooser(true)} className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-contrast)]"><Plus size={17} />{t('إنشاء قالب', 'Create template')}</button></div>
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}<button type="button" className="ms-4 underline" onClick={() => void load()}>{t('إعادة المحاولة', 'Retry')}</button></div>}
    {loading ? <p role="status" className="p-10 text-center">{t('جارٍ تحميل القوالب…', 'Loading templates…')}</p> : visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map(template => <article key={template.id} className={`${panel} overflow-hidden`}><div className="flex h-28 items-center justify-center bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Award size={44} /></div><div className="space-y-4 p-5"><div className="flex items-start justify-between gap-2"><h2 dir="rtl" className="font-cairo text-lg font-bold">{template.nameAr}</h2><span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${template.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{template.status === 'approved' ? t('معتمد', 'Approved') : t('مسودة', 'Draft')}</span></div><p className="text-xs text-[var(--color-text-muted)]">{t('الإصدار', 'Revision')} {template.revision} · {template.status === 'draft' ? t('الاختبار متاح · يلزم اعتماد تقني', 'Testing open · technical approval required') : t('متاح للاستخدام العام', 'Available for global use')}</p><button type="button" disabled={busy} onClick={() => void open(template.id)} className="w-full rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold hover:bg-[var(--color-surface-2)] disabled:opacity-50">{t('فتح واختبار القالب', 'Open & test template')}</button></div></article>)}</div> : <div className={`${panel} p-14 text-center`}><Layers size={40} className="mx-auto mb-4 text-[var(--color-accent)]" /><h2 className="text-lg font-bold">{t('لا توجد قوالب مطابقة', 'No matching templates')}</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('أنشئ قالب شهادة، أضف المتغيرات واختبره قبل المراجعة التقنية.', 'Create a certificate template, add variables and test it before technical review.')}</p></div>}
    <p className="text-xs text-[var(--color-text-muted)]">{t('تعرض الصفحة أحدث ٢٠٠ قالب متاح لك. تظهر المسودات لمنشئها وللمراجعين التقنيين.', 'Showing up to 200 accessible templates. Drafts are visible to their creator and technical reviewers.')}</p>
    {chooser && <TemplateDialog title={t('إنشاء قالب', 'Create template')} onClose={() => { setChooser(false); setEmailInfo(false); }}><div className="grid gap-5 sm:grid-cols-2">{[{ Icon: Mail, name: t('إنشاء قالب بريد', 'Create email template'), description: t('رسائل البريد ومحتواها', 'Email messages and content'), action: () => setEmailInfo(true) }, { Icon: Award, name: t('إنشاء قالب شهادة', 'Create certificate template'), description: t('شهادة فارغة، متغيرات، مواضع واختبار', 'Blank certificate, variables, placement and testing'), action: () => { setChooser(false); setEditor({}); } }].map(({ Icon, name, description, action }) => <button type="button" key={name} onClick={action} className={`${panel} flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center transition hover:border-[var(--color-accent)]`}><Icon size={40} className="text-[var(--color-accent)]" /><span className="text-xl font-bold">{name}</span><span className="text-sm text-[var(--color-text-muted)]">{description}</span></button>)}</div>{emailInfo && <p role="status" className="mt-5 rounded-xl bg-[var(--color-accent-soft)] p-4 text-sm">{t('سيتم بناء محرر البريد في المرحلة التالية بعد تحديد تفاصيله. يمكنك الآن إنشاء قوالب الشهادات.', 'The email editor will follow once its requirements are defined. Certificate templates are ready to create now.')}</p>}</TemplateDialog>}
    {editor && <CertificateTemplateEditor key={editor.initial?.id || 'new'} initial={editor.initial} isAr={isAr} canReview={canReview} canEdit={!editor.initial || canReview || editor.initial.createdBy === userData?.id} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void load(); }} />}
  </div>;
}
