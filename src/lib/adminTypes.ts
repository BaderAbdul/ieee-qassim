import type { EventState, PlatformEvent } from './types';

export interface AdminEventsPage { events: PlatformEvent[]; nextCursor: string | null }

export interface AdminEventSummary {
  id: string; title: string; titleEn?: string; state: EventState; date?: string;
  registeredCount?: number; attendanceCount?: number; capacity?: number; isUnlimitedCapacity?: boolean;
}
export interface AdminOverview {
  counts: { users: number; activeEvents: number; registrations: number; availableCertificates: number; pendingRegistrations: number; attendedRegistrations: number; failedCertificates: number; queuedCertificates: number };
  events: AdminEventSummary[];
  notifications: { pending: number; failed: number; review: number; delivered: number };
  generatedAt: string;
}
export interface AdminMember {
  id: string; displayName?: string; arabicFullName?: string; email?: string;
  photoURL?: string; role?: string; totalPoints?: number; isRestricted?: boolean;
}
export interface MemberSearchResult { users: AdminMember[]; nextCursor: string | null; hasMore?: boolean; truncated?: boolean }
export type MemberActivitySection = 'registrations' | 'attendance' | 'points' | 'certificates';
export interface MemberOverview {
  member: AdminMember & { universityId?: string; college?: string; major?: string; academicLevel?: string; profileCompleted?: boolean; createdAt?: string; archivedAt?: string };
  counts: Record<MemberActivitySection, number>;
  publicProjection: { exists: boolean; balance: number | null; matchesBalance: boolean };
  generatedAt: string;
}
export interface MemberActivityEntry {
  id: string; eventId?: string; sourceEventId?: string; eventTitle?: string; status?: string;
  timestamp?: string; createdAt?: string; issueDate?: string; amount?: number; reason?: string; source?: string;
  balanceBefore?: number; balanceAfter?: number;
}
export interface MemberActivityResult { entries: MemberActivityEntry[]; nextCursor: string | null; order: 'documentId' }
export interface OperationJob { id: string; status: string; to?: string; attempts?: number; eventId?: string; eventTitle?: string; studentName?: string; lastError?: string }
export interface AdminOperations { notificationJobs: OperationJob[]; certificateJobs: OperationJob[] }
export interface AuditEntry { id: string; action: string; actorUid?: string; targetId?: string; createdAt?: string; reason?: string }
export interface AuditResult { entries: AuditEntry[]; nextCursor: string | null }
export interface EventReport {
  counts: { registrations: number; pending: number; approved: number; waitlisted: number; rejected: number; cancelled: number; attended: number; certificatesAvailable: number; certificatesFailed: number; certificatesQueued: number };
  feedback: { responses: number; averageRating: number | null };
}
