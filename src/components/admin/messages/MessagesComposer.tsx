'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Heart, Loader2, Mail, Paperclip, Search, Send, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { MessageKind, SentMessage, StaffEntry } from './messageTypes';

type Mode = 'all' | 'roles' | 'users';
interface ApprovedTemplate { id: string; nameAr: string }

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20';

/** Super-admin tool: write a thanks/regular message, choose the audience, optionally attach a certificate template. */
export default function MessagesComposer() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { showToast } = useToast();

  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [kind, setKind] = useState<MessageKind>('thanks');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('all');
  const [roles, setRoles] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [withAttachment, setWithAttachment] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [vtoolsId, setVtoolsId] = useState('');
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
    if (!withAttachment || templates.length) return;
    void apiGet<{ templates: ApprovedTemplate[] }>('/api/admin/templates', { scope: 'approved' })
      .then(result => { setTemplates(result.templates); if (result.templates[0]) setTemplateId(result.templates[0].id); })
      .catch(() => showToast(t('تعذر تحميل قوالب الشهادات.', 'Could not load certificate templates.'), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withAttachment]);

  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const person of staff) if (!seen.has(person.role)) seen.set(person.role, (isAr ? person.roleNameAr : person.roleNameEn) || person.role);
    return [...seen.entries()];
  }, [staff, isAr]);
  const visibleStaff = staff.filter(person => !filter.trim() || `${person.name} ${person.englishName ?? ''} ${person.id}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const audienceCount = mode === 'all' ? staff.length : mode === 'roles' ? staff.filter(person => roles.includes(person.role)).length : picked.size;

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) { showToast(t('اكتب العنوان ونص الرسالة.', 'Write a title and a message.'), 'error'); return; }
    if (mode === 'roles' && roles.length === 0) { showToast(t('اختر دورًا واحدًا على الأقل.', 'Choose at least one role.'), 'error'); return; }
    if (mode === 'users' && picked.size === 0) { showToast(t('اختر شخصًا واحدًا على الأقل.', 'Choose at least one person.'), 'error'); return; }
    if (withAttachment && !templateId) { showToast(t('اختر قالب الشهادة المرفق.', 'Choose the certificate template to attach.'), 'error'); return; }
    setSending(true);
    try {
      const result = await apiSend<{ recipients: number; withoutEnglishName: string[] }>('POST', '/api/admin/messages', {
        kind, title: title.trim(), body: body.trim(),
        audience: mode === 'all' ? { mode } : mode === 'roles' ? { mode, roles } : { mode, userIds: [...picked] },
        ...(withAttachment ? { attachment: { templateId, eventName: eventName.trim(), eventDate: eventDate.trim(), vtoolsId: vtoolsId.trim() } } : {}),
      });
      showToast(t(`تم إرسال الرسالة إلى ${result.recipients}.`, `Message sent to ${result.recipients}.`), 'success');
      if (result.withoutEnglishName?.length) {
        showToast(t(`تنبيه: لا يوجد اسم إنجليزي لـ ${result.withoutEnglishName.slice(0, 3).join('، ')}${result.withoutEnglishName.length > 3 ? '…' : ''}؛ سيظهر اسمهم بالعربية في الشهادة.`,
          `Note: no English name for ${result.withoutEnglishName.slice(0, 3).join(', ')}${result.withoutEnglishName.length > 3 ? '…' : ''}; their Arabic name will appear on the certificate.`), 'info');
      }
      setTitle(''); setBody(''); setPicked(new Set()); setRoles([]);
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

  return (
    <div className="space-y-8">
      <form onSubmit={send} className="space-y-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
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
              <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value}
                      className={`rounded-xl px-4 py-2 text-xs font-bold ${mode === value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>{label}</button>
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

        <fieldset className="space-y-3 rounded-2xl bg-[var(--color-surface-2)] p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={withAttachment} onChange={e => setWithAttachment(e.target.checked)} />
            <Paperclip size={14} />{t('إرفاق شهادة شكر (من قالب)', 'Attach a certificate (from a template)')}
          </label>
          {withAttachment && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('القالب المعتمد', 'Approved template')}</span>
                <select className={input} value={templateId} onChange={e => setTemplateId(e.target.value)}>
                  {templates.length === 0 && <option value="">{t('لا توجد قوالب معتمدة', 'No approved templates')}</option>}
                  {templates.map(template => <option key={template.id} value={template.id}>{template.nameAr}</option>)}
                </select></label>
              <label className="block space-y-1 sm:col-span-2"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('نص الفعالية في الشهادة', 'Event text on the certificate')}</span>
                <input dir="ltr" className={input} value={eventName} maxLength={150} onChange={e => setEventName(e.target.value)} placeholder="IEEE Day Event as an Organizer" /></label>
              <label className="block space-y-1"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('تاريخ الفعالية', 'Event date')}</span>
                <input dir="ltr" className={input} value={eventDate} maxLength={40} onChange={e => setEventDate(e.target.value)} placeholder="October 16, 2026" /></label>
              <label className="block space-y-1"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{t('معرّف vTools', 'vTools event ID')}</span>
                <input dir="ltr" className={input} value={vtoolsId} maxLength={40} onChange={e => setVtoolsId(e.target.value)} placeholder="586831" /></label>
              <p className="text-xs text-[var(--color-text-muted)] sm:col-span-2">{t('يحصل كل مستلم على شهادته الخاصة باسمه الإنجليزي.', 'Each recipient gets their own certificate with their English name.')}</p>
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
            {sent.map(message => (
              <li key={message.id} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${message.kind === 'thanks' ? 'bg-pink-100 text-pink-600' : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'}`}>
                  {message.kind === 'thanks' ? <Heart size={16} /> : <Mail size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold">{message.title}{message.hasAttachment && <Paperclip size={12} />}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{audienceLabel(message)} · {t('قرأها', 'Read by')} {message.readCount}/{message.recipients} · {new Date(message.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
                <button type="button" onClick={() => setDeleting(message)} aria-label={t('حذف', 'Delete')} className="rounded-lg p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog open={!!deleting} icon={<Trash2 size={22} />} tone="danger" title={t('حذف الرسالة', 'Delete message')}
                     message={t('ستختفي من صناديق الوارد لدى جميع المستلمين.', 'It disappears from every recipient’s inbox.')}
                     confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} onConfirm={() => void remove()} onCancel={() => setDeleting(null)} />
    </div>
  );
}
