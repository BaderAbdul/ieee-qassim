'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { CalendarClock, FileUp, Heart, Loader2, Mail, Paperclip, Search, Send, Trash2, X } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { fileToBase64 } from '@/lib/emailStudio';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { MessageEvent, MessageKind, SentMessage, StaffEntry } from './messageTypes';

type Mode = 'all' | 'roles' | 'users';
type AttachKind = 'none' | 'file' | 'template';
type Hide = 'never' | '1' | '3' | '7' | '14' | 'custom';
interface ApprovedTemplate { id: string; nameAr: string }

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20';
const chip = (on: boolean) => `rounded-xl px-4 py-2 text-xs font-bold transition ${on ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Same text the server prints on the certificate ("16 Oct, 2026", Riyadh time). */
function certificateDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return `${get('day')} ${MONTHS[get('month') - 1]}, ${get('year')}`;
}

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** Super-admin tool: write a thanks/regular message, pick the audience and the visibility window, optionally attach a file or a certificate. */
export default function MessagesComposer() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { showToast } = useToast();

  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [kind, setKind] = useState<MessageKind>('thanks');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('all');
  const [roles, setRoles] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const [showNow, setShowNow] = useState(true);
  const [showAt, setShowAt] = useState(() => localInput(new Date(Date.now() + 60 * 60_000)));
  const [hide, setHide] = useState<Hide>('7');
  const [hideAt, setHideAt] = useState(() => localInput(new Date(Date.now() + 7 * 24 * 60 * 60_000)));

  const [attachKind, setAttachKind] = useState<AttachKind>('none');
  const [file, setFile] = useState<File | null>(null);
  const [eventFilter, setEventFilter] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<SentMessage | null>(null);

  const reload = useCallback(async () => {
    try {
      const [people, messages] = await Promise.all([
        apiGet<{ staff: StaffEntry[] }>('/api/admin/messages/recipients'),
        apiGet<{ messages: SentMessage[] }>('/api/admin/messages'),
      ]);
      setStaff(people.staff); setSent(messages.messages);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر تحميل البيانات.', 'Could not load data.'), 'error'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (attachKind !== 'template' || events.length) return;
    void Promise.all([
      apiGet<{ events: MessageEvent[] }>('/api/admin/messages/events'),
      apiGet<{ templates: ApprovedTemplate[] }>('/api/admin/templates', { scope: 'approved' }),
    ]).then(([eventList, templateList]) => {
      setEvents(eventList.events); setTemplates(templateList.templates);
      if (templateList.templates[0]) setTemplateId(templateList.templates[0].id);
    }).catch(() => showToast(t('تعذر تحميل الفعاليات أو القوالب.', 'Could not load events or templates.'), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachKind]);

  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const person of staff) if (!seen.has(person.role)) seen.set(person.role, (isAr ? person.roleNameAr : person.roleNameEn) || person.role);
    return [...seen.entries()];
  }, [staff, isAr]);
  const visibleStaff = staff.filter(person => !filter.trim() || `${person.name} ${person.englishName ?? ''} ${person.id}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const audienceCount = mode === 'all' ? staff.length : mode === 'roles' ? staff.filter(person => roles.includes(person.role)).length : picked.size;
  const visibleEvents = events.filter(event => !eventFilter.trim() || `${event.title} ${event.titleEn ?? ''}`.toLowerCase().includes(eventFilter.trim().toLowerCase())).slice(0, 80);
  const chosenEvent = events.find(event => event.id === eventId) ?? null;

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const computeWindow = (): { showAt?: string; hideAt?: string } | string => {
    const show = showNow ? new Date() : new Date(showAt);
    if (Number.isNaN(show.getTime())) return t('اختر وقت الظهور.', 'Choose the show time.');
    let hideDate: Date | null = null;
    if (hide === 'custom') hideDate = new Date(hideAt);
    else if (hide !== 'never') hideDate = new Date(show.getTime() + Number(hide) * 24 * 60 * 60_000);
    if (hideDate && Number.isNaN(hideDate.getTime())) return t('اختر وقت الإخفاء.', 'Choose the hide time.');
    if (hideDate && hideDate <= show) return t('وقت الإخفاء يجب أن يكون بعد وقت الظهور.', 'The hide time must be after the show time.');
    return { ...(showNow ? {} : { showAt: show.toISOString() }), ...(hideDate ? { hideAt: hideDate.toISOString() } : {}) };
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const fail = (message: string) => showToast(message, 'error');
    if (!title.trim() || !body.trim()) return fail(t('اكتب العنوان ونص الرسالة.', 'Write a title and a message.'));
    if (mode === 'roles' && roles.length === 0) return fail(t('اختر دورًا واحدًا على الأقل.', 'Choose at least one role.'));
    if (mode === 'users' && picked.size === 0) return fail(t('اختر شخصًا واحدًا على الأقل.', 'Choose at least one person.'));
    const window_ = computeWindow();
    if (typeof window_ === 'string') return fail(window_);
    if (attachKind === 'file' && !file) return fail(t('اختر الملف المرفق.', 'Choose the file to attach.'));
    if (attachKind === 'file' && file && file.size > 10 * 1024 * 1024) return fail(t('الملف أكبر من ١٠ ميجابايت.', 'File exceeds 10 MB.'));
    if (attachKind === 'template' && (!eventId || !templateId)) return fail(t('اختر الفعالية ثم قالب الشهادة.', 'Choose the event, then the certificate template.'));
    setSending(true);
    try {
      let attachment: Record<string, unknown> | undefined;
      if (attachKind === 'file' && file) attachment = { kind: 'file', filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64: await fileToBase64(file) };
      if (attachKind === 'template') attachment = { kind: 'template', eventId, templateId };
      const result = await apiSend<{ recipients: number; withoutEnglishName: string[] }>('POST', '/api/admin/messages', {
        kind, title: title.trim(), body: body.trim(), ...window_,
        audience: mode === 'all' ? { mode } : mode === 'roles' ? { mode, roles } : { mode, userIds: [...picked] },
        ...(attachment ? { attachment } : {}),
      });
      showToast(t(`تم إرسال الرسالة إلى ${result.recipients}.`, `Message sent to ${result.recipients}.`), 'success');
      if (result.withoutEnglishName?.length) {
        showToast(t(`تنبيه: لا يوجد اسم إنجليزي لـ ${result.withoutEnglishName.slice(0, 3).join('، ')}${result.withoutEnglishName.length > 3 ? '…' : ''}؛ سيظهر اسمهم بالعربية في الشهادة.`,
          `Note: no English name for ${result.withoutEnglishName.slice(0, 3).join(', ')}${result.withoutEnglishName.length > 3 ? '…' : ''}; their Arabic name will appear on the certificate.`), 'info');
      }
      setTitle(''); setBody(''); setPicked(new Set()); setRoles([]); setFile(null); setAttachKind('none');
      await reload();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر إرسال الرسالة.', 'Could not send the message.'), 'error'); }
    finally { setSending(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    try { await apiSend('DELETE', `/api/admin/messages/${deleting.id}`); setDeleting(null); await reload(); showToast(t('تم حذف الرسالة.', 'Message deleted.'), 'success'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر الحذف.', 'Could not delete.'), 'error'); }
  };

  const audienceLabel = (message: SentMessage) => message.audience.mode === 'all' ? t('الجميع', 'Everyone')
    : message.audience.mode === 'roles' ? (message.audience.roles ?? []).join(' · ') : t('أشخاص محددون', 'Specific people');
  const stateChip = (message: SentMessage) => ({
    scheduled: { label: t('مجدولة', 'Scheduled'), cls: 'bg-amber-100 text-amber-700' },
    active: { label: t('ظاهرة الآن', 'Visible now'), cls: 'bg-emerald-100 text-emerald-700' },
    ended: { label: t('منتهية', 'Ended'), cls: 'bg-slate-200 text-slate-600' },
  }[message.state]);
  const fmt = (iso: string) => new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-8">
      <form onSubmit={send} className="space-y-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <h2 className="font-cairo text-lg font-black text-[var(--color-text-primary)]">{t('رسالة جديدة', 'New message')}</h2>

        <div className="grid grid-cols-2 gap-3">
          {([['thanks', t('رسالة شكر', 'Thank-you'), Heart], ['regular', t('رسالة عادية', 'Regular'), Mail]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => setKind(value)} aria-pressed={kind === value}
                    className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${kind === value ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>
        {kind === 'thanks' && <p className="text-xs text-[var(--color-text-secondary)]">🎉 {t('تظهر قصاصات ملونة تتساقط من أعلى الشاشة عند فتح رسالة الشكر.', 'Colourful confetti falls from the top of the screen when a thank-you message is opened.')}</p>}

        <label className="block space-y-1"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('العنوان', 'Title')}</span>
          <input className={input} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block space-y-1"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('نص الرسالة', 'Message')}</span>
          <textarea className={`${input} min-h-40 leading-7`} value={body} maxLength={5000} onChange={e => setBody(e.target.value)} /></label>

        <fieldset className="space-y-3">
          <legend className="text-xs font-bold text-[var(--color-text-secondary)]">{t('المستلمون', 'Recipients')}</legend>
          <div className="flex flex-wrap gap-2">
            {([['all', t('جميع الإداريين والأعضاء', 'All staff')], ['roles', t('حسب الدور', 'By role')], ['users', t('أشخاص محددون', 'Specific people')]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={chip(mode === value)}>{label}</button>
            ))}
          </div>
          {mode === 'roles' && (
            <div className="flex flex-wrap gap-2">
              {roleOptions.map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-xs font-bold">
                  <input type="checkbox" checked={roles.includes(key)} onChange={() => setRoles(list => toggle(list, key))} />{label}
                </label>
              ))}
            </div>
          )}
          {mode === 'users' && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input className={`${input} ps-9`} value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('ابحث بالاسم…', 'Search by name…')} />
              </div>
              <ul className="max-h-64 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)]">
                {visibleStaff.map(person => (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--color-surface-2)]">
                      <input type="checkbox" checked={picked.has(person.id)} onChange={() => setPicked(set => { const next = new Set(set); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })} />
                      <span className="min-w-0 flex-1 truncate font-bold">{person.name}</span>
                      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{(isAr ? person.roleNameAr : person.roleNameEn) || person.role}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">{t(`عدد المستلمين المتوقع: ${audienceCount}`, `Expected recipients: ${audienceCount}`)}</p>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl bg-[var(--color-surface-2)] p-4">
          <legend className="flex items-center gap-2 px-1 text-xs font-bold text-[var(--color-text-secondary)]"><CalendarClock size={14} />{t('متى تظهر ومتى تختفي', 'When it shows and when it hides')}</legend>
          <div className="space-y-2">
            <p className="text-xs font-bold">{t('وقت الظهور', 'Shows')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={showNow} onClick={() => setShowNow(true)} className={chip(showNow)}>{t('فورًا', 'Immediately')}</button>
              <button type="button" aria-pressed={!showNow} onClick={() => setShowNow(false)} className={chip(!showNow)}>{t('في وقت محدد', 'At a set time')}</button>
              {!showNow && <input type="datetime-local" className={`${input} !w-auto`} value={showAt} onChange={e => setShowAt(e.target.value)} />}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold">{t('وقت الإخفاء', 'Hides')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {([['1', t('بعد يوم', 'After 1 day')], ['3', t('بعد 3 أيام', 'After 3 days')], ['7', t('بعد أسبوع', 'After 1 week')], ['14', t('بعد أسبوعين', 'After 2 weeks')], ['never', t('لا يُخفى', 'Never')], ['custom', t('وقت محدد', 'At a set time')]] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={hide === value} onClick={() => setHide(value)} className={chip(hide === value)}>{label}</button>
              ))}
              {hide === 'custom' && <input type="datetime-local" className={`${input} !w-auto`} value={hideAt} onChange={e => setHideAt(e.target.value)} />}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl bg-[var(--color-surface-2)] p-4">
          <legend className="flex items-center gap-2 px-1 text-xs font-bold text-[var(--color-text-secondary)]"><Paperclip size={14} />{t('المرفق', 'Attachment')}</legend>
          <div className="flex flex-wrap gap-2">
            {([['none', t('بدون مرفق', 'None')], ['file', t('ملف ثابت', 'Fixed file')], ['template', t('قالب شهادة', 'Certificate template')]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={attachKind === value} onClick={() => setAttachKind(value)} className={chip(attachKind === value)}>{label}</button>
            ))}
          </div>

          {attachKind === 'file' && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><FileUp size={14} />{t('يصل الملف كما هو للجميع (حتى ١٠ ميجابايت).', 'Everyone gets the file as-is (up to 10 MB).')}</p>
              <input type="file" className="block w-full text-xs" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="flex items-center gap-2 text-xs font-bold">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB<button type="button" onClick={() => setFile(null)} aria-label={t('إزالة', 'Remove')}><X size={14} /></button></p>}
            </div>
          )}

          {attachKind === 'template' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-bold"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] text-white">1</span>{t('اختر الفعالية', 'Choose the event')}</p>
                <input className={input} value={eventFilter} onChange={e => setEventFilter(e.target.value)} placeholder={t('ابحث عن فعالية…', 'Search events…')} />
                <ul className="max-h-48 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {visibleEvents.map(event => (
                    <li key={event.id}>
                      <button type="button" onClick={() => setEventId(event.id)} aria-pressed={eventId === event.id}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm ${eventId === event.id ? 'bg-[var(--color-accent-soft)] font-bold text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-2)]'}`}>
                        <span className="min-w-0 truncate">{event.title}</span>
                        <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{certificateDate(event.date)}</span>
                      </button>
                    </li>
                  ))}
                  {visibleEvents.length === 0 && <li className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">{t('لا توجد فعاليات.', 'No events.')}</li>}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-bold"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] text-white">2</span>{t('اختر قالب الشهادة', 'Choose the certificate template')}</p>
                <select className={input} value={templateId} disabled={!eventId} onChange={e => setTemplateId(e.target.value)}>
                  {templates.length === 0 && <option value="">{t('لا توجد قوالب معتمدة', 'No approved templates')}</option>}
                  {templates.map(template => <option key={template.id} value={template.id}>{template.nameAr}</option>)}
                </select>
              </div>
              {chosenEvent && (
                <dl className="grid grid-cols-1 gap-2 rounded-xl border border-dashed border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-3 text-xs sm:grid-cols-2">
                  <div className="sm:col-span-2"><dt className="font-bold text-[var(--color-text-secondary)]">{t('البيانات المستخرجة تلقائيًا من الفعالية', 'Data extracted from the event')}</dt></div>
                  <div><dt className="text-[var(--color-text-muted)]">{t('اسم الفعالية على الشهادة', 'Event name on the certificate')}</dt><dd dir="ltr" className="text-start font-bold">{chosenEvent.titleEn || chosenEvent.title}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">{t('التاريخ', 'Date')}</dt><dd dir="ltr" className="text-start font-bold">{certificateDate(chosenEvent.date)}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">{t('معرّف vTools', 'vTools event ID')}</dt><dd dir="ltr" className={`text-start font-bold ${chosenEvent.vtoolsUuid ? '' : 'text-amber-600'}`}>{chosenEvent.vtoolsUuid || t('غير محفوظ في الفعالية', 'not saved on the event')}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">{t('اسم المستلم وبرقم الشهادة', 'Recipient name & certificate ID')}</dt><dd className="font-bold">{t('يُنشأ لكل شخص تلقائيًا', 'generated per person automatically')}</dd></div>
                </dl>
              )}
            </div>
          )}
        </fieldset>

        <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-60">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{t('إرسال', 'Send')}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-cairo text-lg font-black text-[var(--color-text-primary)]">{t('الرسائل المرسلة', 'Sent messages')}</h2>
        {sent.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">{t('لم ترسل أي رسالة بعد.', 'Nothing sent yet.')}</p> : (
          <ul className="space-y-2">
            {sent.map(message => {
              const chipInfo = stateChip(message);
              return (
                <li key={message.id} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${message.kind === 'thanks' ? 'bg-pink-100 text-pink-600' : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'}`}>
                    {message.kind === 'thanks' ? <Heart size={16} /> : <Mail size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold"><span className="truncate">{message.title}</span>{message.hasAttachment && <Paperclip size={12} />}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chipInfo.cls}`}>{chipInfo.label}</span></p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{audienceLabel(message)} · {t('قرأها', 'Read by')} {message.readCount}/{message.recipients} · {fmt(message.showAt)}{message.hideAt ? ` → ${fmt(message.hideAt)}` : ` → ${t('بلا نهاية', 'no end')}`}</p>
                  </div>
                  <button type="button" onClick={() => setDeleting(message)} aria-label={t('حذف', 'Delete')} className="rounded-lg p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog open={!!deleting} icon={<Trash2 size={22} />} tone="danger" title={t('حذف الرسالة', 'Delete message')}
                     message={t('ستختفي من لدى جميع المستلمين.', 'It disappears for every recipient.')}
                     confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} onConfirm={() => void remove()} onCancel={() => setDeleting(null)} />
    </div>
  );
}
