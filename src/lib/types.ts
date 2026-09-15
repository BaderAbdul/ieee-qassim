import { Timestamp } from 'firebase/firestore';

export type EventType = 'Workshop' | 'Camp' | 'Lecture' | 'Competition' | 'Meetup' | 'Challenge' | 'Other';
export type EventState = 'Draft' | 'Published' | 'Registration Open' | 'Registration Closed' | 'Ongoing' | 'Completed' | 'Archived';
export type RegistrationMode = 'Auto' | 'Manual';

export interface PlatformEvent {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  coverUrl?: string;
  type: EventType;
  date: Timestamp | Date;
  location: string;
  locationEn: string;
  durationHours: number;
  gains: string[]; // e.g. ["Networking", "React skills"]
  gainsEn: string[];
  speakers: string[];
  capacity: number;
  registeredCount?: number;
  points: number;
  hasCertificate: boolean;
  state: EventState;
  registrationMode: RegistrationMode;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type PointTransactionSource = 'attendance' | 'attendance_override' | 'manual_adjustment';

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  source: PointTransactionSource;
  reason: string;
  sourceEventId?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export type CertificateState = 'Not Issued' | 'Generating' | 'Available' | 'Failed' | 'Revoked';

export interface Certificate {
  id: string; // The deterministic certificateId (certificate_{eventId}_{userId})
  eventId: string;
  userId: string;
  status: CertificateState;
  storagePath?: string; // e.g. certificates/{eventId}/{id}.pdf
  externalUrl?: string; // e.g. Google Drive link
  studentName: string;
  eventTitle: string;
  eventType: EventType;
  attendanceDate: Timestamp | Date;
  issueDate: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  attemptCount: number;
  lastError?: string;
  issuedBy: string;
  revokedBy?: string;
  revokedAt?: Timestamp | Date;
}
