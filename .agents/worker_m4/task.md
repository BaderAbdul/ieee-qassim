# Task for Worker M4: Architecture, Config & Core Logic Fixes

## Identity
- Role: Worker (teamwork_preview_worker)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_m4

## Objective
Fix critical build, security rules, and architectural bugs discovered in Milestone 1:

1. **Build & Lint Configuration**:
   - In root `tsconfig.json`, add `"functions"` to `"exclude"` so Next.js does not compile Cloud Functions code during root `next build`.
   - In `eslint.config.mjs`, add `"functions/**"` to `globalIgnores` so compiled CommonJS files in `functions/lib/` do not pollute the lint output.
   - Address obvious lint errors in `src/` (such as `any` types, React 19 `useEffect` setState violations in `my-activity/page.tsx:47`, unescaped entities, and wrap `useSearchParams()` in `<Suspense>` in `check-in/[eventId]/page.tsx`).

2. **Security Rules (`firestore.rules`)**:
   - In `match /users/{userId}`:
     - On `create`: enforce that `role` cannot be initialized to `'super_admin'` or `'admin'` by unauthenticated or non-admin clients (must default to `'student'`), and `totalPoints` must be 0.
     - On `read`: allow authenticated users to read public profile fields (`displayName`, `avatarUrl`, `totalPoints`, `badges`, `department`, `college`) required for the `/leaderboard` and student engineering profile, while restricting private contact information (`email`, `phone`, `nationalId`) to `isOwner(userId) || isEventOrganizer()`.
   - In `match /registrations/{registrationId}`:
     - Allow read for event organizers, registration owner, and permit checking registration counts or existence without crashing with `permission-denied`.
   - Ensure existing rules and security structure are strictly retained without introducing duplicate backend or database systems.

3. **Event Capacity & Cancellation Logic**:
   - In `src/app/[locale]/events/[id]/page.tsx`, ensure that `handleCancelRegistration` decrements `events/{eventId}.registeredCount` in Firestore using `increment(-1)` in a transaction or atomic update, preventing capacity exhaustion leaks.
   - Also ensure `registeredCount` does not go below 0.

4. **Attendance Check-In & Points Idempotency**:
   - Inspect `src/app/[locale]/check-in/[eventId]/page.tsx` and verify attendance check-in logic.
   - Ensure attendance is recorded idempotently (cannot check in twice for the same event).
   - Ensure points are awarded correctly and logged to user's activity/points history.

5. **Certificate Generation Font Path**:
   - In `functions/src/generateCertificate.ts`, fix font path resolution so it handles runtime execution paths gracefully without crashing on missing font files.

6. **Build & Test Verification**:
   - Run `npm run build` and verify that root Next.js build succeeds with 0 errors.
   - Run `npm run lint` and verify lint problems are substantially reduced and passing.

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Next.js AGENTS.md Rule
Read `AGENTS.md` and check `node_modules/next/dist/docs/` before making changes. Heed Next.js 16 and React 19 conventions.

## Output Requirements
Document all changes, build outputs, and test results in `/home/bader/Documents/IEEE QU SITE/.agents/worker_m4/changes.md` and `/home/bader/Documents/IEEE QU SITE/.agents/worker_m4/handoff.md`.
