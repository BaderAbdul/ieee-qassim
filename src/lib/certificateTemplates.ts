export type Source = 'student.name' | 'student.gender' | 'event.vtoolsUUID' | 'certificate.UUID' | 'certificate.QR' | 'event.name' | 'event.title' | 'event.date' | 'event.speakers' | 'event.speakers.ar' | 'event.speaker' | 'event.speaker.ar' | 'event.interviewer' | 'event.interviewer.ar' | 'event.organizers' | 'event.organizers.ar' | 'event.organizer' | 'event.organizer.ar' | 'partner.name' | 'conditional' | 'literal';
// Explicit code-owned registry. No fields are inferred from event/user records.
export const fieldGroups: { id: string; ar: string; en: string; fields: { source: Source; ar: string; en: string }[] }[] = [
  { id: 'student', ar: 'الطالب', en: 'Student', fields: [{ source: 'student.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'event', ar: 'الفعالية', en: 'Event', fields: [
    { source: 'event.name', ar: 'الاسم', en: 'Name' }, { source: 'event.date', ar: 'التاريخ', en: 'Date' }, { source: 'event.vtoolsUUID', ar: 'معرّف vTools', en: 'vTools UUID' },
    { source: 'event.speakers', ar: 'المتحدثون (إنجليزي)', en: 'Speakers (English)' }, { source: 'event.speakers.ar', ar: 'المتحدثون (عربي)', en: 'Speakers (Arabic)' },
    { source: 'event.speaker', ar: 'المتحدث الأول (إنجليزي)', en: 'First speaker (English)' }, { source: 'event.speaker.ar', ar: 'المتحدث الأول (عربي)', en: 'First speaker (Arabic)' },
    { source: 'event.interviewer', ar: 'المحاور (إنجليزي)', en: 'Interviewer (English)' }, { source: 'event.interviewer.ar', ar: 'المحاور (عربي)', en: 'Interviewer (Arabic)' },
    { source: 'event.organizers', ar: 'المنظمون (إنجليزي)', en: 'Organizers (English)' }, { source: 'event.organizers.ar', ar: 'المنظمون (عربي)', en: 'Organizers (Arabic)' },
    { source: 'event.organizer', ar: 'المنظم الأول (إنجليزي)', en: 'First organizer (English)' }, { source: 'event.organizer.ar', ar: 'المنظم الأول (عربي)', en: 'First organizer (Arabic)' },
  ] },
  { id: 'partner', ar: 'الراعي', en: 'Partner', fields: [{ source: 'partner.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'others', ar: 'أخرى', en: 'Others', fields: [
    { source: 'literal', ar: 'نص', en: 'Text' }, { source: 'conditional', ar: 'نص شرطي', en: 'Logic text' },
    { source: 'certificate.UUID', ar: 'معرّف الشهادة', en: 'Certificate ID' }, { source: 'certificate.QR', ar: 'رمز QR لمعرّف الشهادة', en: 'Certificate ID QR' },
  ] },
];
// Gender remains a condition/test context and is supported in older saved templates.
export const sources: Source[] = ['student.name', 'student.gender', 'event.name', 'event.date', 'event.vtoolsUUID', 'event.speakers', 'event.speakers.ar', 'event.speaker', 'event.speaker.ar', 'event.interviewer', 'event.interviewer.ar', 'event.organizers', 'event.organizers.ar', 'event.organizer', 'event.organizer.ar', 'partner.name', 'certificate.UUID'];
export interface TemplateField {
  id: string; label: string; source: Source; x: number; y: number; fontSize: number;
  align: 'left' | 'center' | 'right'; color: string; bold: boolean;
  value?: string; conditionSource?: Source; rules?: { equals: string; text: string }[]; fallback?: string; qrSize?: number;
  maxWidth?: number; direction?: 'auto' | 'ltr' | 'rtl';
  qrForeground?: string; qrBackground?: string; qrBackgroundOpacity?: number;
  qrBorderColor?: string; qrBorderWidth?: number; qrShape?: 'square' | 'rounded' | 'circle';
  qrPadding?: number; qrLevel?: 'L' | 'M' | 'Q' | 'H';
}
export interface TemplateDefinition { background: string; width: number; height: number; fields: TemplateField[] }
export interface CertificateTemplate {
  id: string; nameAr: string; status: 'draft' | 'approved'; revision: number;
  createdBy: string; approvedBy?: string; approvedAt?: string; updatedAt?: string; definition: TemplateDefinition;
}
export function fieldText(field: TemplateField, values: Record<string, string>) {
  if (field.source === 'certificate.QR') return values['certificate.UUID'] || '';
  if (field.source === 'conditional') return field.rules?.find(rule => rule.equals === sourceValue(field.conditionSource || 'student.gender', values))?.text ?? field.fallback ?? '';
  if (field.source === 'literal') return field.value || '';
  return sourceValue(field.source, values);
}
function sourceValue(source: Source, values: Record<string, string>) {
  return source === 'event.name' || source === 'event.title' ? values['event.name'] || values['event.title'] || '' : values[source] || '';
}
export function testSources(fields: TemplateField[]): Source[] {
  const used = new Set<Source | undefined>(fields.map(field => field.source === 'conditional' ? field.conditionSource : field.source)
    .map(source => source === 'certificate.QR' ? 'certificate.UUID' : source === 'event.title' ? 'event.name' : source));
  return sources.filter(source => used.has(source));
}
export function qrGeometry(field: TemplateField) {
  const size = field.qrSize ?? 80;
  const available = (size - 2 * (field.qrBorderWidth ?? 0)) / (field.qrShape === 'circle' ? Math.sqrt(2) : 1);
  const inner = available - 2 * (field.qrPadding ?? 0);
  return { inset: (size - inner) / 2, inner };
}
export const arabicTemplateName = (name: string) => /[ء-ي]/u.test(name.trim()) && /^[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s()،؛:!؟.\-]+$/u.test(name.trim()) && name.trim().length <= 120;
export function newField(source: Source): TemplateField {
  return { id: crypto.randomUUID(), label: source === 'conditional' ? 'صيغة المخاطبة' : source, source,
    x: 50, y: 50, fontSize: 24, align: 'center', color: '#172554', bold: false,
    ...(source === 'literal' ? { value: '' } : {}),
    ...(source === 'certificate.QR' ? { qrSize: 80, qrForeground: '#000000', qrBackground: '#ffffff', qrBackgroundOpacity: 1, qrShape: 'square', qrBorderColor: '#000000', qrBorderWidth: 0, qrPadding: 4, qrLevel: 'M' } : { maxWidth: 60, direction: source === 'student.name' || source.startsWith('event.') || source === 'certificate.UUID' ? 'ltr' : 'auto' }),
    ...(source === 'conditional' ? { conditionSource: 'student.gender' as Source, rules: [{ equals: 'male', text: 'الطالب' }, { equals: 'female', text: 'الطالبة' }], fallback: '' } : {}) };
}
