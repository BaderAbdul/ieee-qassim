# Production Readiness Plan: IEEE QASSIM RC to Production (Gen2)

## Objectives & Success Criteria
Elevate the current release-candidate IEEE QASSIM platform to production readiness:
1. Verify whole repository architecture, configurations, and dependencies.
2. Full validation and remediation of Visitor/Student Journey and Organizer Journey:
   - Waitlist FIFO auto-promotion with serialized atomic transactions in Cloud Functions / client.
   - Elimination of capacity race conditions and oversubscription.
   - Attendance token generation in admin check-in desk, token submission, and elimination of double-awarding of points.
   - Point transaction schema alignment (`amount` vs `points`, `timestamp` vs `createdAt`).
   - Certificate generation prerequisites, issuance, and signed download verification.
   - Composite indexes in `firestore.indexes.json` (`registrations` and `mail`).
   - Fix broken routes: `/check-in/${event.id}` -> `/events/${event.id}/checkin`, `/admin/events/${event.id}/qr` -> `/admin/events/${event.id}/checkin-desk`.
   - Add missing `not-found.tsx` handlers.
   - Update stale file references in test harness.
3. Security, Authentication & Authorization Hardening:
   - Delegate `firestore.rules` and `storage.rules` authoring to `firestore-rules-author` subagent.
   - Ensure organizers cannot award themselves points or update points directly from client without ledger logging.
   - Verify non-QU Google Auth and ProfileGuard flow without lockout.
   - Verify server-side admin authorization defense-in-depth.
4. Performance, UI/UX, Arabic RTL, Mobile-First Polish & ESLint:
   - Fix all 22 ESLint errors (unescaped quotes, explicit `any`, etc.).
   - Verify responsive layout, error/empty/loading states, zero CLS regression.
5. Automated Verification:
   - `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test` all passing with exit code 0.
6. Challenger Stress Testing & Forensic Integrity Audit:
   - Empirical concurrency, security, and edge-case testing by `teamwork_preview_challenger`.
   - Forensic integrity audit by `teamwork_preview_auditor` (binary veto).
7. Final Release Gate & Production Report:
   - Produce `/home/bader/Documents/IEEE QU SITE/FINAL_PRODUCTION_RELEASE_REPORT.md` matching all prompt acceptance criteria.

## Milestones Roadmap
- [x] **M1: Multi-Discipline Repository Architecture Discovery** [Completed by Explorer 1, 2, 3]
- [ ] **M2: Core Journey & Backend Remediation** [Worker 1]
- [ ] **M3: Security Hardening & Authorization** [firestore-rules-author]
- [ ] **M4: UI/UX, Localization, Mobile Polish & ESLint Fixes** [Worker 2]
- [ ] **M5: Automated Verification & Review** [Reviewer 1, 2]
- [ ] **M6: Challenger Stress Testing & Forensic Integrity Audit** [Challenger, Auditor]
- [ ] **M7: Final Release Gate & Production Report Delivery** [Orchestrator]
