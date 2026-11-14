'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Mail, Plus, Save, Search, UserPlus, X } from 'lucide-react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { input, label, primaryButton, type InterviewerFields, type OrganizerAccount, type SpeakerRow, type StageEmbedProps } from './wizardTypes';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

interface InterviewerStageProps extends StageEmbedProps {
  isAr: boolean;
  value: InterviewerFields;
  /** The saved event: guests can be mailed only once their data is stored. */
  eventId?: number | null;
  onChange: (next: InterviewerFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function InterviewerStage({ isAr, value, eventId, onChange, onSave, saving, hideSave, registerCollect }: InterviewerStageProps) {
  const { showToast } = useToast();
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const set = <K extends keyof InterviewerFields>(key: K, val: InterviewerFields[K]) => onChange({ ...value, [key]: val });
  const collect = (): Record<string, unknown> | null => {
    const rows = value.speakers.filter(row => row.name.trim() || row.nameEn.trim() || row.email.trim());
    const addresses = [value.interviewerEmail, ...rows.map(row => row.email)].map(address => address.trim()).filter(Boolean);
    if (addresses.some(address => !EMAIL.test(address))) {
      setEmailError(isAr ? 'أدخل بريدًا إلكترونيًا صحيحًا للمحاور والمتحدثين (أو اتركه فارغًا).' : 'Enter a valid e-mail for the interviewer and speakers (or leave it empty).');
      return null;
    }
    setEmailError('');
    return {
      interviewer: value.interviewer.trim(), interviewerEn: value.interviewerEn.trim(), interviewerEmail: value.interviewerEmail.trim(),
      speakers: rows.map(row => row.name.trim()), speakersEn: rows.map(row => row.nameEn.trim()),
      speakerEmails: rows.map(row => row.email.trim()),
      organizerIds: value.organizers.map(account => account.id),
    };
  };
  const save = async () => { const fields = collect(); if (fields) await onSave(fields); };
  useEffect(() => { registerCollect?.(collect); });

  // Organizers are picked from the platform's accounts by searching for any part of the name.
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrganizerAccount[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void apiGet<{ accounts: OrganizerAccount[] }>('/api/admin/events/organizer-search', { q: term })
        .then(result => { if (active) setResults(result.accounts); }).catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  const shown = query.trim().length >= 2 ? results : [];
  const chosen = new Set(value.organizers.map(account => account.id));
  const add = (account: OrganizerAccount) => { if (!chosen.has(account.id)) onChange({ ...value, organizers: [...value.organizers, account] }); setQuery(''); setResults([]); };
  const remove = (id: string) => onChange({ ...value, organizers: value.organizers.filter(account => account.id !== id) });
  const setSpeaker = (index: number, patch: Partial<SpeakerRow>) =>
    onChange({ ...value, speakers: value.speakers.map((row, at) => at === index ? { ...row, ...patch } : row) });
  const addSpeaker = () => onChange({ ...value, speakers: [...value.speakers, { name: '', nameEn: '', email: '' }] });
  const removeSpeaker = (index: number) => onChange({ ...value, speakers: value.speakers.filter((_, at) => at !== index) });

  /** Mails the event's e-mail and certificate to every guest with an address, once each. Works on the saved data. */
  const sendNow = async () => {
    if (!eventId || sending) return;
    if (!window.confirm(isAr ? 'سيُرسل بريد الفعالية وشهادتها الآن إلى المحاور والمتحدثين الذين أُدخلت بريداتهم (ولن يُكرَّر الإرسال لمن أُرسل له). المتابعة؟' : 'This sends the event’s e-mail and certificate now to every interviewer/speaker with an address (nobody is mailed twice). Continue?')) return;
    setSending(true); setSendResult('');
    try {
      const { data } = await httpsCallable<{ eventId: number }, { queuedCount: number; alreadySentCount: number }>(null, 'sendEventGuestEmails')({ eventId });
      setSendResult(isAr ? `أُضيف ${data.queuedCount} بريدًا إلى قائمة الإرسال (${data.alreadySentCount} أُرسل سابقًا).` : `${data.queuedCount} e-mail(s) queued (${data.alreadySentCount} already sent before).`);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الإرسال.' : 'Could not send.'), 'error');
    } finally { setSending(false); }
  };
  const move = (index: number, delta: number) => {
    const next = [...value.organizers]; const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; onChange({ ...value, organizers: next });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        {isAr ? 'لإظهار الفعالية للعامة لا بد من محاور أو متحدث واحد على الأقل.' : 'At least one interviewer or speaker is required before the event can be shown publicly.'}
      </p>
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
        <h3 className="font-bold">{isAr ? 'المحاور' : 'Interviewer'}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={label}><span>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</span>
            <input className={input} dir="rtl" value={value.interviewer} onChange={e => set('interviewer', e.target.value)} /></label>
          <label className={label}><span>Name (English)</span>
            <input className={input} dir="ltr" value={value.interviewerEn} onChange={e => set('interviewerEn', e.target.value)} /></label>
          <label className={label}><span>{isAr ? 'البريد الإلكتروني' : 'E-mail'}</span>
            <input className={input} dir="ltr" type="email" inputMode="email" value={value.interviewerEmail} onChange={e => set('interviewerEmail', e.target.value)} placeholder="name@example.com" /></label>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">{isAr ? 'المتحدثون' : 'Speakers'}</h3>
          <button type="button" onClick={addSpeaker} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--color-surface-2)]">
            <Plus size={14} />{isAr ? 'إضافة متحدث' : 'Add speaker'}
          </button>
        </div>
        {value.speakers.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'لم يُضف متحدثون بعد.' : 'No speakers yet.'}</p>}
        {value.speakers.map((row, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-xl bg-[var(--color-surface-2)] p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <label className={label}><span>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</span>
              <input className={input} dir="rtl" value={row.name} onChange={e => setSpeaker(index, { name: e.target.value })} /></label>
            <label className={label}><span>Name (English)</span>
              <input className={input} dir="ltr" value={row.nameEn} onChange={e => setSpeaker(index, { nameEn: e.target.value })} /></label>
            <label className={label}><span>{isAr ? 'البريد الإلكتروني' : 'E-mail'}</span>
              <input className={input} dir="ltr" type="email" inputMode="email" value={row.email} onChange={e => setSpeaker(index, { email: e.target.value })} placeholder="name@example.com" /></label>
            <button type="button" aria-label={isAr ? 'إزالة المتحدث' : 'Remove speaker'} onClick={() => removeSpeaker(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X size={16} /></button>
          </div>
        ))}
        {emailError && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{emailError}</p>}
        <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            {isAr ? 'بريد المحاور والمتحدثين خاص بالإدارة ولا يظهر للعامة. يُستخدم لإرسال بريد الفعالية وشهادتهم فورًا.' : 'Interviewer and speaker e-mails are private to the admins. They receive the event’s e-mail and their certificate immediately.'}
          </p>
          {eventId ? (
            <button type="button" disabled={sending} onClick={() => void sendNow()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] disabled:opacity-50">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {isAr ? 'إرسال البريد والشهادة الآن' : 'Send e-mail & certificate now'}
            </button>
          ) : <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'احفظ الفعالية أولًا لتتمكن من الإرسال.' : 'Save the event first to be able to send.'}</p>}
          {eventId ? <p className="text-[11px] text-[var(--color-text-muted)]">{isAr ? 'يعمل الإرسال على البيانات المحفوظة؛ احفظ التعديلات قبل الضغط. يتطلب قالب بريد أو شهادة من «الإعدادات».' : 'Sending uses the saved data — save your edits first. Needs an e-mail or certificate template chosen in “Settings”.'}</p> : null}
          {sendResult && <p role="status" className="text-xs font-bold text-emerald-600">{sendResult}</p>}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
        <div>
          <h3 className="font-bold">{isAr ? 'المنظمون' : 'Organizers'}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'ابحث عن اسم المنظم بين حسابات المنصة وأضفه. تُستخدم أسماؤهم في متغيرات الشهادات والبريد.' : 'Search the platform accounts by name to add an organizer. Their names feed the certificate and email variables.'}</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input className={`${input} ps-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder={isAr ? 'ابحث بالاسم (حرفان على الأقل)…' : 'Search by name (at least 2 characters)…'} />
          {searching && <Loader2 size={15} className="absolute end-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />}
        </div>
        {shown.length > 0 && (
          <ul className="max-h-56 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)]">
            {shown.map(account => (
              <li key={account.id}>
                <button type="button" disabled={chosen.has(account.id)} onClick={() => add(account)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm hover:bg-[var(--color-surface-2)] disabled:opacity-40">
                  <UserPlus size={15} className="shrink-0 text-[var(--color-accent)]" />
                  <span className="min-w-0 flex-1 truncate font-bold">{account.name}{account.nameEn ? <span dir="ltr" className="ms-2 font-normal text-[var(--color-text-muted)]">{account.nameEn}</span> : null}</span>
                  <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{account.role === 'student' ? (isAr ? 'طالب' : 'Student') : (isAr ? 'إدارة' : 'Staff')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && !searching && shown.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">{isAr ? 'لا توجد حسابات مطابقة.' : 'No matching accounts.'}</p>}
        {value.organizers.length > 0 && (
          <ul className="space-y-2">
            {value.organizers.map((account, index) => (
              <li key={account.id} className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{account.name}{account.nameEn ? <span dir="ltr" className="ms-2 font-normal text-[var(--color-text-muted)]">{account.nameEn}</span> : null}</span>
                <button type="button" aria-label={isAr ? 'تقديم' : 'Move up'} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label={isAr ? 'تأخير' : 'Move down'} disabled={index === value.organizers.length - 1} onClick={() => move(index, 1)} className="rounded p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label={isAr ? 'إزالة' : 'Remove'} onClick={() => remove(account.id)} className="rounded p-1 text-red-500"><X size={14} /></button>
              </li>
            ))}
          </ul>
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
