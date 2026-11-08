'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiGet } from '@/lib/backend';
import { input, label, primaryButton, type SettingsFields } from './wizardTypes';

interface CertTemplate { id: string; nameAr: string }

interface SettingsStageProps {
  isAr: boolean;
  value: SettingsFields;
  onChange: (next: SettingsFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function SettingsStage({ isAr, value, onChange, onSave, saving }: SettingsStageProps) {
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState('');

  useEffect(() => {
    if (!value.hasCertificate) return;
    let active = true;
    apiGet<{ templates: CertTemplate[] }>('/api/admin/templates', { scope: 'approved' })
      .then(result => { if (active) setTemplates(result.templates); })
      .catch(error => { if (active) setTemplatesError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل قوالب الشهادات.' : 'Could not load certificate templates.')); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.hasCertificate]);

  const set = <K extends keyof SettingsFields>(key: K, val: SettingsFields[K]) => onChange({ ...value, [key]: val });

  const save = async () => onSave({
    requiresRegistration: value.requiresRegistration,
    registrationMode: value.registrationMode,
    vtoolsUuid: value.vtoolsUuid.trim(),
    hasCertificate: value.hasCertificate,
    certificateTemplateId: value.hasCertificate && value.certificateTemplateId ? value.certificateTemplateId : null,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
          <input type="checkbox" className="mt-0.5" checked={value.requiresRegistration}
                 onChange={e => set('requiresRegistration', e.target.checked)} />
          {isAr ? 'تتطلب الفعالية تسجيلًا مسبقًا' : 'This event requires registration'}
        </label>
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
          <span>{isAr ? 'معرف VTools' : 'VTools ID'}</span>
          <input className={input} dir="ltr" inputMode="numeric" placeholder="123456" maxLength={20}
                 value={value.vtoolsUuid} onChange={e => set('vtoolsUuid', e.target.value.replace(/\D/g, ''))} />
        </label>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          {isAr
            ? 'اختياري الآن — سيصبح مطلوبًا قبل نشر الفعالية خارج المسودة.'
            : 'Optional for now — will be required before this event leaves Draft.'}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={value.hasCertificate} onChange={e => set('hasCertificate', e.target.checked)} />
          {isAr ? 'تصدر هذه الفعالية شهادات حضور' : 'This event issues certificates'}
        </label>
        {value.hasCertificate && (
          <label className={label}><span>{isAr ? 'قالب الشهادة' : 'Certificate template'}</span>
            <select className={input} value={value.certificateTemplateId}
                    onChange={e => set('certificateTemplateId', e.target.value)}>
              <option value="">{isAr ? 'التصميم الافتراضي' : 'Default design'}</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
            </select>
          </label>
        )}
        {templatesError && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{templatesError}</p>}
      </div>

      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 opacity-60">
        <p className="text-sm font-bold text-[var(--color-text-muted)]">{isAr ? 'متغيرات قالب البريد الإلكتروني' : 'Email-template variables'}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{isAr ? 'قريبًا.' : 'Coming soon.'}</p>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    </div>
  );
}
