export type Source = 'student.name' | 'student.gender' | 'event.vtoolsUUID' | 'certificate.UUID' | 'certificate.QR' | 'event.title' | 'event.date' | 'partner.name' | 'conditional' | 'literal';
// Explicit code-owned registry. No fields are inferred from event/user records.
export const fieldGroups: { id: string; ar: string; en: string; fields: { source: Source; ar: string; en: string }[] }[] = [
  { id: 'student', ar: 'الطالب', en: 'Student', fields: [{ source: 'student.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'event', ar: 'الفعالية', en: 'Event', fields: [
    { source: 'event.title', ar: 'الاسم', en: 'Name' }, { source: 'event.date', ar: 'التاريخ', en: 'Date' }, { source: 'event.vtoolsUUID', ar: 'معرّف vTools', en: 'vTools UUID' },
  ] },
  { id: 'partner', ar: 'الراعي', en: 'Partner', fields: [{ source: 'partner.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'others', ar: 'أخرى', en: 'Others', fields: [
    { source: 'literal', ar: 'نص', en: 'Text' }, { source: 'conditional', ar: 'نص شرطي', en: 'Logic text' },
    { source: 'certificate.UUID', ar: 'معرّف الشهادة', en: 'Certificate ID' }, { source: 'certificate.QR', ar: 'رمز QR لمعرّف الشهادة', en: 'Certificate ID QR' },
  ] },
];
// Gender remains a condition/test context and is supported in older saved templates.
export const sources: Source[] = ['student.name', 'student.gender', 'event.title', 'event.date', 'event.vtoolsUUID', 'partner.name', 'certificate.UUID'];
export interface TemplateField {
  id: string; label: string; source: Source; x: number; y: number; fontSize: number;
  align: 'left' | 'center' | 'right'; color: string; bold: boolean;
  value?: string; conditionSource?: Source; rules?: { equals: string; text: string }[]; fallback?: string; qrSize?: number;
}
export interface TemplateDefinition { background: string; width: number; height: number; fields: TemplateField[] }
export interface CertificateTemplate {
  id: string; nameAr: string; status: 'draft' | 'approved'; revision: number;
  createdBy: string; approvedBy?: string; approvedAt?: string; updatedAt?: string; definition: TemplateDefinition;
}
export function fieldText(field: TemplateField, values: Record<string, string>) {
  if (field.source === 'certificate.QR') return values['certificate.UUID'] || '';
  if (field.source === 'conditional') return field.rules?.find(rule => rule.equals === values[field.conditionSource || 'student.gender'])?.text ?? field.fallback ?? '';
  if (field.source === 'literal') return field.value || '';
  return values[field.source] || '';
}
export const arabicTemplateName = (name: string) => /[ء-ي]/u.test(name.trim()) && /^[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s()،؛:!؟.\-]+$/u.test(name.trim()) && name.trim().length <= 120;
export function newField(source: Source): TemplateField {
  return { id: crypto.randomUUID(), label: source === 'conditional' ? 'صيغة المخاطبة' : source, source,
    x: 50, y: 50, fontSize: 24, align: 'center', color: '#172554', bold: false,
    ...(source === 'literal' ? { value: '' } : {}),
    ...(source === 'certificate.QR' ? { qrSize: 80 } : {}),
    ...(source === 'conditional' ? { conditionSource: 'student.gender' as Source, rules: [{ equals: 'male', text: 'الطالب' }, { equals: 'female', text: 'الطالبة' }], fallback: '' } : {}) };
}
