export type MessageKind = 'thanks' | 'regular';

export interface InboxMessage {
  id: string;
  kind: MessageKind;
  title: string;
  body: string;
  hasAttachment: boolean;
  attachmentEventName: string | null;
  createdAt: string;
  readAt: string | null;
  senderName: string;
}

export interface SentMessage {
  id: string;
  kind: MessageKind;
  title: string;
  body: string;
  audience: { mode: 'all' | 'roles' | 'users'; roles?: string[]; userIds?: string[] };
  hasAttachment: boolean;
  createdAt: string;
  recipients: number;
  readCount: number;
}

export interface StaffEntry {
  id: string;
  role: string;
  name: string;
  englishName: string | null;
  roleNameAr: string | null;
  roleNameEn: string | null;
}
