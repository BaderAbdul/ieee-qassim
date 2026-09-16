## 2026-09-16T21:57:27Z

You are the Remediation Worker for the IEEE Qassim platform production readiness.

Working directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_remediation
Project root: /home/bader/Documents/IEEE QU SITE
Task specification: /home/bader/Documents/IEEE QU SITE/.agents/worker_remediation/task.md
Challenger 2 findings report: /home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_2/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission is to fix the 7 specific empirical defects identified by Challenger 2:
1. Waitlist Starvation on Cancellation: in `src/app/[locale]/events/[id]/page.tsx`, ensure `currentAttendeeCount` only counts active approved registrations or triggers FIFO promotion.
2. Re-registration Security Diff: in `firestore.rules`, allow `'cancelledAt'` in the re-registration key whitelist so that removing or updating it does not throw permission-denied.
3. Registration Desk Bulk Attend: in `src/app/[locale]/admin/events/[id]/registrations/page.tsx`, when marking students as `'attended'`, also write `doc(db, 'attendance_logs', `${eventId}_${userId}`)` so `issueCertificates` finds their attendance records.
4. QR Host Check-In Race Condition: in `src/app/[locale]/admin/events/[id]/qr/page.tsx`, use `runTransaction` for atomic check-in reads and writes, preventing double points on concurrent duplicate scans.
5. Point Transaction Schema Mismatch: in `src/app/[locale]/admin/events/[id]/qr/page.tsx`, write `{ amount: event.points, source: 'attendance', reason: 'حضور فعالية: ' + event.title, createdAt: serverTimestamp(), ... }` so `ProfilePage` displays green badges and correct descriptions.
6. Certificate Scaling Limits: in `functions/src/issueCertificates.ts`, process attendees in batches (e.g. 50 at a time) to prevent transactions from exceeding Firestore's 500-operation limit.
7. Root Error Boundary: create `src/app/global-error.tsx` complying with Next.js App Router root error boundary specification.

Verification:
- Run `npm test` and all individual verification scripts.
- Run `npx next build --webpack` to verify full compilation.
- Deliver your handoff report to `/home/bader/Documents/IEEE QU SITE/.agents/worker_remediation/handoff.md`.
- Notify the orchestrator via send_message when finished.
