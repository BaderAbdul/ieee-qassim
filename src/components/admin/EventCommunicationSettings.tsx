'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

const roles = ['student', 'studentCertificate', 'organizer', 'speaker', 'interviewer', 'sponsor'] as const;
type Mappings = Record<string, string | null>;
const names = { student: ['تذكير الطلاب', 'Student reminders'], studentCertificate: ['شهادات الحضور للطلاب', 'Student attendance certificates'], organizer: ['المنظمون', 'Organizers'], speaker: ['شهادات المتحدثين', 'Speaker certificates'], interviewer: ['شهادات المحاور', 'Interviewer certificates'], sponsor: ['شهادات الرعاة', 'Sponsor certificates'] };

export default function EventCommunicationSettings() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [data, setData] = useState<Mappings | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; language: 'ar' | 'en' | 'bilingual' }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([apiGet<Mappings>('/api/admin/settings/communications'), apiGet<{ templates: { id: string; name: string; language: 'ar' | 'en' | 'bilingual' }[] }>('/api/admin/mail/templates', { scope: 'approved' })])
      .then(([settings, mail]) => { setData(settings); setTemplates(mail.templates); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load settings'));
  }, []);
  const save = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      const body = Object.fromEntries(roles.flatMap(role => ['', 'Ar', 'En'].map(suffix => [`${role}EmailTemplateId${suffix}`, data[`${role}EmailTemplateId${suffix}`] || null])));
      setData(await apiSend<Mappings>('PUT', '/api/admin/settings/communications', body));
      showToast(isAr ? 'تم حفظ ربط الرسائل. لم يتم إرسال أي بريد.' : 'Mappings saved. No email was sent.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Could not save', 'error'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <h2 className="text-xl font-bold">{isAr ? 'ربط رسائل الفعالية بالمستلمين' : 'Event email routing'}</h2>
    <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{isAr ? 'تذكير الطلاب مستقل عن شهادات الحضور. عند إنهاء فعالية مفعّل فيها إصدار الشهادات، تُجهّز شهادات الطلاب الذين سُجّل حضورهم، والمتحدثين والمحاور والرعاة تلقائيًا وترسل بالبريد. اختيار قالب المنظمين يضمّنهم أيضًا. لا يؤدي حفظ الربط إلى إرسال البريد.' : 'Student reminders are separate from attendance certificates. Completing a certificate-enabled event automatically prepares and emails certificates to verified attendees, speakers, the interviewer and sponsors. Mapping organizers includes them too. Saving mappings does not send email.'}</p>
    <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'أرفق تصميم الشهادة المناسب داخل قالب البريد لكل فئة؛ وإلا يُستخدم تصميم الشهادة الافتراضي المحدد في الإعدادات. قالب تذكير الطلاب لا يقبل مرفقات شهادات. بلا قالب بريد لشهادات الطلاب تُرسل رسالة شهادة جاهزة. إعادة حالة الفعالية إلى جارية ثم مكتملة تعيد إرسال الرسائل مع الاحتفاظ بمعرّفات الشهادات.' : 'Attach the appropriate certificate design to each audience’s email template; otherwise the default certificate design configured in Settings is used. Reminder templates cannot attach certificates. Without a student certificate email template, a built-in certificate message is used. Reopening and completing the event resends the emails while preserving certificate IDs.'}</p>
    {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
    <p className="text-sm text-[var(--color-text-secondary)]">{isAr ? 'حدد قالب العربية والإنجليزية لكل فئة. تختار لغة الطلاب والمنظمين مرة واحدة لكل الفعالية، ولغة كل محاور ومتحدث وراعٍ بشكل فردي من بيانات الفعالية. القالب ثنائي اللغة يبقى احتياطيًا إذا لم تحدد قالبًا للغة المختارة.' : 'Map Arabic and English templates for each audience. Student and organizer languages apply to the whole event; interviewers, speakers and sponsors have individual preferences. An existing bilingual template is used as fallback when no language-specific template is mapped.'}</p>
    {data && roles.map(role => <fieldset key={role} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
      <legend className="px-2 text-sm font-bold">{names[role][isAr ? 0 : 1]}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{(['Ar', 'En', ''] as const).map(suffix => {
        const field = `${role}EmailTemplateId${suffix}`;
        const language = suffix === 'Ar' ? 'ar' : suffix === 'En' ? 'en' : 'bilingual';
        return <label key={field} className="block space-y-2"><span className="text-xs font-bold">{suffix === 'Ar' ? 'العربية' : suffix === 'En' ? 'English' : (isAr ? 'قالب احتياطي / ثنائي اللغة' : 'Fallback / bilingual template')}</span>
          <select disabled={busy} value={data[field] || ''} onChange={e => setData({ ...data, [field]: e.target.value || null })} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <option value="">{isAr ? 'بلا ربط' : 'Not mapped'}</option>
            {templates.filter(template => template.language === language || template.language === 'bilingual' || template.id === data[field]).map(template => <option key={template.id} value={template.id}>{template.name} · {template.language === 'ar' ? 'العربية' : template.language === 'en' ? 'English' : (isAr ? 'ثنائي اللغة' : 'Bilingual')}</option>)}
          </select>
        </label>;
      })}</div>
    </fieldset>)}
    <button type="button" disabled={!data || busy} onClick={() => void save()} className="rounded-xl bg-[var(--color-accent)] px-5 py-3 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">{isAr ? 'حفظ الربط' : 'Save mappings'}</button>
  </section>;
}
