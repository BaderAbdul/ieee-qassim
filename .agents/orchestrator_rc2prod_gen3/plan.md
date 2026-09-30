# Production Readiness Execution Plan (Gen3)

## Milestones Roadmap

### Milestone 1: Multi-Discipline Repository Architecture Discovery
- **Status**: COMPLETED
- Artifacts:
  - `explorer_rc2prod_1/handoff.md` (Fullstack & Journeys)
  - `explorer_rc2prod_2/handoff.md` (Security & Firebase)
  - `explorer_rc2prod_3/handoff.md` (Backend & Operations)

### Milestone 2: Core Journey & Backend Remediation
- **Lead**: `teamwork_preview_worker` (`worker_rc2prod_remediation_gen3`)
- **Key Tasks**:
  1. Waitlist FIFO auto-promotion:
     - Update `functions/src/triggers/onRegistrationCancelled.ts` with serialized transaction, capacity check, and FIFO query.
     - Add missing composite index in `firestore.indexes.json`: `registrations` -> `(eventId ASC, status ASC, timestamp ASC)`.
  2. Attendance token & Point deduplication:
     - Deduplicate points between `functions/src/submitCheckIn.ts` and `functions/src/onPointTransactionCreated.ts`.
     - Align point schema: support both `amount` and `points` in `functions/src/onPointTransactionCreated.ts`.
     - Add UI action to generate/regenerate `checkinToken` in `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`.
     - Fix `handleAwardPoints` in `src/app/[locale]/admin/events/[id]/registrations/page.tsx` (`amount`, `points`, `timestamp`).
  3. Fix Broken Routes:
     - Update `/check-in/${event.id}` link in `src/app/[locale]/events/[id]/page.tsx` -> `/events/${event.id}/checkin`.
     - Update `/admin/events/${event.id}/qr` link in `src/app/[locale]/admin/events/page.tsx` -> `/admin/events/${event.id}/checkin-desk`.
  4. Missing Not-Found Pages:
     - Create bilingual `src/app/not-found.tsx` and `src/app/[locale]/not-found.tsx` with IEEE Qassim branding & RTL/LTR support.
  5. Mail Queue Resilience:
     - Add missing composite index in `firestore.indexes.json`: `mail` -> `(status ASC, nextAttemptAt ASC)`.
     - Guard `RESEND_API_KEY` in `functions/src/workers/processMailQueue.ts`.
  6. Configuration & Test Harness:
     - Create `.env.example` documenting all client & server variables.
     - Update stale references in `tests/verify_e2e_journey.test.ts` & `tests/verify_remediations.test.ts` (`checkin-desk` path).

### Milestone 3: Security & Authorization Hardening
- **Lead**: `firestore-rules-author` (`rules_author_rc2prod_gen3`)
- **Key Tasks**:
  1. Prevent Organizer Self-Points Inflation:
     - In `firestore.rules`, disallow organizers from updating their own `totalPoints` (`userId != request.auth.uid`) or restrict to manual ledger functions.
  2. Align Point Transactions Schema:
     - Allow both `amount` and `points`, and support both `timestamp` and `createdAt` or enforce `timestamp`.
  3. Registration Capacity Integrity:
     - Enforce status validity and prevent direct status promotion to approved when capacity is reached.
  4. Verify Storage Rules:
     - Ensure `storage.rules` remains strictly defended against unauthorized reads/writes.
  5. ProfileGuard & Domain Check:
     - Validate that non-QU Google accounts authenticate cleanly and onboard without lockout.
  6. Execute and verify security rules tests.

### Milestone 4: Performance, UI/UX, Arabic RTL, Mobile-First Polish
- **Lead**: Worker
- **Key Tasks**:
  - Fix all 22 ESLint errors across the repository (`admin/page.tsx`, `admin/structure/page.tsx`, `DigitalMemberCard.tsx`).
  - Verify zero CLS regression, responsive mobile layouts, empty/error/loading states.

### Milestone 5: Automated Verification
- **Lead**: Reviewer (`teamwork_preview_reviewer`)
- **Key Tasks**:
  - Run `functions`: `npm run build`
  - Run root: `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`
  - Verify 100% test pass (Tiers 1-5).

### Milestone 6: Challenger Stress Testing & Forensic Integrity Audit
- **Leads**: `teamwork_preview_challenger` & `teamwork_preview_auditor`
- **Key Tasks**:
  - Concurrency stress tests on waitlist and check-in.
  - Forensic integrity audit with binary veto.

### Milestone 7: Final Release Gate & Production Report
- **Lead**: Orchestrator
- **Output**: `/home/bader/Documents/IEEE QU SITE/FINAL_PRODUCTION_RELEASE_REPORT.md`
- Report back to parent (Sentinel).
