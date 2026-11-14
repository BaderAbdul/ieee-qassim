'use client';

import { useEffect } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { SocialLink } from '@/lib/types';
import { button, input, label, primaryButton, SOCIAL_PLATFORMS, type ShareFields, type StageEmbedProps } from './wizardTypes';

export default function ShareStage({ isAr, value, onChange, onSave, saving, hideSave, registerCollect }: StageEmbedProps & {
  isAr: boolean; value: ShareFields; onChange: (value: ShareFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>; saving: boolean;
}) {
  const used = new Set(value.socialLinks.map(l => l.platform));
  const nextPlatform = SOCIAL_PLATFORMS.find(p => !used.has(p.id))?.id ?? SOCIAL_PLATFORMS[0].id;
  const update = (index: number, patch: Partial<SocialLink>) =>
    onChange({ socialLinks: value.socialLinks.map((link, i) => i === index ? { ...link, ...patch } : link) });

  const collect = () => ({ socialLinks: value.socialLinks.filter(l => l.url.trim()).map(l => ({ ...l, url: l.url.trim() })) });
  useEffect(() => { registerCollect?.(collect); });
  return <div className="space-y-5">
    <fieldset disabled={saving} className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        {isAr ? 'اختياري بالكامل — أضف روابط منشورات الفعالية على منصات التواصل الاجتماعي إن وُجدت.'
              : 'Entirely optional — add links to this event’s posts on social media, if any exist.'}
      </p>
      {value.socialLinks.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
          {isAr ? 'لم تتم إضافة أي روابط بعد.' : 'No links added yet.'}
        </p>
      )}
      <div className="space-y-3">
        {value.socialLinks.map((link, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 sm:flex-row sm:items-end">
            <label className={`${label} w-full sm:w-44`}>
              <span>{isAr ? 'المنصة' : 'Platform'}</span>
              <select className={input} value={link.platform} onChange={e => update(index, { platform: e.target.value as SocialLink['platform'] })}>
                {SOCIAL_PLATFORMS.map(p => <option key={p.id} value={p.id}>{isAr ? p.labelAr : p.labelEn}</option>)}
              </select>
            </label>
            <label className={`${label} flex-1`}>
              <span>{isAr ? 'رابط المنشور' : 'Post URL'}</span>
              <input dir="ltr" type="url" maxLength={2000} placeholder="https://..." className={input}
                     value={link.url} onChange={e => update(index, { url: e.target.value })} />
            </label>
            <button type="button" className={button} aria-label={isAr ? 'حذف الرابط' : 'Remove link'}
                    onClick={() => onChange({ socialLinks: value.socialLinks.filter((_, i) => i !== index) })}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={button} disabled={value.socialLinks.length >= 20}
              onClick={() => onChange({ socialLinks: [...value.socialLinks, { platform: nextPlatform, url: '' }] })}>
        <Plus size={16} />{isAr ? 'إضافة رابط' : 'Add link'}
      </button>
      {!hideSave && <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void onSave(collect())} className={primaryButton}><Save size={16} />{isAr ? 'حفظ' : 'Save'}</button></div>}
    </fieldset>
  </div>;
}
