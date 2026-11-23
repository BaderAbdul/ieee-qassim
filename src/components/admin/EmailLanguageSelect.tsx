'use client';

export default function EmailLanguageSelect({ isAr, value, onChange, bilingual = false, title }: {
  isAr: boolean; value: string; onChange: (value: 'ar' | 'en' | 'bilingual') => void;
  bilingual?: boolean; title?: string;
}) {
  return <label className="block space-y-2 text-sm"><span className="font-bold">{title || (isAr ? 'لغة البريد المفضلة' : 'Preferred email language')}</span>
    <select className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5" value={value}
      onChange={event => onChange(event.target.value as 'ar' | 'en' | 'bilingual')}>
      <option value="ar">العربية</option><option value="en">English</option>
      {bilingual && <option value="bilingual">{isAr ? 'ثنائي اللغة' : 'Bilingual'}</option>}
    </select>
  </label>;
}
