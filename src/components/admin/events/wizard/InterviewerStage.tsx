'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Save, Search, UserPlus, X } from 'lucide-react';
import { apiGet } from '@/lib/backend';
import { input, label, primaryButton, type InterviewerFields, type OrganizerAccount } from './wizardTypes';

interface InterviewerStageProps {
  isAr: boolean;
  value: InterviewerFields;
  onChange: (next: InterviewerFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function InterviewerStage({ isAr, value, onChange, onSave, saving }: InterviewerStageProps) {
  const set = <K extends keyof InterviewerFields>(key: K, val: InterviewerFields[K]) => onChange({ ...value, [key]: val });
  const save = async () => onSave({
    interviewer: value.interviewer.trim(), interviewerEn: value.interviewerEn.trim(),
    speakers: value.speakers.split('\n').map(s => s.trim()).filter(Boolean),
    speakersEn: value.speakersEn.split('\n').map(s => s.trim()).filter(Boolean),
    organizerIds: value.organizers.map(account => account.id),
  });

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}><span>{isAr ? 'اسم المحاور (عربي)' : 'Interviewer name (Arabic)'}</span>
          <input className={input} dir="rtl" value={value.interviewer} onChange={e => set('interviewer', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'Interviewer name (English)' : 'Interviewer name (English)'}</span>
          <input className={input} dir="ltr" value={value.interviewerEn} onChange={e => set('interviewerEn', e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}><span>{isAr ? 'المتحدثون (عربي -- سطر لكل متحدث)' : 'Speakers (Arabic, one per line)'}</span>
          <textarea className={input} dir="rtl" rows={3} value={value.speakers} onChange={e => set('speakers', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'Speakers (English, one per line)' : 'Speakers (English, one per line)'}</span>
          <textarea className={input} dir="ltr" rows={3} value={value.speakersEn} onChange={e => set('speakersEn', e.target.value)} /></label>
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
      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    </div>
  );
}
