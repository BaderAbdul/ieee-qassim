'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { parseRiyadhInput } from '@/lib/dateUtils';
import type { EventDay, EventGender, EventLocationType } from '@/lib/types';
import { input, label, primaryButton, button, type StageEmbedProps, type TimePlaceFields } from './wizardTypes';

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

interface TimePlaceStageProps extends StageEmbedProps {
  isAr: boolean;
  value: TimePlaceFields;
  onChange: (next: TimePlaceFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  /** Field name to outline in red, deep-linked from the events list's readiness badge. */
  highlightField?: string;
}

const invalidClass = 'border-2 border-[var(--color-danger)]';

export default function TimePlaceStage({ isAr, value, onChange, onSave, saving, highlightField, hideSave, registerCollect }: TimePlaceStageProps) {
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(highlightField);
  const set = <K extends keyof TimePlaceFields>(key: K, val: TimePlaceFields[K]) => {
    if (highlight === key) setHighlight(undefined);
    onChange({ ...value, [key]: val });
  };

  const addDay = () => {
    if (value.days.length >= 30) return;
    onChange({ ...value, days: [...value.days, { date: '', startTime: '09:00', endTime: '17:00' }] });
  };
  const removeDay = (index: number) => onChange({ ...value, days: value.days.filter((_, i) => i !== index) });
  const patchDay = (index: number, patch: Partial<EventDay>) =>
    onChange({ ...value, days: value.days.map((d, i) => i === index ? { ...d, ...patch } : d) });

  const collect = (): Record<string, unknown> | null => {
    if (!value.days.length) {
      setError(isAr ? 'أضف يومًا واحدًا على الأقل.' : 'Add at least one day.');
      return null;
    }
    if (value.locationType === 'in_person' && (!value.location.trim() || !value.locationEn.trim())) {
      setError(isAr ? 'أكمل المكان بالعربية والإنجليزية.' : 'Complete the location in both languages.');
      return null;
    }
    let earliest: Date | null = null;
    let totalHours = 0;
    for (const day of value.days) {
      if (!day.date || !day.startTime || !day.endTime || day.endTime <= day.startTime) {
        setError(isAr ? 'تأكد من صحة تواريخ وأوقات الأيام (وقت النهاية بعد البداية).' : 'Check every day’s date and times (end must be after start).');
        return null;
      }
      let start: Date;
      try { start = parseRiyadhInput(day.date, day.startTime); } catch { setError(isAr ? 'تاريخ غير صالح.' : 'Invalid date.'); return null; }
      if (!earliest || start < earliest) earliest = start;
      totalHours += (minutes(day.endTime) - minutes(day.startTime)) / 60;
    }
    if (!(totalHours > 0 && totalHours <= 500)) {
      setError(isAr ? 'إجمالي ساعات غير صالح.' : 'Invalid total hours.');
      return null;
    }
    if (!value.isUnlimitedCapacity && (!Number.isFinite(value.capacity) || value.capacity <= 0)) {
      setError(isAr ? 'عدد مقاعد غير صالح.' : 'Invalid seat count.');
      return null;
    }
    setError('');
    const online = value.locationType === 'online';
    // The current API still validates the legacy location/capacity fields before it considers
    // locationType or isUnlimitedCapacity. Keep those compatibility fields valid so an online
    // or open-registration event can leave Draft; public UI continues to use the explicit flags.
    const capacity = value.isUnlimitedCapacity ? Math.max(1, value.capacity || 1) : value.capacity;
    return {
      days: value.days, date: earliest!.toISOString(), durationHours: Math.round(totalHours * 100) / 100,
      locationType: value.locationType,
      location: online ? 'عن بُعد' : value.location.trim(), locationEn: online ? 'Online' : value.locationEn.trim(),
      capacity,
      isUnlimitedCapacity: value.isUnlimitedCapacity, hideExactCapacity: value.hideExactCapacity,
      gender: value.gender,
    };
  };
  const save = async () => { const fields = collect(); if (fields) await onSave(fields); };
  useEffect(() => { registerCollect?.(collect); });

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{error}</p>}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--color-text-secondary)]">{isAr ? 'أيام الفعالية' : 'Event days'}</span>
          <button type="button" onClick={addDay} className={button}><Plus size={15} />{isAr ? 'إضافة يوم' : 'Add day'}</button>
        </div>
        {!value.days.length && <p className="text-sm text-[var(--color-text-muted)]">{isAr ? 'لم تتم إضافة أي يوم بعد.' : 'No days added yet.'}</p>}
        {value.days.map((day, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <label className={label}><span>{isAr ? 'التاريخ' : 'Date'}</span>
              <input type="date" className={input} value={day.date} onChange={e => patchDay(index, { date: e.target.value })} /></label>
            <label className={label}><span>{isAr ? 'البداية' : 'Start'}</span>
              <input type="time" className={input} value={day.startTime} onChange={e => patchDay(index, { startTime: e.target.value })} /></label>
            <label className={label}><span>{isAr ? 'النهاية' : 'End'}</span>
              <input type="time" className={input} value={day.endTime} onChange={e => patchDay(index, { endTime: e.target.value })} /></label>
            <button type="button" onClick={() => removeDay(index)} className="rounded-xl p-2.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]" aria-label={isAr ? 'حذف اليوم' : 'Remove day'}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-bold text-[var(--color-text-secondary)]">{isAr ? 'طريقة الحضور' : 'Attendance format'}</span>
        <div className="flex gap-3">
          {(['in_person', 'online'] as EventLocationType[]).map(opt => (
            <label key={opt} className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold cursor-pointer"
              style={{
                borderColor: value.locationType === opt ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: value.locationType === opt ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                color: value.locationType === opt ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}>
              <input type="radio" name="locationType" className="hidden" checked={value.locationType === opt}
                onChange={() => set('locationType', opt)} />
              {opt === 'in_person' ? (isAr ? 'حضوري' : 'In person') : (isAr ? 'عن بُعد' : 'Online')}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {value.locationType === 'in_person' && (
          <>
            <label className={label}><span>{isAr ? 'المكان (عربي)' : 'Location (Arabic)'}</span>
              <input className={`${input} ${highlight === 'location' ? invalidClass : ''}`} dir="rtl" value={value.location} onChange={e => set('location', e.target.value)} /></label>
            <label className={label}><span>{isAr ? 'Location (English)' : 'Location (English)'}</span>
              <input className={input} dir="ltr" value={value.locationEn} onChange={e => set('locationEn', e.target.value)} /></label>
          </>
        )}

        <label className={label}>
          <span>{value.locationType === 'online' ? (isAr ? 'المستهدف من الحضور' : 'Attendance goal') : (isAr ? 'عدد المقاعد' : 'Seat count')}</span>
          <input type="number" min={1} disabled={value.isUnlimitedCapacity} placeholder={value.isUnlimitedCapacity ? (isAr ? 'بلا حد أقصى' : 'No limit') : undefined}
            className={`${input} disabled:cursor-not-allowed disabled:opacity-50 ${highlight === 'capacity' ? invalidClass : ''}`}
            value={value.isUnlimitedCapacity ? '' : value.capacity}
            onChange={e => set('capacity', Number(e.target.value))} /></label>
        <label className={label}><span>{isAr ? 'الفئة المستهدفة' : 'Gender'}</span>
          <select className={input} value={value.gender} onChange={e => set('gender', e.target.value as EventGender)}>
            <option value="both">{isAr ? 'الجميع' : 'Everyone'}</option>
            <option value="male">{isAr ? 'رجال' : 'Male'}</option>
            <option value="female">{isAr ? 'نساء' : 'Female'}</option>
          </select></label>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={value.isUnlimitedCapacity} onChange={e => set('isUnlimitedCapacity', e.target.checked)} />
            {isAr ? 'تسجيل مفتوح (بدون حد أقصى)' : 'Open registration (no seat limit)'}
          </label>
          {!value.isUnlimitedCapacity && (
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={value.hideExactCapacity} onChange={e => set('hideExactCapacity', e.target.checked)} />
              {isAr ? 'إخفاء السعة الدقيقة عن العامة' : 'Hide the exact seat count from the public'}
            </label>
          )}
        </div>
      </div>

      {!hideSave && <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ والمتابعة' : 'Save & continue')}
        </button>
      </div>}
    </div>
  );
}
