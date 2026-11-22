'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

const roles = ['student', 'studentCertificate', 'organizer', 'speaker', 'interviewer', 'sponsor'] as const;
type Mappings = Record<`${typeof roles[number]}EmailTemplateId`, string | null>;
const names = { student: ['تذكير الطلاب', 'Student reminders'], studentCertificate: ['شهادات الحضور للطلاب', 'Student attendance certificates'], organizer: ['المنظمون', 'Organizers'], speaker: ['شهادات المتحدثين', 'Speaker certificates'], interviewer: ['شهادات المحاور', 'Interviewer certificates'], sponsor: ['شهادات الرعاة', 'Sponsor certificates'] };

export default function EventCommunicationSettings() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [data, setData] = useState<Mappings | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([apiGet<Mappings>('/api/admin/settings/communications'), apiGet<{ templates: { id: string; name: string }[] }>('/api/admin/mail/templates', { scope: 'approved' })])
      .then(([settings, mail]) => { setData(settings); setTemplates(mail.templates); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load settings'));
  }, []);
  const save = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      const body = Object.fromEntries(roles.map(role => [`${role}EmailTemplateId`, data[`${role}EmailTemplateId`]]));
      setData(await apiSend<Mappings>('PUT', '/api/admin/settings/communications', body));
      showToast(isAr ? 'تم حفظ ربط الرسائل. لم يتم إرسال أي بريد.' : 'Mappings saved. No email was sent.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Could not save', 'error'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <h2 className="text-xl font-bold">{isAr ? 'ربط رسائل الفعالية بالمستلمين' : 'Event email routing'}</h2>
    <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{isAr ? 'تذكير الطلاب مستقل عن شهادات الحضور. عند إنهاء فعالية مفعّل فيها إصدار الشهادات، تُجهّز شهادات الطلاب الذين سُجّل حضورهم، والمتحدثين والمحاور والرعاة تلقائيًا وترسل بالبريد. اختيار قالب المنظمين يضمّنهم أيضًا. لا يؤدي حفظ الربط إلى إرسال البريد.' : 'Student reminders are separate from attendance certificates. Completing a certificate-enabled event automatically prepares and emails certificates to verified attendees, speakers, the interviewer and sponsors. Mapping organizers includes them too. Saving mappings does not send email.'}</p>
    <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'أرفق تصميم الشهادة المناسب داخل قالب البريد لكل فئة؛ وإلا يُستخدم تصميم شهادة الفعالية ثم الافتراضي. قالب تذكير الطلاب لا يقبل مرفقات شهادات. بلا قالب بريد لشهادات الطلاب تُرسل رسالة شهادة جاهزة. لا تُكرر شهادة سبق إصدارها أو إرسالها.' : 'Attach the appropriate certificate design to each audience’s email template; otherwise the event/default certificate design is used. Reminder templates cannot attach certificates. Without a student certificate email template, a built-in certificate message is used. Previously issued or sent certificates are not duplicated.'}</p>
    {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
    {data && roles.map(role => <label key={role} className="block space-y-2"><span className="text-sm font-bold">{names[role][isAr ? 0 : 1]}</span>
      <select disabled={busy} value={data[`${role}EmailTemplateId`] || ''} onChange={e => setData({ ...data, [`${role}EmailTemplateId`]: e.target.value || null })} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <option value="">{role === 'student' ? (isAr ? 'رسالة تذكير جاهزة' : 'Built-in reminder') : role === 'studentCertificate' ? (isAr ? 'رسالة شهادة جاهزة' : 'Built-in certificate message') : role === 'organizer' ? (isAr ? 'لا ترسل للمنظمين' : 'Do not email organizers') : (isAr ? 'استخدام قالب الفعالية / الافتراضي' : 'Use event / default template')}</option>
        {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
      </select></label>)}
    <button type="button" disabled={!data || busy} onClick={() => void save()} className="rounded-xl bg-[var(--color-accent)] px-5 py-3 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">{isAr ? 'حفظ الربط' : 'Save mappings'}</button>
  </section>;
}
