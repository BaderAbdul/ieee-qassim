'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Save, Sparkles } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface AutomationSettings {
  defaultEmailTemplateId: string | null;
  defaultCertificateTemplateId: string | null;
  dailyEmailLimit: number;
  autoApproveTemplates: boolean;
}
interface MailTemplate { id: string; name: string; subject: string }
interface CertTemplate { id: string; nameAr: string }
const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';

export default function EventAutomationSettings() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const { userData } = useAuth();
  const isSuperAdmin = userData?.isSuperAdmin === true || userData?.role === 'super_admin';
  const [data, setData] = useState<AutomationSettings | null>(null);
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [certTemplates, setCertTemplates] = useState<CertTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [settings, mail, certs] = await Promise.all([
        apiGet<AutomationSettings>('/api/admin/settings/automation'),
        apiGet<{ templates: MailTemplate[] }>('/api/admin/mail/templates', { scope: 'approved' }),
        apiGet<{ templates: CertTemplate[] }>('/api/admin/templates', { scope: 'approved' }),
      ]);
      setData(settings); setMailTemplates(mail.templates); setCertTemplates(certs.templates);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load settings'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      // Only a super admin may change the approval switch; everyone else saves the rest without it.
      const { autoApproveTemplates, ...others } = data;
      const result = await apiSend<AutomationSettings>('PUT', '/api/admin/settings/automation', isSuperAdmin ? { ...others, autoApproveTemplates } : others);
      setData(result); showToast(t('تم حفظ إعدادات الأتمتة.', 'Automation settings saved.'), 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save', 'error'); } finally { setBusy(false); }
  };

  return <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <header className="flex items-start gap-3"><Sparkles className="mt-1 shrink-0 text-[var(--color-accent)]" />
      <div>
        <h2 className="text-xl font-bold">{t('أتمتة الفعاليات', 'Event automation')}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {t('تُستخدم هذه الإعدادات عندما لا تختار الفعالية قالب بريد أو شهادة خاصًا بها، وعند اكتمال الفعالية تُصدر الشهادات تلقائيًا ويُرسل بريد بذلك.',
             'Used when an event doesn’t choose its own email or certificate template. When an event is marked Completed, certificates are issued automatically and a notification email is sent.')}
        </p>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}<button type="button" disabled={busy} onClick={() => void load()} className="ms-3 underline">{t('إعادة تحميل', 'Reload')}</button></div>}
    {!data ? <p>{t('جارٍ تحميل الإعدادات…', 'Loading settings…')}</p> : <form onSubmit={save} className="space-y-5">
      <fieldset disabled={busy} className="space-y-4">
        <label className="block space-y-2">
          <span>{t('قالب البريد الافتراضي', 'Default email template')}</span>
          <select className={input} value={data.defaultEmailTemplateId ?? ''} onChange={e => setData({ ...data, defaultEmailTemplateId: e.target.value || null })}>
            <option value="">{t('بلا قالب افتراضي', 'No default')}</option>
            {mailTemplates.map(m => <option key={m.id} value={m.id}>{m.name || m.subject || m.id}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span>{t('قالب الشهادة الافتراضي', 'Default certificate template')}</span>
          <select className={input} value={data.defaultCertificateTemplateId ?? ''} onChange={e => setData({ ...data, defaultCertificateTemplateId: e.target.value || null })}>
            <option value="">{t('بلا قالب افتراضي', 'No default')}</option>
            {certTemplates.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={data.autoApproveTemplates} disabled={!isSuperAdmin}
                 onChange={e => setData({ ...data, autoApproveTemplates: e.target.checked })} />
          <span>
            <b className="block">{t('اعتماد القوالب تلقائيًا عند الحفظ', 'Approve templates automatically on save')}</b>
            <small className="text-xs leading-6 text-[var(--color-text-secondary)]">
              {t('عند التفعيل: أي قالب شهادة أو بريد يحفظه مدير عام أو صاحب وسام تقني يُعتمد فورًا للاستخدام العام. عند الإيقاف: يُحفظ كمسودة ويحتاج اعتمادًا يدويًا (مع اختبار النسخة المحفوظة للشهادات). حفظ بقية المستخدمين يبقى مسودة دائمًا.',
                'On: any certificate or email template saved by a super admin or Technician-badge holder is approved for public use immediately. Off: it is saved as a draft and needs a manual approval (certificates must also be tested first). Everyone else’s saves are always drafts.')}
              {!isSuperAdmin && <em className="block not-italic text-amber-600">{t('يغيّر هذا الخيار المدير العام فقط.', 'Only a super admin can change this option.')}</em>}
            </small>
          </span>
        </label>
        <label className="block space-y-2">
          <span>{t('الحد الأقصى اليومي لرسائل البريد', 'Daily email sending limit')}</span>
          <input type="number" dir="ltr" min={1} max={100000} className={input} value={data.dailyEmailLimit}
                 onChange={e => setData({ ...data, dailyEmailLimit: Math.max(1, Math.min(100000, Number(e.target.value) || 1)) })} />
          <span className="block text-xs text-[var(--color-text-muted)]">{t('يظهر هذا الحد في صفحة البريد عند الإرسال للجميع.', 'Shown on the mail page when sending to all students.')}</span>
        </label>
      </fieldset>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50"><Save size={17} />{t('حفظ الإعدادات', 'Save settings')}</button>
    </form>}
  </section>;
}
