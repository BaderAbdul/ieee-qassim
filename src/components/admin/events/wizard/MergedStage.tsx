'use client';

import { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { primaryButton, type Collect } from './wizardTypes';

export interface MergedPart {
  id: string;
  title: string;
  hint?: string;
  /** Renders the part; it calls `register(collect)` so the merged stage can read its validated fields on Save. */
  render: (register: (collect: Collect) => void) => ReactNode;
}

/**
 * Several former stages shown as sections of one stage with a single Save: every section validates itself,
 * and only when all of them pass are the fields saved together in one request.
 */
export default function MergedStage({ isAr, parts, onSave, saving, saveLabel }: {
  isAr: boolean;
  parts: MergedPart[];
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  saveLabel?: string;
}) {
  const [collectors] = useState(() => new Map<string, Collect>());

  const save = async () => {
    const merged: Record<string, unknown> = {};
    let failed = false;
    for (const part of parts) {
      const collect = collectors.get(part.id);
      if (!collect) continue;
      const fields = collect();
      if (fields === null) { failed = true; continue; }   // that section is showing its own error; keep checking the rest
      Object.assign(merged, fields);
    }
    if (!failed) await onSave(merged);
  };

  return (
    <div className="space-y-8">
      {parts.map((part, index) => (
        <section key={part.id} className="space-y-4">
          <header className="border-b border-[var(--color-border)] pb-2">
            <h3 className="font-cairo text-lg font-black text-[var(--color-text-primary)]">{parts.length > 1 ? `${index + 1}. ` : ''}{part.title}</h3>
            {part.hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{part.hint}</p>}
          </header>
          {part.render(collect => { collectors.set(part.id, collect); })}
        </section>
      ))}
      <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
        <button type="button" disabled={saving} onClick={() => void save()} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (saveLabel ?? (isAr ? 'حفظ والمتابعة' : 'Save & continue'))}
        </button>
      </div>
    </div>
  );
}
