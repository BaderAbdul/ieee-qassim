import type { PlatformEvent } from '@/lib/types';
import type { StageId } from '@/components/admin/events/wizard/wizardTypes';

export interface EventReadiness {
  mode: 'open' | 'close';
  ready: boolean;
  /** The wizard stage that owns the first missing field, so the badge can deep-link there. */
  missingStage: StageId | null;
  missingField: string | null;
}

interface Check { field: string; stage: StageId; missing: (event: PlatformEvent) => boolean }

// Mirrors the backend's own gate for leaving Draft (app/services/operations.py's
// change_event_state) plus the vTools ID, which the Settings stage's own copy already says
// "will become required before this event leaves Draft".
const OPEN_CHECKS: Check[] = [
  { field: 'title', stage: 'main', missing: e => !e.title?.trim() },
  { field: 'description', stage: 'main', missing: e => !e.description?.trim() },
  { field: 'location', stage: 'time', missing: e => e.locationType !== 'online' && !e.location?.trim() },
  { field: 'durationHours', stage: 'time', missing: e => !(e.durationHours > 0) },
  { field: 'capacity', stage: 'time', missing: e => !e.isUnlimitedCapacity && !(e.capacity > 0) },
  { field: 'vtoolsUuid', stage: 'settings', missing: e => !e.vtoolsUuid?.trim() },
];

// Additional gate before Completed: certificates only auto-issue (see certificates.py's
// auto_issue_on_completion) when a certificate template actually resolves.
const CLOSE_CHECKS: Check[] = [
  ...OPEN_CHECKS,
  { field: 'certificateTemplateId', stage: 'settings', missing: e => !!e.hasCertificate && !e.certificateTemplateId },
];

const OPEN_STATES: PlatformEvent['state'][] = ['Published', 'Registration Open', 'Registration Closed', 'Ongoing'];

export function eventReadiness(event: PlatformEvent): EventReadiness | null {
  const mode: EventReadiness['mode'] | null =
    event.state === 'Draft' ? 'open' : OPEN_STATES.includes(event.state) ? 'close' : null;
  if (!mode) return null; // Completed/Archived: nothing left to gate.
  const checks = mode === 'open' ? OPEN_CHECKS : CLOSE_CHECKS;
  const firstMissing = checks.find(check => check.missing(event));
  return {
    mode, ready: !firstMissing,
    missingStage: firstMissing?.stage ?? null,
    missingField: firstMissing?.field ?? null,
  };
}
