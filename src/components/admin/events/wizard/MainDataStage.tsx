'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import type { EventType } from '@/lib/types';
import { input, label, primaryButton, type MainDataFields } from './wizardTypes';

const TYPES: EventType[] = ['Workshop', 'Camp', 'Lecture', 'Competition', 'Meetup', 'Challenge', 'Booth', 'Other'];
const TYPE_LABELS: Record<EventType, [string, string]> = {
  Workshop: ['ورشة عمل', 'Workshop'], Camp: ['معسكر', 'Camp'], Lecture: ['محاضرة', 'Lecture'],
  Competition: ['مسابقة', 'Competition'], Meetup: ['لقاء', 'Meetup'], Challenge: ['تحدي', 'Challenge'],
  Booth: ['بوث / زيارة جناح', 'Booth / Visit'], Other: ['أخرى', 'Other'],
};

interface MainDataStageProps {
  isAr: boolean;
  value: MainDataFields;
  onChange: (next: MainDataFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  /** Field name to outline in red, deep-linked from the events list's readiness badge. */
  highlightField?: string;
}

const invalidClass = 'border-2 border-[var(--color-danger)]';

export default function MainDataStage({ isAr, value, onChange, onSave, saving, highlightField }: MainDataStageProps) {
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(highlightField);
  const set = <K extends keyof MainDataFields>(key: K, val: MainDataFields[K]) => {
    if (highlight === key) setHighlight(undefined);
    onChange({ ...value, [key]: val });
  };

  const save = async () => {
    if (!value.title.trim() || !value.titleEn.trim() || !value.description.trim() || !value.descriptionEn.trim()) {
      setError(isAr ? 'أكمل العنوان والوصف بالعربية والإنجليزية.' : 'Complete the title and description in both languages.');
      return;
    }
    setError('');
    await onSave({
      title: value.title.trim(), titleEn: value.titleEn.trim(),
      description: value.description.trim(), descriptionEn: value.descriptionEn.trim(),
      type: value.type,
      gains: value.gains.split('\n').map(g => g.trim()).filter(Boolean),
      gainsEn: value.gainsEn.split('\n').map(g => g.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}><span>{isAr ? 'عنوان الفعالية (عربي)' : 'Title (Arabic)'}</span>
          <input className={`${input} ${highlight === 'title' ? invalidClass : ''}`} dir="rtl" value={value.title} onChange={e => set('title', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'Event title (English)' : 'Event title (English)'}</span>
          <input className={input} dir="ltr" value={value.titleEn} onChange={e => set('titleEn', e.target.value)} /></label>
        <label className={`${label} sm:col-span-2`}><span>{isAr ? 'الوصف (عربي)' : 'Description (Arabic)'}</span>
          <textarea className={`${input} ${highlight === 'description' ? invalidClass : ''}`} dir="rtl" rows={3} value={value.description} onChange={e => set('description', e.target.value)} /></label>
        <label className={`${label} sm:col-span-2`}><span>{isAr ? 'الوصف (إنجليزي)' : 'Description (English)'}</span>
          <textarea className={input} dir="ltr" rows={3} value={value.descriptionEn} onChange={e => set('descriptionEn', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'نوع الفعالية' : 'Event type'}</span>
          <select className={input} value={value.type} onChange={e => set('type', e.target.value as EventType)}>
            {TYPES.map(t => <option key={t} value={t}>{isAr ? TYPE_LABELS[t][0] : TYPE_LABELS[t][1]}</option>)}
          </select></label>
        <label className={label}><span>{isAr ? 'المكتسبات (عربي - سطر لكل نقطة)' : 'Gains (Arabic, one per line)'}</span>
          <textarea className={input} dir="rtl" rows={3} value={value.gains} onChange={e => set('gains', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'Gains (English, one per line)' : 'Gains (English, one per line)'}</span>
          <textarea className={input} dir="ltr" rows={3} value={value.gainsEn} onChange={e => set('gainsEn', e.target.value)} /></label>
      </div>
      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ والمتابعة' : 'Save & continue')}
        </button>
      </div>
    </div>
  );
}
