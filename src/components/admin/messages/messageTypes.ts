export type MessageKind = 'thanks' | 'regular';

export interface InboxMessage {
  id: string;
  kind: MessageKind;
  title: string;
  body: string;
  hasAttachment: boolean;
  attachmentKind: 'file' | 'template' | null;
  attachmentName: string | null;
  createdAt: string;
  showAt: string;
  hideAt: string | null;
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
  showAt: string;
  hideAt: string | null;
  state: 'scheduled' | 'active' | 'ended';
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

export interface MessageEvent {
  id: number;
  title: string;
  titleEn: string | null;
  date: string;
  vtoolsUuid: string | null;
}
