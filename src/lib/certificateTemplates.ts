export type Source = 'student.name' | 'student.gender' | 'event.vtoolsUUID' | 'certificate.UUID' | 'event.title' | 'conditional' | 'literal';
export const sources: Source[] = ['student.name', 'event.vtoolsUUID', 'certificate.UUID', 'event.title', 'student.gender'];
export interface TemplateField {
  id: string; label: string; source: Source; x: number; y: number; fontSize: number;
  align: 'left' | 'center' | 'right'; color: string; bold: boolean;
  value?: string; conditionSource?: Source; rules?: { equals: string; text: string }[]; fallback?: string;
}
export interface TemplateDefinition { background: string; width: number; height: number; fields: TemplateField[] }
export interface CertificateTemplate {
  id: string; nameAr: string; status: 'draft' | 'approved'; revision: number;
  createdBy: string; approvedBy?: string; approvedAt?: string; updatedAt?: string; definition: TemplateDefinition;
}
export function fieldText(field: TemplateField, values: Record<string, string>) {
  if (field.source === 'conditional') return field.rules?.find(rule => rule.equals === values[field.conditionSource || 'student.gender'])?.text ?? field.fallback ?? '';
  if (field.source === 'literal') return field.value || '';
  return values[field.source] || '';
}
export const arabicTemplateName = (name: string) => /[ء-ي]/u.test(name.trim()) && /^[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s()،؛:!؟.\-]+$/u.test(name.trim()) && name.trim().length <= 120;
export function newField(source: Source): TemplateField {
  return { id: crypto.randomUUID(), label: source === 'conditional' ? 'صيغة المخاطبة' : source, source,
    x: 50, y: 50, fontSize: 24, align: 'center', color: '#172554', bold: false,
    ...(source === 'literal' ? { value: '' } : {}),
    ...(source === 'conditional' ? { conditionSource: 'student.gender' as Source, rules: [{ equals: 'male', text: 'الطالب' }, { equals: 'female', text: 'الطالبة' }], fallback: '' } : {}) };
}
