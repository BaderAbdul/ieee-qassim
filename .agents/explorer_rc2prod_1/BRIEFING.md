# BRIEFING — 2026-09-30T11:27:45Z

## Mission
Conduct a thorough, deep architectural and code audit of the Visitor/Student journey, Organizer journey, and Next.js App Router structure on the IEEE QASSIM platform.

## 🔒 My Identity
- Archetype: explorer
- Roles: [fullstack_explorer, journey_auditor]
- Working directory: /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1
- Original parent: adf0d360-2956-4a11-81b2-54b0ce7c25ce
- Milestone: rc2prod_audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly read local code directly; verify all claims with file paths and line numbers
- Write only to .agents/explorer_rc2prod_1/

## Current Parent
- Conversation ID: adf0d360-2956-4a11-81b2-54b0ce7c25ce
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/events/page.tsx`, `src/app/[locale]/events/[id]/page.tsx`
  - `src/app/[locale]/events/[id]/checkin/page.tsx`, `src/app/[locale]/complete-profile/page.tsx`, `src/app/[locale]/profile/page.tsx`, `src/app/[locale]/profile/pass/PassClient.tsx`
  - `src/app/[locale]/admin/**` (`page.tsx`, `layout.tsx`, `events/**`, `check-in/**`, `users/**`, `ideas/**`, `structure/**`)
  - `functions/src/**` (`registerForEvent.ts`, `submitCheckIn.ts`, `processCheckIn.ts`, `generateCheckInToken.ts`, `issueCertificates.ts`, `generateCertificate.ts`, `getCertificateDownloadUrl.ts`, `onPointTransactionCreated.ts`, `onRegistrationCancelled.ts`, `addManualPoints.ts`, `manualAttendanceOverride.ts`)
  - `firestore.rules`, `firestore.indexes.json`, `tests/**`
- **Key findings**:
  1. Double points bug in `submitCheckIn.ts` combined with `onPointTransactionCreated.ts`.
  2. Missing composite index for waitlist promotion query in `onRegistrationCancelled.ts`.
  3. Client/Cloud-Function race condition during registration cancellation causing event oversubscription.
  4. Broken 404 links: Check-in CTA in `events/[id]/page.tsx:462` links to `/check-in/${event.id}` (should be `/events/${event.id}/checkin`), and Admin QR link in `admin/events/page.tsx:159` links to `/admin/events/${event.id}/qr` (deleted route, should be `checkin-desk`).
  5. Missing `not-found.tsx` across the entire app.
  6. Permission denied bug when awarding points from Admin Registration Desk (`handleAwardPoints` writes `createdAt` instead of `timestamp` required by `firestore.rules`).
  7. Remote check-in vulnerability: static token check in `submitCheckIn.ts` allows WhatsApp forwarding with zero geo or dynamic validation.
  8. Disconnect: `generateCheckInToken.ts` and `processCheckIn.ts` are completely abandoned in favor of static token check.
  9. Admin/Organizer portal completely hardcoded in Arabic with no `next-intl` localization.
- **Unexplored areas**: None within the assigned audit scope.

## Key Decisions Made
- Fully analyzed live code vs test suite expectations. Documented git history root causes (commit e67c2ab).

## Artifact Index
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1/progress.md — Liveness & progress tracker
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1/handoff.md — Final audit report
