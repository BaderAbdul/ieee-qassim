# Progress — Worker 1 (Fullstack & Backend Remediation)

Last visited: 2026-09-30T17:44:00+03:00

## Current Status
Initialized workspace. Reading context and discovery reports.

## Tasks Checklist
- [ ] 0. Read discovery findings & plan:
  - `explorer_rc2prod_1/handoff.md`
  - `explorer_rc2prod_3/handoff.md`
  - `orchestrator_rc2prod_gen2/plan.md`
- [ ] 1. Waitlist FIFO Auto-Promotion & Capacity Integrity:
  - [ ] Refactor `functions/src/triggers/onRegistrationCancelled.ts` to `db.runTransaction()` with FIFO promotion & capacity accounting.
  - [ ] Add composite indexes in `firestore.indexes.json` (`registrations` & `mail`).
- [ ] 2. Attendance Token Generation & Point Deduplication:
  - [ ] Fix double-awarding between `functions/src/submitCheckIn.ts` and `functions/src/onPointTransactionCreated.ts`.
  - [ ] Support `amount = data.amount ?? data.points` in `onPointTransactionCreated.ts`.
  - [ ] Add organizer action to generate/regenerate `checkinToken` in `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`.
  - [ ] Fix `handleAwardPoints` in `src/app/[locale]/admin/events/[id]/registrations/page.tsx` (`amount`, `points`, `timestamp`).
- [ ] 3. Fix Broken Routes & Not-Found Handlers:
  - [ ] Fix broken link in `src/app/[locale]/admin/events/page.tsx:159` to `/admin/events/${event.id}/checkin-desk`.
  - [ ] Fix broken link in `src/app/[locale]/events/[id]/page.tsx:462` to `/events/${event.id}/checkin`.
  - [ ] Create `src/app/not-found.tsx` and `src/app/[locale]/not-found.tsx` with bilingual RTL/LTR IEEE Qassim branding.
- [ ] 4. Mail Queue Resilience:
  - [ ] Guard `RESEND_API_KEY` in `functions/src/workers/processMailQueue.ts`.
- [ ] 5. Test Harness Alignment & Verification:
  - [ ] Update `tests/verify_e2e_journey.test.ts` & `tests/verify_remediations.test.ts`.
  - [ ] Run `cd functions && npm run build && cd ..`.
  - [ ] Run `npm test` and verify all tests pass.
- [ ] 6. Handoff & Documentation:
  - [ ] Update `progress.md` and `BRIEFING.md`.
  - [ ] Write `handoff.md`.
  - [ ] Send completion message to parent.
