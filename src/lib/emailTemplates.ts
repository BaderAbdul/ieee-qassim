export interface EmailBoilerplateSummary { id: string; name: string; revision: number; createdBy: string; updatedAt: string }
export interface EmailBoilerplate { id: string; name: string; html: string; revision: number }

export interface EmailTemplateAttachment {
  id: string; kind: 'fixed' | 'certificate'; title: string; position: number;
  filename?: string; contentType?: string; certificateTemplateId?: string;
}
export interface EmailTemplateSummary {
  id: string; name: string; subject: string; allowAttachments: boolean; createdBy: string; revision: number;
  updatedAt: string; status: 'draft' | 'approved';
}
export interface EmailTemplate {
  id: string; name: string; subject: string; html: string; boilerplateId: string | null;
  allowAttachments: boolean; createdBy: string; revision: number; attachments: EmailTemplateAttachment[];
  status: 'draft' | 'approved'; approvedBy: string | null; approvedAt: string | null;
}

export const MAX_TEST_RECIPIENTS = 5;
export const MAX_TEMPLATE_ATTACHMENTS = 10;

// Same source registry as certificate templates (see certificateTemplates.ts), minus the QR
// source -- that renders as an image on the certificate PDF, not as plain email text.
export const EMAIL_VARIABLE_GROUPS: { id: string; ar: string; en: string; variables: { source: string; ar: string; en: string }[] }[] = [
  { id: 'student', ar: 'الطالب', en: 'Student', variables: [
    { source: 'student.name', ar: 'الاسم', en: 'Name' }, { source: 'student.gender', ar: 'الجنس', en: 'Gender' },
  ] },
  { id: 'event', ar: 'الفعالية', en: 'Event', variables: [
    { source: 'event.name', ar: 'الاسم', en: 'Name' }, { source: 'event.date', ar: 'التاريخ', en: 'Date' }, { source: 'event.vtoolsUUID', ar: 'معرّف vTools', en: 'vTools UUID' },
  ] },
  { id: 'partner', ar: 'الراعي', en: 'Partner', variables: [{ source: 'partner.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'certificate', ar: 'الشهادة', en: 'Certificate', variables: [{ source: 'certificate.UUID', ar: 'معرّف الشهادة', en: 'Certificate ID' }] },
];
export const variableToken = (source: string) => `{{ ${source} }}`;

// Natural pixel size of an image file, used to emit a correct height alongside a chosen width --
// some mail clients size <img> inconsistently from CSS alone without matching width/height attributes.
export function imageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    image.src = url;
  });
}
