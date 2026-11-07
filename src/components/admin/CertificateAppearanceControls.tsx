'use client';

import { qrGeometry, type TemplateField } from '@/lib/certificateTemplates';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
export default function CertificateAppearanceControls({ field, isAr, onChange }: {
  field: TemplateField; isAr: boolean; onChange: (patch: Partial<TemplateField>) => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  if (field.source !== 'certificate.QR') return <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.maxWidth !== undefined} onChange={e => onChange({ maxWidth: e.target.checked ? 60 : undefined })} />{t('تحديد أقصى عرض للنص', 'Limit text width')}</label>
    {field.maxWidth !== undefined && <label className="block space-y-1 text-sm"><span>{t('أقصى عرض (% من الشهادة)', 'Maximum width (% of certificate)')}</span><input className={input} type="number" min={1} max={100} step={.5} value={field.maxWidth} onChange={e => { const value = Number(e.target.value); if (value >= 1 && value <= 100) onChange({ maxWidth: value }); }} /></label>}
    <label className="block space-y-1 text-sm"><span>{t('اتجاه قراءة النص', 'Text reading direction')}</span><select className={input} value={field.direction ?? 'auto'} onChange={e => onChange({ direction: e.target.value as TemplateField['direction'] })}>
      <option value="auto">{t('تلقائي', 'Automatic')}</option><option value="ltr">{t('من اليسار لليمين (LTR)', 'Left to right (LTR)')}</option><option value="rtl">{t('من اليمين لليسار (RTL)', 'Right to left (RTL)')}</option>
    </select></label>
    <p className="text-xs text-[var(--color-text-muted)]">{t('الموضع هو نقطة الارتكاز. النص المتمركز يتوسع بالتساوي حولها؛ اليسار يثبت بداية المساحة واليمين يثبت نهايتها. يُصغّر الخط عند تجاوز أقصى عرض.', 'The position is the anchor. Centered text grows equally around it; left anchors the left edge and right anchors the right edge. Text shrinks when it exceeds the maximum width.')}</p>
  </div>;
  return <div className="space-y-3 text-sm">
    {([
      ['qrForeground', 'لون الرمز', 'QR foreground', '#000000'],
      ['qrBackground', 'لون الخلفية', 'Background color', '#ffffff'],
      ['qrBorderColor', 'لون الإطار', 'Border color', '#000000'],
    ] as const).map(([key, ar, en, fallback]) => <label key={key} className="flex items-center justify-between gap-2"><span>{t(ar, en)}</span><input type="color" value={field[key] ?? fallback} onChange={e => onChange({ [key]: e.target.value })} /></label>)}
    <label className="flex items-center gap-2"><input type="checkbox" checked={(field.qrBackgroundOpacity ?? 1) === 0} onChange={e => onChange({ qrBackgroundOpacity: e.target.checked ? 0 : 1 })} />{t('خلفية شفافة', 'Transparent background')}</label>
    <label className="block space-y-1"><span>{t('عتامة الخلفية', 'Background opacity')} {Math.round((field.qrBackgroundOpacity ?? 1) * 100)}%</span><input aria-label={t('عتامة الخلفية', 'Background opacity')} type="range" className="w-full" min={0} max={1} step={.05} value={field.qrBackgroundOpacity ?? 1} onChange={e => onChange({ qrBackgroundOpacity: Number(e.target.value) })} /></label>
    <label className="block space-y-1"><span>{t('شكل الإطار', 'Frame shape')}</span><select className={input} value={field.qrShape ?? 'square'} onChange={e => onChange({ qrShape: e.target.value as TemplateField['qrShape'] })}>
      <option value="square">{t('مربع', 'Square')}</option><option value="rounded">{t('زوايا مستديرة', 'Rounded corners')}</option><option value="circle">{t('دائرة', 'Circle')}</option>
    </select></label>
    {([['qrBorderWidth', 'سُمك الإطار (نقطة)', 'Border width (points)', 8], ['qrPadding', 'المسافة الداخلية (نقطة)', 'Padding (points)', 24]] as const).map(([key, ar, en, max]) => <label key={key} className="block space-y-1"><span>{t(ar, en)}</span><input className={input} type="number" min={0} max={max} step={.5} value={field[key] ?? 0} onChange={e => { const value = Number(e.target.value); if (value >= 0 && value <= max) onChange({ [key]: value }); }} /></label>)}
    <label className="block space-y-1"><span>{t('تصحيح أخطاء QR', 'QR error correction')}</span><select className={input} value={field.qrLevel ?? 'M'} onChange={e => onChange({ qrLevel: e.target.value as TemplateField['qrLevel'] })}>{['L', 'M', 'Q', 'H'].map(level => <option key={level}>{level}</option>)}</select></label>
    {qrGeometry(field).inner < 12 && <p role="alert" className="text-red-600">{t('كبّر الرمز أو قلّل الإطار والمسافة الداخلية.', 'Increase QR size or reduce border and padding.')}</p>}
    <p className="text-xs text-[var(--color-text-muted)]">{t('يبقى الرمز مربعًا داخل الإطار مع مسافة QR الآمنة. جرّب مسح ملف PDF بعد تغيير الألوان أو الشفافية.', 'The code stays square inside the frame with its QR quiet zone. Test-scan the PDF after changing colors or transparency.')}</p>
  </div>;
}
