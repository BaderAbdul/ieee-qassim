import type { PlatformEvent } from '@/lib/types';
import type { StageId } from '@/components/admin/events/wizard/wizardTypes';

export interface EventReadiness {
  mode: 'visible' | 'complete';
  ready: boolean;
  /** The wizard stage that owns the first missing field, so the badge/modal can deep-link there. */
  missingStage: StageId | null;
  missingField: string | null;
  missingLabelAr: string | null;
  missingLabelEn: string | null;
}

interface Check {
  field: string;
  stage: StageId;
  labelAr: string;
  labelEn: string;
  missing: (event: PlatformEvent) => boolean;
}

// Mirrors the backend's own gates -- app/services/events.py's _assert_visible_ready (becoming
// visible: isUnlisted -> false) and app/services/operations.py's change_event_state Completed
// gate -- so the admin gets a precise "X is missing" modal before the API call even happens.
const VISIBLE_CHECKS: Check[] = [
  { field: 'days', stage: 'time', labelAr: 'أيام الفعالية', labelEn: 'Event days',
    missing: e => !(e.days && e.days.length) },
  { field: 'location', stage: 'time', labelAr: 'المكان (عربي وإنجليزي)', labelEn: 'Location (Arabic and English)',
    missing: e => e.locationType === 'in_person' && !(e.location?.trim() && e.locationEn?.trim()) },
  { field: 'capacity', stage: 'time', labelAr: 'عدد المقاعد', labelEn: 'Seat count',
    missing: e => e.locationType === 'in_person' && !e.isUnlimitedCapacity && !(e.capacity > 0) },
  { field: 'interviewer', stage: 'interviewer', labelAr: 'محاور أو متحدث', labelEn: 'An interviewer or speaker',
    missing: e => !(e.interviewer?.trim() || e.interviewerEn?.trim() || e.speakers?.length || e.speakersEn?.length) },
  { field: 'coverUrl', stage: 'design', labelAr: 'صورة الإعلان', labelEn: 'Poster image',
    missing: e => !e.coverUrl?.trim() },
];

const COMPLETE_CHECKS: Check[] = [
  { field: 'hasSponsors', stage: 'sponsors', labelAr: 'تحديد وجود رعاية من عدمه', labelEn: 'Whether there is sponsorship',
    missing: e => e.hasSponsors === null || e.hasSponsors === undefined },
  { field: 'vtoolsUuid', stage: 'settings', labelAr: 'معرف VTools', labelEn: 'VTools ID',
    missing: e => !e.vtoolsUuid?.trim() },
];

function evaluate(mode: EventReadiness['mode'], checks: Check[], event: PlatformEvent): EventReadiness {
  const firstMissing = checks.find(check => check.missing(event));
  return {
    mode, ready: !firstMissing,
    missingStage: firstMissing?.stage ?? null,
    missingField: firstMissing?.field ?? null,
    missingLabelAr: firstMissing?.labelAr ?? null,
    missingLabelEn: firstMissing?.labelEn ?? null,
  };
}

/** Gate for showing the event publicly (the "Show" button, isUnlisted -> false). */
export const visibilityReadiness = (event: PlatformEvent): EventReadiness => evaluate('visible', VISIBLE_CHECKS, event);

/** Gate for moving the event's state to Completed. */
export const completionReadiness = (event: PlatformEvent): EventReadiness => evaluate('complete', COMPLETE_CHECKS, event);

/** For the events-list readiness badge: whichever gate is next for this event, or null once both are satisfied. */
export function eventReadiness(event: PlatformEvent): EventReadiness | null {
  if (event.state === 'Completed') return null; // finished: nothing left to nudge about, hidden or not
  return event.isUnlisted ? visibilityReadiness(event) : completionReadiness(event);
}
