# BRIEFING — 2026-09-16T21:28:49Z

## Mission
Audit Firestore performance and query scalability for 300+ concurrent students, verify composite indexes, and trace the complete End-to-End User Journey (Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation) to identify bugs, edge cases, or broken operations.

## 🔒 My Identity
- Archetype: explorer
- Roles: Performance, Scalability & E2E Lifecycle Specialist
- Working directory: /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2
- Original parent: e94baf2d-564b-4a7f-a493-4178fa9a622d
- Milestone: Production Readiness Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes directly to source code
- Files for content delivery, Messages for coordination
- CODE_ONLY network mode: No external network calls
- Strict evidence chain: quote exact files, lines, queries, and logic
- Deliver report.md, handoff.md, and send_message to parent

## Current Parent
- Conversation ID: e94baf2d-564b-4a7f-a493-4178fa9a622d
- Updated: 2026-09-16T21:21:01Z

## Investigation State
- **Explored paths**:
  - `src/app/[locale]/page.tsx`, `HeroUserCards.tsx`
  - `src/app/[locale]/events/page.tsx`, `EventsList.tsx`, `[id]/page.tsx`
  - `src/app/[locale]/admin/page.tsx`, `admin/events/...`, `admin/users/...`
  - `src/app/[locale]/admin/events/[id]/qr/page.tsx`, `check-in/[eventId]/page.tsx`
  - `src/app/[locale]/admin/events/[id]/certificates/page.tsx`, `functions/src/...`
  - `src/app/[locale]/profile/page.tsx`, `leaderboard/page.tsx`, `complete-profile/page.tsx`
  - `firestore.indexes.json`, `firestore.rules`
- **Key findings**:
  - Fatal Bug: Auto-generated ID in `attendance_logs` breaks `issueCertificates.ts` deterministic lookup.
  - Critical N+1 loops in admin registration and certificate desks (300 sequential network requests).
  - Unbounded reads in admin dashboard (`users`, `registrations`, `certificates` downloaded for `.size`).
  - Missing 6 composite indexes in `firestore.indexes.json`.
  - Browser-hosted QR check-in single point of failure and multi-admin collision.
  - Profile rank query downloads 100 users per visit and bugs out for rank > 100.
- **Unexplored areas**: None remaining. Complete audit performed.

## Key Decisions Made
- Formulated exact before-and-after query optimizations using `getCountFromServer` and denormalization.
- Designed comprehensive automated 300-student E2E lifecycle acceptance test scenario.
- Documented findings in `report.md` and synthesized into `handoff.md`.

## Artifact Index
- `.agents/explorer_prod_2/ORIGINAL_REQUEST.md` — Original mission statement
- `.agents/explorer_prod_2/BRIEFING.md` — Persistent situational awareness
- `.agents/explorer_prod_2/progress.md` — Heartbeat & liveness tracking
- `.agents/explorer_prod_2/report.md` — Detailed findings and E2E simulation script design
- `.agents/explorer_prod_2/handoff.md` — 5-component handoff report
