# Task: Implementation Worker - Production Launch Readiness

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/worker_prod`

## Objectives
Implement the complete set of hardened security rules, performance optimizations, E2E journey fixes, UX fallback states, and automated verification scripts as detailed in the exploration reports:
- Explorer 1 Report: `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md`
- Explorer 2 Report: `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2/report.md`
- Explorer 3 Report: `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_3/report.md`

## Key Work Items

### 1. Security & Data Integrity
- Rewrite `firestore.rules`:
  - Eliminate `|| true;` in `/registrations` (line 68).
  - Restrict `/users/{userId}` update: organizers can only update points/attendance, NOT escalate `role` or `isAdmin`.
  - Whitelist keys in `/registrations` create: `['userId', 'eventId', 'status', 'timestamp', 'userName', 'userEmail']`. Prevent client from creating with `attended: true` or forging `status`.
  - Restrict `events` updates to prevent unauthorized DoS counter manipulation.
- Review and polish `src/app/[locale]/admin/layout.tsx`: Ensure `router.replace('/')` and block unauthorized rendering.
- Write/update automated verification script (e.g. `tests/verify_security_rules.ts`) to verify that unauthenticated and non-owner writes to `users` and `/admin/*` routes are blocked.

### 2. Performance & Scalability (300+ Students)
- Admin dashboard (`src/app/[locale]/admin/page.tsx`):
  - Replace unbounded `getDocs(collection(...))` for users, registrations, and certificates with `getCountFromServer(collection(...))` for O(1) reads.
- Admin registrations (`src/app/[locale]/admin/events/[id]/registrations/page.tsx`):
  - Replace sequential `for` loop `await getDoc` with `Promise.all` parallel fetching and/or denormalized data to eliminate the N+1 network freeze.
- Admin certificates (`src/app/[locale]/admin/events/[id]/certificates/page.tsx`):
  - Parallelize user queries with `Promise.all`.
- Homepage & Events list (`src/app/[locale]/page.tsx`, `src/app/[locale]/events/page.tsx`):
  - Add `limit()` to queries so bounded reads are enforced.
- Update `firestore.indexes.json` with missing composite indexes identified by Explorer 2.
- Write/update automated verification script (e.g. `tests/verify_performance_bounds.ts`) verifying `limit()` and bounded reads.

### 3. End-to-End User Journey QA & Fixes
- Fix fatal bug in `src/app/[locale]/admin/events/[id]/qr/page.tsx`:
  - Set attendance log document ID deterministically to `${eventId}_${userId}` so `functions/src/issueCertificates.ts` locates it!
  - When scanning attendance, update registration `status: 'attended'` in addition to `attended: true`.
- Implement automated E2E lifecycle test script (e.g. `tests/verify_e2e_journey.ts` or similar test runner) that executes:
  Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation and asserts database integrity.

### 4. UX & Vibe Polish
- Create `src/components/skeletons/`:
  - `Skeleton.tsx`
  - `EventCardSkeleton.tsx`
  - `EventsGridSkeleton.tsx`
  - `EventDetailsSkeleton.tsx`
  - `ProfileSkeleton.tsx`
  - `LeaderboardSkeleton.tsx`
  - `AdminStatsSkeleton.tsx`
  - `AdminTableSkeleton.tsx`
- Add Next.js App Router streaming fallbacks and error boundaries:
  - `src/app/[locale]/loading.tsx` & `error.tsx`
  - `src/app/[locale]/events/loading.tsx` & `error.tsx`
  - `src/app/[locale]/events/[id]/loading.tsx` & `error.tsx`
  - `src/app/[locale]/profile/loading.tsx` & `error.tsx`
  - `src/app/[locale]/leaderboard/loading.tsx` & `error.tsx`
  - `src/app/[locale]/admin/loading.tsx` & `error.tsx`
  - `src/app/[locale]/admin/events/loading.tsx`
  - `src/app/[locale]/admin/events/[id]/registrations/loading.tsx`
  - `src/app/[locale]/check-in/[eventId]/loading.tsx` & `error.tsx`
- Fix broken links:
  - In `src/app/[locale]/page.tsx` and `src/app/[locale]/check-in/[eventId]/page.tsx`: change `/my-activity` link to `/profile`.
- Fix duplicate Navbar/Footer in `src/app/[locale]/structure/page.tsx`.
- Fix hardcoded Arabic `isAr = true` in `leaderboard/page.tsx` and `"تسجيل"` in `Navbar.tsx`.
- Replace `space-x-reverse` with `gap-3` in admin layouts.

### 5. Verification & Tests
- Run `npm test` and ensure all tests pass.
- Run `npx next build --webpack` to ensure build succeeds with 0 errors.
- Run the new verification scripts:
  - Security rules verification
  - Performance & bounded reads verification
  - E2E journey verification
- Document all modified files, test outputs, and commands in `/home/bader/Documents/IEEE QU SITE/.agents/worker_prod/handoff.md`.
