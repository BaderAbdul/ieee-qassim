'use client';

import { useEffect, useState } from 'react';
import { Paperclip, Save, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import TemplatePreview from './TemplatePreview';
import { input, label, primaryButton, type SettingsFields, type StageEmbedProps } from './wizardTypes';

interface CertTemplate { id: string; nameAr: string }
interface MailTemplate { id: string; name: string; subject: string }
interface EventAttachment { id: string; title: string; filename: string; contentType: string }

interface SettingsStageProps extends StageEmbedProps {
  isAr: boolean;
  value: SettingsFields;
  onChange: (next: SettingsFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  eventId?: number | null;
  /** Field name to outline in red, deep-linked from the events list's readiness badge. */
  highlightField?: string;
}

const invalidClass = 'border-2 border-[var(--color-danger)]';

export default function SettingsStage({ isAr, value, onChange, onSave, saving, eventId, highlightField, hideSave, registerCollect }: SettingsStageProps) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [highlight, setHighlight] = useState(highlightField);
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState('');
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [mailTemplatesError, setMailTemplatesError] = useState('');
  const [eventAttachments, setEventAttachments] = useState<EventAttachment[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachTitle, setAttachTitle] = useState('');

  useEffect(() => {
    if (!value.hasCertificate) return;
    let active = true;
    apiGet<{ templates: CertTemplate[] }>('/api/admin/templates', { scope: 'approved' })
      .then(result => { if (active) setTemplates(result.templates); })
      .catch(error => { if (active) setTemplatesError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل قوالب الشهادات.' : 'Could not load certificate templates.')); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.hasCertificate]);

  useEffect(() => {
    let active = true;
    apiGet<{ templates: MailTemplate[] }>('/api/admin/mail/templates', { scope: 'approved' })
      .then(result => { if (active) setMailTemplates(result.templates); })
      .catch(error => { if (active) setMailTemplatesError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل قوالب البريد.' : 'Could not load email templates.')); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEventAttachments = () => {
    if (!eventId) return;
    apiGet<{ attachments: EventAttachment[] }>(`/api/admin/events/${eventId}/email-attachments`)
      .then(result => setEventAttachments(result.attachments)).catch(() => {});
  };
  useEffect(() => { loadEventAttachments(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEventAttachment = async (file: File) => {
    if (!eventId) return;
    setAttachBusy(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      await apiSend('POST', `/api/admin/events/${eventId}/email-attachments`, {
        title: attachTitle.trim() || file.name.replace(/\.[^./\\]+$/, ''), filename: file.name,
        contentType: file.type || 'application/octet-stream', contentBase64,
      });
      setAttachTitle(''); loadEventAttachments();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر إضافة المرفق', 'Unable to add attachment'), 'error'); } finally { setAttachBusy(false); }
  };
  const removeEventAttachment = async (id: string) => {
    if (!eventId) return;
    setAttachBusy(true);
    try { await apiSend('DELETE', `/api/admin/events/${eventId}/email-attachments/${id}`); loadEventAttachments(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر حذف المرفق', 'Unable to remove attachment'), 'error'); } finally { setAttachBusy(false); }
  };

  const set = <K extends keyof SettingsFields>(key: K, val: SettingsFields[K]) => {
    if (highlight === key) setHighlight(undefined);
    onChange({ ...value, [key]: val });
  };

  // "requires registration" now lives in the first stage (main data, time & place); this stage only saves what it shows.
  const [pointsError, setPointsError] = useState('');
  const collect = (): Record<string, unknown> | null => {
    const points = Number(value.points.trim() === '' ? '0' : value.points);
    if (!Number.isInteger(points) || points < 0 || points > 100000) {
      setPointsError(isAr ? 'أدخل عدد النقاط كرقم صحيح (٠ أو أكثر).' : 'Enter the points as a whole number (0 or more).');
      return null;
    }
    setPointsError('');
    return {
    points,
    registrationMode: value.registrationMode,
    vtoolsUuid: value.vtoolsUuid.trim(),
    hasCertificate: value.hasCertificate,
    certificateTemplateId: value.hasCertificate && value.certificateTemplateId ? value.certificateTemplateId : null,
    emailTemplateId: value.emailTemplateId || null,
    };
  };
  const save = async () => { const fields = collect(); if (fields) await onSave(fields); };
  useEffect(() => { registerCollect?.(collect); });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!value.requiresRegistration && (
          <p className="rounded-xl bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-muted)] sm:col-span-2">
            {isAr ? 'هذه الفعالية لا تتطلب تسجيلًا مسبقًا (يُغيَّر ذلك من مرحلة «البيانات الأساسية والزمان والمكان»).' : 'This event does not require registration (change it in the “Main data, time & place” stage).'}
          </p>
        )}
        {value.requiresRegistration && (
          <label className={label}><span>{isAr ? 'نمط قبول التسجيل' : 'Registration acceptance mode'}</span>
            <select className={input} value={value.registrationMode}
                    onChange={e => set('registrationMode', e.target.value as SettingsFields['registrationMode'])}>
              <option value="Auto">{isAr ? 'تلقائي' : 'Auto'}</option>
              <option value="Manual">{isAr ? 'يدوي (يحتاج موافقة المنظم)' : 'Manual (needs organizer approval)'}</option>
            </select>
          </label>
        )}
      </div>

      <div>
        <label className={label}>
          <span>{isAr ? 'نقاط الفعالية' : 'Event points'}</span>
          <input className={`${input} max-w-xs`} type="number" min={0} step={1} inputMode="numeric" value={value.points}
                 onChange={e => set('points', e.target.value)} />
        </label>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          {isAr ? 'عدد النقاط التي تُضاف إلى رصيد كل طالب يُسجَّل حضوره في هذه الفعالية. اكتب ٠ إن لم تكن للفعالية نقاط.' : 'Points added to each student whose attendance is recorded at this event. Enter 0 for none.'}
        </p>
        {pointsError && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{pointsError}</p>}
      </div>

      <div>
        <label className={label}>
          <span>{isAr ? 'معرف VTools' : 'VTools ID'}</span>
          <input className={`${input} ${highlight === 'vtoolsUuid' ? invalidClass : ''}`} dir="ltr" inputMode="numeric" placeholder="123456" maxLength={20}
                 value={value.vtoolsUuid} onChange={e => set('vtoolsUuid', e.target.value.replace(/\D/g, ''))} />
        </label>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          {isAr
            ? 'اختياري الآن — سيصبح مطلوبًا قبل إظهار الفعالية للعامة.'
            : 'Optional for now — will be required before this event is shown publicly.'}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={value.hasCertificate} onChange={e => set('hasCertificate', e.target.checked)} />
          {isAr ? 'تصدر هذه الفعالية شهادات حضور' : 'This event issues certificates'}
        </label>
        {value.hasCertificate && (
          <label className={label}><span>{isAr ? 'قالب الشهادة' : 'Certificate template'}</span>
            <select className={`${input} ${highlight === 'certificateTemplateId' ? invalidClass : ''}`} value={value.certificateTemplateId}
                    onChange={e => set('certificateTemplateId', e.target.value)}>
              <option value="">{isAr ? 'التصميم الافتراضي' : 'Default design'}</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
            </select>
          </label>
        )}
        {value.hasCertificate && <TemplatePreview isAr={isAr} kind="certificate" templateId={value.certificateTemplateId} eventId={eventId} />}
        {templatesError && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{templatesError}</p>}
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <label className={label}><span>{isAr ? 'قالب البريد الإلكتروني' : 'Email template'}</span>
          <select className={input} value={value.emailTemplateId} onChange={e => set('emailTemplateId', e.target.value)}>
            <option value="">{isAr ? 'بلا قالب' : 'No template'}</option>
            {mailTemplates.map(m => <option key={m.id} value={m.id}>{m.name || m.subject || m.id}</option>)}
          </select>
        </label>
        {!value.emailTemplateId && (
          <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'اختياري: يمكن أن تكون الفعالية بلا بريد إلكتروني.' : 'Optional: an event can go without any email.'}</p>
        )}
        {value.emailTemplateId && <TemplatePreview isAr={isAr} kind="email" templateId={value.emailTemplateId} eventId={eventId} />}
        {mailTemplatesError && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{mailTemplatesError}</p>}
        {value.emailTemplateId && (
          <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]"><Paperclip size={15} />{isAr ? 'مرفقات خاصة بهذه الفعالية' : 'Attachments specific to this event'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'تُضاف إلى مرفقات القالب نفسه عند إرسال بريد هذه الفعالية.' : 'Added on top of the template’s own attachments when sending this event’s email.'}</p>
            {!eventId && <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'احفظ الفعالية أولًا لإضافة مرفقات.' : 'Save the event first to add attachments.'}</p>}
            {eventId && <>
              {eventAttachments.length > 0 && <ul className="space-y-1.5">{eventAttachments.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm">
                  <span className="truncate">{a.title}</span>
                  <button type="button" disabled={attachBusy} aria-label={isAr ? 'حذف' : 'Remove'} onClick={() => void removeEventAttachment(a.id)}><Trash2 size={15} /></button>
                </li>
              ))}</ul>}
              <input className={input} placeholder={isAr ? 'عنوان المرفق (اختياري)' : 'Attachment title (optional)'} value={attachTitle} onChange={e => setAttachTitle(e.target.value)} />
              <input type="file" disabled={attachBusy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void addEventAttachment(file); }} />
            </>}
          </div>
        )}
      </div>

      {!hideSave && <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>}
    </div>
  );
}
