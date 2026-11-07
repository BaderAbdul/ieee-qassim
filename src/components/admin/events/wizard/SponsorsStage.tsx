'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { button, input, label, primaryButton, type SponsorsFields } from './wizardTypes';

export default function SponsorsStage({ isAr, value, onChange, onSave, saving }: {
  isAr: boolean; value: SponsorsFields; onChange: (value: SponsorsFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>; saving: boolean;
}) {
  return <form className="space-y-5" onSubmit={event => {
    event.preventDefault();
    if (value.hasSponsors === null || saving) return;
    void onSave({ hasSponsors: value.hasSponsors, sponsors: value.hasSponsors ? value.sponsors.map(s => ({ ...s, name: s.name.trim(), email: s.email.trim() })) : [] });
  }}>
    <fieldset disabled={saving} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">{isAr ? 'هل هناك رعاية لهذه الفعالية؟' : 'Is there sponsorship for this event?'}</legend>
        <div className="flex gap-6">{[true, false].map(yes => <label key={String(yes)} className="flex items-center gap-2 text-sm">
          <input required type="radio" name="hasSponsors" checked={value.hasSponsors === yes} onChange={() => onChange({ ...value, hasSponsors: yes, sponsors: yes && !value.sponsors.length ? [{ id: crypto.randomUUID(), name: '', email: '' }] : value.sponsors })} />
          {yes ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
        </label>)}</div>
      </fieldset>
      {value.hasSponsors && <div className="space-y-4">
        {value.sponsors.map((sponsor, index) => <section key={sponsor.id} className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex justify-between items-center"><h3 className="font-bold text-sm">{isAr ? 'الراعي' : 'Sponsor'} {index + 1}</h3>
            <button type="button" className={button} aria-label={isAr ? 'حذف الراعي' : 'Remove sponsor'} disabled={value.sponsors.length === 1} onClick={() => onChange({ ...value, sponsors: value.sponsors.filter(s => s.id !== sponsor.id) })}><Trash2 size={16} /></button></div>
          <label className={label}><span>{isAr ? 'اسم الراعي' : 'Sponsor name'}</span><input required maxLength={200} className={input} value={sponsor.name} onChange={e => onChange({ ...value, sponsors: value.sponsors.map(s => s.id === sponsor.id ? { ...s, name: e.target.value } : s) })} /></label>
          <label className={label}><span>{isAr ? 'البريد الإلكتروني لاستلام الشهادة' : 'Email for certificate delivery'}</span><input required type="email" maxLength={254} dir="ltr" className={input} value={sponsor.email} onChange={e => onChange({ ...value, sponsors: value.sponsors.map(s => s.id === sponsor.id ? { ...s, email: e.target.value } : s) })} /></label>
        </section>)}
        <button type="button" className={button} disabled={value.sponsors.length >= 50} onClick={() => onChange({ ...value, sponsors: [...value.sponsors, { id: crypto.randomUUID(), name: '', email: '' }] })}><Plus size={16} />{isAr ? 'إضافة راعٍ' : 'Add sponsor'}</button>
      </div>}
      <div className="flex justify-end"><button type="submit" disabled={value.hasSponsors === null} className={primaryButton}><Save size={16} />{isAr ? 'حفظ' : 'Save'}</button></div>
    </fieldset>
  </form>;
}
