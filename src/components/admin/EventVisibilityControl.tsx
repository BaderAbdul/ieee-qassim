'use client';

import { useId } from 'react';
import { useLocale } from 'next-intl';

export default function EventVisibilityControl({ hidden, onChange, disabled = false }: { hidden: boolean; onChange: (hidden: boolean) => void; disabled?: boolean }) {
  const id = useId(); const isAr = useLocale() === 'ar';
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" checked={hidden} disabled={disabled} onChange={event => onChange(event.target.checked)} className="mt-1 size-5 shrink-0 rounded border-slate-300 accent-blue-600" />
      <span><span className="block text-sm font-bold text-slate-900">{isAr ? 'إخفاء من قوائم الفعاليات العامة' : 'Hide from public event lists'}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{isAr ? 'مناسب للتجارب والفعاليات التي تُشارك بالرابط فقط. يبقى الرابط المباشر والتسجيلات والشهادات السابقة متاحة؛ هذا الخيار لا يغيّر صلاحيات الوصول.' : 'For tests and events shared by direct link. The event link, previous registrations and certificates remain available; this setting does not change access permissions.'}</span></span>
    </label>
  </div>;
}
