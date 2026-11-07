export interface EmailBoilerplateSummary { id: string; name: string; revision: number; createdBy: string; updatedAt: string }
export interface EmailBoilerplate { id: string; name: string; html: string; revision: number }

export interface EmailTemplateAttachment {
  id: string; kind: 'fixed' | 'certificate'; title: string; position: number;
  filename?: string; contentType?: string; certificateTemplateId?: string;
}
export interface EmailTemplateSummary {
  id: string; name: string; subject: string; allowAttachments: boolean; createdBy: string; revision: number; updatedAt: string;
}
export interface EmailTemplate {
  id: string; name: string; subject: string; html: string; boilerplateId: string | null;
  allowAttachments: boolean; createdBy: string; revision: number; attachments: EmailTemplateAttachment[];
}

export const MAX_TEST_RECIPIENTS = 5;
export const MAX_TEMPLATE_ATTACHMENTS = 10;
