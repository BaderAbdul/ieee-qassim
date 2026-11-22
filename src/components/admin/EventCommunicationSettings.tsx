'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

const roles = ['student', 'organizer', 'speaker', 'interviewer'] as const;
type Mappings = Record<`${typeof roles[number]}EmailTemplateId`, string | null>;
const names = { student: ['الطلاب — تذكير الفعالية', 'Students — event reminders'], organizer: ['المنظمون', 'Organizers'], speaker: ['المتحدثون', 'Speakers'], interviewer: ['المحاور', 'Interviewer'] };

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
    <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{isAr ? 'اختر قالبًا معتمدًا لكل فئة. بريد الطلاب يستخدم للتذكير اليدوي والتلقائي. رسائل المنظمين والمتحدثين والمحاور تُرسل يدويًا من تبويب المحاور، مرة واحدة لكل مستلم ودور. ربط قالب المنظمين يُضمّنهم في زر الإرسال. لا يؤدي الحفظ إلى إرسال البريد.' : 'Choose an approved template for each audience. Student templates apply to manual and scheduled reminders. Organizer, speaker and interviewer emails are sent manually from the interviewer tab, once per recipient and role. Mapping an organizer template includes organizers in that send action. Saving does not send mail.'}</p>
    <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'بلا قالب طلاب: تُستخدم رسالة تذكير جاهزة. بلا قالب محاور أو متحدث: يستخدم قالب الفعالية ثم الافتراضي. المنظمون لا يُرسَل لهم دون ربط قالب. استخدم متغير اسم المستلم بالعربية أو الإنجليزية لتحية كل شخص باسمه.' : 'Without a student template, reminders use built-in text. Interviewer/speaker emails fall back to event/default templates. Organizers are only emailed when mapped. Use recipient name variables for personalized greetings.'}</p>
    {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
    {data && roles.map(role => <label key={role} className="block space-y-2"><span className="text-sm font-bold">{names[role][isAr ? 0 : 1]}</span>
      <select disabled={busy} value={data[`${role}EmailTemplateId`] || ''} onChange={e => setData({ ...data, [`${role}EmailTemplateId`]: e.target.value || null })} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <option value="">{role === 'student' ? (isAr ? 'رسالة تذكير جاهزة' : 'Built-in reminder') : role === 'organizer' ? (isAr ? 'لا ترسل للمنظمين' : 'Do not email organizers') : (isAr ? 'استخدام قالب الفعالية / الافتراضي' : 'Use event / default template')}</option>
        {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
      </select></label>)}
    <button type="button" disabled={!data || busy} onClick={() => void save()} className="rounded-xl bg-[var(--color-accent)] px-5 py-3 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">{isAr ? 'حفظ الربط' : 'Save mappings'}</button>
  </section>;
}
