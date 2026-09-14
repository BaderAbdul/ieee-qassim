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
