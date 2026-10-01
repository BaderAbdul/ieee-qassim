import { Timestamp } from 'firebase/firestore';

export type EventType = 'Workshop' | 'Camp' | 'Lecture' | 'Competition' | 'Meetup' | 'Challenge' | 'Other';
export type EventState = 'Draft' | 'Published' | 'Registration Open' | 'Registration Closed' | 'Ongoing' | 'Completed' | 'Archived';
export type RegistrationMode = 'Auto' | 'Manual';

export type QuestionType = 'choice' | 'text';

export interface CustomQuestion {
  id: string;
  title: string;
  type: QuestionType;
  options?: string[]; // for 'choice' pill type
  placeholder?: string; // for 'text' type
  quickChips?: string[]; // for 'text' type auto suggestions
  required: boolean;
}

export interface PlatformEvent {
  id: string;
  title: string;
  titleAr?: string;
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
  isUnlimitedCapacity?: boolean;
  hideExactCapacity?: boolean;
  registeredCount?: number;
  attendanceCount?: number;
  points: number;
  hasCertificate: boolean;
  state: EventState;
  registrationMode: RegistrationMode;
  checkinToken?: string;
  feedbackQuestions?: CustomQuestion[];
  isPinned?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface EventFeedbackResponse {
  id: string;
  eventId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  rating: number; // 1 to 5 stars
  answers?: Record<string, string>; // questionId -> answer
  createdAt: Timestamp | Date | any;
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
