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
  status: 'draft' | 'approved'; approvedBy: string | null; approvedAt: string | null; canManage?: boolean;
}

export const MAX_TEST_RECIPIENTS = 5;
export const MAX_TEMPLATE_ATTACHMENTS = 10;

// Own registry for email body variables -- independent of certificateTemplates.ts' sources,
// which serve the certificate PDF renderer and keep their own, differently-shaped field names.
export const EMAIL_VARIABLE_GROUPS: { id: string; ar: string; en: string; variables: { source: string; ar: string; en: string }[] }[] = [
  { id: 'event', ar: 'الفعالية', en: 'Event', variables: [
    { source: 'event.en.name', ar: 'الاسم (إنجليزي)', en: 'Name (English)' },
    { source: 'event.ar.name', ar: 'الاسم (عربي)', en: 'Name (Arabic)' },
    { source: 'event.en.date', ar: 'التاريخ (إنجليزي)', en: 'Date (English)' },
    { source: 'event.ar.date', ar: 'التاريخ (عربي)', en: 'Date (Arabic)' },
    { source: 'event.startingTime', ar: 'وقت البدء', en: 'Starting time' },
    { source: 'event.endingTime', ar: 'وقت الانتهاء', en: 'Ending time' },
    { source: 'event.ar.location', ar: 'المكان (عربي)', en: 'Location (Arabic)' },
    { source: 'event.en.location', ar: 'المكان (إنجليزي)', en: 'Location (English)' },
    { source: 'event.ar.interviewer', ar: 'مقدّم الحوار (عربي)', en: 'Interviewer (Arabic)' },
    { source: 'event.en.interviewer', ar: 'مقدّم الحوار (إنجليزي)', en: 'Interviewer (English)' },
    { source: 'event.ar.speakers', ar: 'المتحدثون (عربي)', en: 'Speakers (Arabic)' },
    { source: 'event.en.speakers', ar: 'المتحدثون (إنجليزي)', en: 'Speakers (English)' },
    { source: 'event.ar.organizers', ar: 'المنظمون (عربي)', en: 'Organizers (Arabic)' },
    { source: 'event.en.organizers', ar: 'المنظمون (إنجليزي)', en: 'Organizers (English)' },
    { source: 'event.url', ar: 'رابط صفحة الفعالية', en: 'Event page link' },
  ] },
  { id: 'student', ar: 'الطالب', en: 'Student', variables: [
    { source: 'student.name', ar: 'الاسم الكامل', en: 'Full name' },
    { source: 'student.firstName', ar: 'الاسم الأول', en: 'First name' },
    { source: 'student.email', ar: 'البريد الإلكتروني', en: 'Email' },
    { source: 'student.universityId', ar: 'الرقم الجامعي', en: 'University ID' },
  ] },
  { id: 'sponsor', ar: 'الراعي', en: 'Sponsor', variables: [{ source: 'sponsor.name', ar: 'الاسم', en: 'Name' }] },
  { id: 'other', ar: 'أخرى', en: 'Other', variables: [
    { source: 'other.vtoolsID', ar: 'معرّف vTools', en: 'vTools ID' },
    { source: 'other.certificateID', ar: 'معرّف الشهادة', en: 'Certificate ID' },
  ] },
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

// Splices text into a plain <input>/<textarea> at the current cursor, used for variable and
// image-tag insertion in both the subject field and the raw HTML code editor.
export function insertAtCursor(field: HTMLInputElement | HTMLTextAreaElement | null, current: string,
                                setValue: (next: string) => void, insertText: string): void {
  const start = field?.selectionStart ?? current.length;
  const end = field?.selectionEnd ?? current.length;
  setValue(current.slice(0, start) + insertText + current.slice(end));
  requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + insertText.length, start + insertText.length); });
}
