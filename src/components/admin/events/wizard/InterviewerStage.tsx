'use client';

import { Save } from 'lucide-react';
import { input, label, primaryButton, type InterviewerFields } from './wizardTypes';

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
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        {isAr ? 'اختياري -- اتركه فارغًا إن لم تتطلب الفعالية مقابلة شخصية.' : 'Optional — leave blank if this event has no personal interview.'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}><span>{isAr ? 'اسم المحاور (عربي)' : 'Interviewer name (Arabic)'}</span>
          <input className={input} dir="rtl" value={value.interviewer} onChange={e => set('interviewer', e.target.value)} /></label>
        <label className={label}><span>{isAr ? 'Interviewer name (English)' : 'Interviewer name (English)'}</span>
          <input className={input} dir="ltr" value={value.interviewerEn} onChange={e => set('interviewerEn', e.target.value)} /></label>
      </div>
      <label className={label}>
        <span>{isAr ? 'المتحدثون (اختياري -- سطر لكل متحدث)' : 'Speakers (optional — one per line)'}</span>
        <textarea className={input} rows={3} value={value.speakers} onChange={e => set('speakers', e.target.value)} />
      </label>
      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    </div>
  );
}
