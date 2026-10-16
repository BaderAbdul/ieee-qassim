import { Timestamp } from 'firebase/firestore';

export type EventType = 'Workshop' | 'Camp' | 'Lecture' | 'Competition' | 'Meetup' | 'Challenge' | 'Booth' | 'Other';
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
  date: Timestamp | Date | string;
  location: string;
  locationEn: string;
  durationHours: number;
  gains: string[]; // e.g. ["Networking", "React skills"]
  gainsEn: string[];
  speakers: string[];
  capacity: number;
  isUnlimitedCapacity?: boolean;
  hideExactCapacity?: boolean;
  requiresRegistration?: boolean; // false for walk-in booths / visits
  isUnlisted?: boolean; // hidden from public event listings but accessible via direct link/QR
  registeredCount?: number;
  attendanceCount?: number;
  points: number;
  hasCertificate: boolean;
  state: EventState;
  registrationMode: RegistrationMode;
  checkinToken?: string;
  feedbackQuestions?: CustomQuestion[];
  isPinned?: boolean;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

export interface EventFeedbackResponse {
  id: string;
  eventId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  rating: number; // 1 to 5 stars
  answers?: Record<string, string>; // questionId -> answer
  createdAt: unknown;
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

export type ShowcaseCategory = 
  | 'electronics_iot'
  | 'robotics'
  | 'ai_data'
  | 'software_dev'
  | 'energy_sustainability'
  | 'other_engineering';

export type ShowcaseStage = 
  | 'working_project'
  | 'functional_prototype'
  | 'simulation_software';

export type ShowcasePresentationMethod = 
  | 'physical_prototype'
  | 'laptop_demo'
  | 'poster_presentation';

export type ShowcaseEquipment = 
  | 'table'
  | 'electricity'
  | 'display_screen'
  | 'additional_space'
  | 'no_special_requirements';

export type ShowcaseStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export interface ShowcaseApplication {
  id: string;
  referenceNumber: string;
  eventId: string;
  applicantId: string;
  // Section A: Applicant Information
  fullName: string;
  email: string;
  whatsapp: string;
  organization: string;
  // Section B: Project Information
  projectName: string;
  category: ShowcaseCategory;
  description: string;
  stage: ShowcaseStage;
  mediaUrl?: string;
  // Section C: Exhibition Requirements
  presentationMethod: ShowcasePresentationMethod;
  equipment: ShowcaseEquipment[];
  teamSize: number;
  availability: boolean;
  agreedToTerms: boolean;
  // Admin & Review Metadata
  status: ShowcaseStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date | string | null;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

export interface ShowcaseSettings {
  maxAcceptedProjects: number;
  applicationsOpen: boolean;
  openDate?: string | null;
  closeDate?: string | null;
  updatedAt?: Timestamp | Date | string;
  updatedBy?: string;
}

