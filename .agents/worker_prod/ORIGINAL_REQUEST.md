## 2026-09-16T21:30:00Z

<USER_REQUEST>
You are the Implementation Worker for the IEEE Qassim platform production readiness.

Working directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_prod
Project root: /home/bader/Documents/IEEE QU SITE
Task specification: /home/bader/Documents/IEEE QU SITE/.agents/worker_prod/task.md
Exploration reports to follow:
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md (Security & firestore.rules)
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2/report.md (Performance, bounded reads, E2E bug fixes)
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_3/report.md (UX, skeletons, loading.tsx, error.tsx)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your assignments:
1. Security & Data Integrity:
   - Rewrite `firestore.rules` based on Explorer 1's concrete recommendations: remove `|| true;`, lock down `/users/{userId}` update against privilege escalation, whitelist keys on `/registrations` create, restrict event counter tampering.
   - Refine `src/app/[locale]/admin/layout.tsx` to ensure `router.replace('/')` and block unauthorized rendering.
   - Create an automated test/verification script (e.g. `tests/verify_security_rules.test.ts` or executable runner) demonstrating that non-owner/unauthenticated writes to `users` are rejected by rules, and admin routes block non-admin users.

2. Performance & Scalability (300+ students):
   - In `src/app/[locale]/admin/page.tsx`: use `getCountFromServer` for user, registration, and certificate counts (O(1) read complexity).
   - In `src/app/[locale]/admin/events/[id]/registrations/page.tsx`: parallelize or optimize user document fetching using `Promise.all` instead of the sequential blocking `for` loop.
   - In `src/app/[locale]/admin/events/[id]/certificates/page.tsx`: parallelize attendee user fetches.
   - In `src/app/[locale]/page.tsx` and `src/app/[locale]/events/page.tsx`: enforce bounded queries (`limit()`).
   - In `firestore.indexes.json`: add missing composite indexes documented by Explorer 2.
   - Create an automated verification script (e.g. `tests/verify_performance_bounds.test.ts`) confirming `limit()` / bounded reads.

3. End-to-End User Journey QA:
   - Fix fatal bug in `src/app/[locale]/admin/events/[id]/qr/page.tsx`: use deterministic attendance log document ID `${eventId}_${userId}` so `functions/src/issueCertificates.ts` matches!
   - Update registration status to `attended` upon successful check-in.
   - Create an automated E2E journey test script (`tests/verify_e2e_journey.test.ts` or executable simulation) that simulates Event Creation -> Registration -> Approval -> Attendance Check-in -> Certificate Generation and verifies Firestore records.

4. UX & Vibe Polish:
   - Create `src/components/skeletons/` with modern, mobile-friendly skeletons (`Skeleton.tsx`, `EventCardSkeleton.tsx`, `EventsGridSkeleton.tsx`, `EventDetailsSkeleton.tsx`, `ProfileSkeleton.tsx`, `LeaderboardSkeleton.tsx`, `AdminStatsSkeleton.tsx`, `AdminTableSkeleton.tsx`).
   - Add App Router streaming fallbacks and error boundaries:
     - `src/app/[locale]/loading.tsx` & `error.tsx`
     - `src/app/[locale]/events/loading.tsx` & `error.tsx`
     - `src/app/[locale]/events/[id]/loading.tsx` & `error.tsx`
     - `src/app/[locale]/profile/loading.tsx` & `error.tsx`
     - `src/app/[locale]/leaderboard/loading.tsx` & `error.tsx`
     - `src/app/[locale]/admin/loading.tsx` & `error.tsx`
     - `src/app/[locale]/admin/events/loading.tsx`
     - `src/app/[locale]/admin/events/[id]/registrations/loading.tsx`
     - `src/app/[locale]/check-in/[eventId]/loading.tsx` & `error.tsx`
   - Fix broken `/my-activity` route links in `page.tsx` and `check-in/[eventId]/page.tsx` (point to `/profile`).
   - Remove duplicate `<Navbar />` and `<Footer />` in `src/app/[locale]/structure/page.tsx`.
   - Fix hardcoded Arabic `isAr = true` in `leaderboard/page.tsx` and `"تسجيل"` in `Navbar.tsx`.
   - Fix `space-x-reverse` in admin layouts to use `gap-3`.

5. Verification:
   - Run `npm test` and all verification scripts.
   - Run `npx next build --webpack` to verify full compilation.
   - Write comprehensive report to `/home/bader/Documents/IEEE QU SITE/.agents/worker_prod/handoff.md`.
   - Notify the orchestrator via send_message when finished.
</USER_REQUEST>
