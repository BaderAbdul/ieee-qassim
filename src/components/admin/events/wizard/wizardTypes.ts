import type { CustomQuestion, EventDay, EventGender, EventLocationType, EventSponsor, EventType, RegistrationMode, SocialLink } from '@/lib/types';

export type StageId = 'main' | 'time' | 'security' | 'interviewer' | 'sponsors' | 'design' | 'settings' | 'review' | 'share' | 'report';

export interface StageMeta {
  id: StageId;
  labelAr: string;
  labelEn: string;
  implemented: boolean;
}

// Shared with stage ownership settings and the activity trail.
export const STAGES: StageMeta[] = [
  { id: 'main', labelAr: 'البيانات الأساسية', labelEn: 'Main data', implemented: true },
  { id: 'time', labelAr: 'الزمان والمكان', labelEn: 'Time & place', implemented: true },
  { id: 'security', labelAr: 'التصريح الأمني', labelEn: 'Security screening', implemented: true },
  { id: 'interviewer', labelAr: 'المحاور والمنظمون', labelEn: 'Interviewer & organizers', implemented: true },
  { id: 'sponsors', labelAr: 'الرعاة', labelEn: 'Sponsors', implemented: true },
  { id: 'design', labelAr: 'التصميم', labelEn: 'Design', implemented: true },
  { id: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', implemented: true },
  { id: 'review', labelAr: 'نموذج التقييم', labelEn: 'Review form', implemented: true },
  { id: 'share', labelAr: 'النشر', labelEn: 'Publication', implemented: true },
  { id: 'report', labelAr: 'تقرير الفعالية', labelEn: 'Event report', implemented: true },
];

export interface MainDataFields {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  type: EventType;
  gains: string; // newline-separated in the UI, array on the wire
  gainsEn: string;
}

export interface TimePlaceFields {
  days: EventDay[];
  locationType: EventLocationType;
  location: string;
  locationEn: string;
  capacity: number;
  isUnlimitedCapacity: boolean;
  hideExactCapacity: boolean;
  gender: EventGender;
}

export interface ReviewFields {
  feedbackQuestions: CustomQuestion[];
}

export interface SecurityFields {
  securityFormAcknowledged: boolean;
}

export interface OrganizerAccount { id: string; name: string; nameEn?: string | null; role?: string; photoURL?: string | null }

export interface InterviewerFields {
  organizers: OrganizerAccount[];
  interviewer: string;
  interviewerEn: string;
  speakers: string;
  speakersEn: string;
}

export interface DesignFields {
  coverUrl: string;
}

export interface SponsorsFields { hasSponsors: boolean | null; sponsors: EventSponsor[] }

export interface ShareFields { socialLinks: SocialLink[] }
export const SOCIAL_PLATFORMS: { id: SocialLink['platform']; labelAr: string; labelEn: string }[] = [
  { id: 'linkedin', labelAr: 'لينكدإن', labelEn: 'LinkedIn' },
  { id: 'x', labelAr: 'إكس (تويتر)', labelEn: 'X (Twitter)' },
  { id: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok' },
  { id: 'snapchat', labelAr: 'سناب شات', labelEn: 'Snapchat' },
  { id: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram' },
  { id: 'telegram', labelAr: 'تيليجرام', labelEn: 'Telegram' },
  { id: 'discord', labelAr: 'ديسكورد', labelEn: 'Discord' },
];

export interface SettingsFields {
  requiresRegistration: boolean;
  registrationMode: RegistrationMode;
  vtoolsUuid: string;
  hasCertificate: boolean;
  certificateTemplateId: string; // '' = default/no template chosen yet
  emailTemplateId: string; // '' = none chosen yet
}

export const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
export const label = 'block space-y-1.5 text-sm font-bold text-[var(--color-text-secondary)]';
export const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40';
export const primaryButton = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent`;
