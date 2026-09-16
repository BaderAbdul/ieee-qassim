# Task: Remediation Worker - Fix 7 Challenger 2 Edge Cases

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/worker_remediation`

## Mission
Remediate the 7 empirical edge cases and architectural defects identified in Challenger 2's report (`/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_2/handoff.md`):

### 1. Defect 1: Registration Capacity & Waitlist on Cancellations
- Location: `src/app/[locale]/events/[id]/page.tsx`
- Fix: Ensure `currentAttendeeCount` only counts approved registrations when determining if capacity is reached, or when cancelling, decrement `registeredCount` and auto-promote waitlisted students FIFO if space opens.

### 2. Defect 2: Re-registration Key-Diff in `firestore.rules`
- Location: `firestore.rules` line 155
- Fix: Add `'cancelledAt'` to the re-registration key whitelist so that removing or clearing `cancelledAt` during re-registration does not trigger `permission-denied`:
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId', 'cancelledAt'])`

### 3. Defect 3: Registration Desk Bulk Attend Disconnect
- Location: `src/app/[locale]/admin/events/[id]/registrations/page.tsx`
- Fix: When an admin marks students as `'attended'` via bulk action, write deterministic `doc(db, 'attendance_logs', `${eventId}_${userId}`)` documents with `{ eventId, userId, timestamp: serverTimestamp() }` so `issueCertificates.ts` and the Certificates Management desk can find them!

### 4. Defect 4: QR Host Scanner Race Condition
- Location: `src/app/[locale]/admin/events/[id]/qr/page.tsx`
- Fix: Convert check-in logic to use `runTransaction` instead of non-isolated `writeBatch`, ensuring atomic reads and writes so concurrent double-scans cannot award double points.

### 5. Defect 5: Point Transaction Schema Mismatch
- Location: `src/app/[locale]/admin/events/[id]/qr/page.tsx`
- Fix: Align point transaction schema to `PointTransaction` interface:
  Write `{ amount: event.points, source: 'attendance', reason: 'حضور فعالية: ' + event.title, createdAt: serverTimestamp(), userId, eventId, type: 'earned', points: event.points, description: 'حضور فعالية: ' + event.title, timestamp: serverTimestamp() }` to support both schema styles seamlessly and render green badges on the Profile page.

### 6. Defect 6: Certificate Issuance Batching
- Location: `functions/src/issueCertificates.ts`
- Fix: Chunk userIds into batches of 50 to prevent transactions exceeding Firestore's 500-operation limit when handling 300+ students.

### 7. Defect 7: Missing Root `src/app/global-error.tsx`
- Fix: Create `src/app/global-error.tsx` complying with Next.js App Router specification (`'use client'`, `<html><body>` root wrapper, `reset()`, error message).

### Verification
- Run `node --test --experimental-strip-types tests/challenger_e2e_lifecycle_stress.test.ts`
- Run `node --test --experimental-strip-types tests/challenger_ux_resilience.test.ts`
- Run `npm test` (all tests pass)
- Run `npx next build --webpack` (build succeeds with 0 errors)
- Write handoff to `/home/bader/Documents/IEEE QU SITE/.agents/worker_remediation/handoff.md`
