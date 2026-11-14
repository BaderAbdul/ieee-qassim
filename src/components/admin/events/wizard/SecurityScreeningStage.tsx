'use client';

import { useEffect } from 'react';
import { Download, Save } from 'lucide-react';
import { primaryButton, button, type SecurityFields, type StageEmbedProps } from './wizardTypes';

interface SecurityScreeningStageProps extends StageEmbedProps {
  isAr: boolean;
  value: SecurityFields;
  onChange: (next: SecurityFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function SecurityScreeningStage({ isAr, value, onChange, onSave, saving, hideSave, registerCollect }: SecurityScreeningStageProps) {
  const collect = () => ({ securityFormAcknowledged: value.securityFormAcknowledged });
  const save = async () => onSave(collect());
  useEffect(() => { registerCollect?.(collect); });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? 'نزّل نموذج التصريح الأمني، واحصل على موافقة الجهة الأمنية بالجامعة، ثم أكّد استلام الموافقة أدناه.'
            : 'Download the security-screening form, get it approved by the university’s security office, then confirm the approval below.'}
        </p>
        <a href="/forms/security-screening-form.pdf" download className={button}>
          <Download size={16} />{isAr ? 'تحميل نموذج التصريح الأمني' : 'Download the security-screening form'}
        </a>
      </div>

      <label className="flex items-start gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.securityFormAcknowledged}
          onChange={e => onChange({ securityFormAcknowledged: e.target.checked })}
        />
        {isAr ? 'تم استلام موافقة الجهة الأمنية على هذه الفعالية.' : 'Security approval for this event has been received.'}
      </label>

      {!hideSave && <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ والمتابعة' : 'Save & continue')}
        </button>
      </div>}
    </div>
  );
}
