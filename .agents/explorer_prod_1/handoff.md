# Handoff Report: Security & Data Integrity Audit (Production Readiness)

**Agent:** Explorer 1 (Security & Data Integrity Specialist)  
**Date:** 2026-09-17  
**Working Directory:** `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1`  
**Full Report:** `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md`

---

## 1. Observation

Direct observations from the inspected codebase:

1. **Unconditional Public Access in Registrations (`firestore.rules`):**
   - Lines 64–68:
     ```javascript
     match /registrations/{registrationId} {
       // Allow read for event organizers, registration owner, and permit checking registration counts or existence without crashing with permission-denied
       allow read: if isEventOrganizer()
         || (resource != null && isOwner(resource.data.userId))
         || true;
     ```
     The presence of `|| true;` on line 68 renders all document reads in `/registrations` globally permissible without authentication.

2. **Privilege Escalation via Organizer Profile Updates (`firestore.rules`):**
   - Lines 34–37:
     ```javascript
     allow update: if isSuperAdmin() || isEventOrganizer() || (
       isOwner(userId)
       && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints'])
     );
     ```
     `isEventOrganizer()` has top-level update authority on `/users/{userId}` without key restrictions, enabling any organizer to modify their own or another user's `role` field to `'super_admin'`.

3. **Status and Attendance Forgery on Registration Creation (`firestore.rules`):**
   - Lines 70–73:
     ```javascript
     allow create: if isAuthenticated() 
       && request.resource.data.userId == request.auth.uid
       && registrationId == (request.resource.data.eventId + '_' + request.auth.uid)
       && request.resource.data.status in ['approved', 'waitlisted', 'pending']; 
     ```
     Clients can self-assign `status: 'approved'` regardless of event capacity or `registrationMode: 'Manual'`. Furthermore, `create` lacks `keys().hasOnly()`, allowing injection of `{ attended: true, attendedAt: request.time }`.

4. **Event Registered Count Tampering (`firestore.rules`):**
   - Lines 51–59:
     ```javascript
     allow update: if isEventOrganizer() || (
       isAuthenticated()
       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount'])
       && (
          request.resource.data.registeredCount == resource.data.registeredCount + 1 ||
          request.resource.data.registeredCount == resource.data.registeredCount - 1
       )
       && request.resource.data.registeredCount >= 0
     );
     ```
     Any authenticated student can send standalone update mutations to increment `registeredCount` up to infinity or decrement it without an associated registration document.

5. **Storage Rules Lockdown (`storage.rules`):**
   - Lines 3–6:
     ```javascript
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if false;
       }
     ```
     All direct client read and write requests to Firebase Storage are completely blocked. Certificate generation uses Cloud Functions and the Firebase Admin SDK (`@google-cloud/storage`), which bypasses client rules.

6. **Admin Route Protection Architecture (`src/proxy.ts` & `src/app/[locale]/admin/layout.tsx`):**
   - `src/proxy.ts` only applies `createMiddleware(routing)` for internationalization (`next-intl`). It does not inspect Firebase Auth tokens or session cookies.
   - `src/app/[locale]/admin/layout.tsx` lines 25–27:
     ```tsx
     if (loading || !user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
       return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
     }
     ```
     Unauthorized visits are blocked from rendering `children` and redirected client-side via `router.push('/')`. There is no visual content flashing.
   - The application contains 0 Next.js API route handlers (`route.ts`) and 0 Server Actions (`'use server'`).

7. **Test Suite Baseline:**
   - Command `npm test` executed successfully: 93 tests passing across Tier 1, Tier 2, Tier 3, and Tier 4.

---

## 2. Logic Chain

1. **From Observation 1:** Line 68 of `firestore.rules` explicitly evaluates to `true` on every document read. In Firestore security rule evaluation, any logical `|| true` causes the entire rule expression to resolve to `true`. Therefore, unauthenticated anonymous clients can list and read the entire registrations collection, exposing student IDs, event attendances, and personal timestamps.
2. **From Observation 2:** When evaluating `allow update` on `/users/{userId}`, if the authenticated user's document in Firestore has `role == 'event_organizer'`, the `isEventOrganizer()` function returns `true`. Because this condition is combined via `||` with the owner restrictions, the engine short-circuits and ignores the `!affectedKeys().hasAny(['role', 'totalPoints'])` check. As a result, an event organizer can update any field on any user document, including mutating `role: 'super_admin'`. In `functions/src/utils/auth.ts`, `verifyAdmin()` checks this same `role` field. Thus, this constitutes an end-to-end privilege escalation path to super admin.
3. **From Observation 3:** In `match /registrations`, the `create` rule allows `request.resource.data.status in ['approved', 'waitlisted', 'pending']` without verifying the event's `registrationMode` (`Auto` vs `Manual`) or capacity threshold. A student client can craft a direct `setDoc` payload specifying `status: 'approved'` and bypass the organizer review queue. Additionally, without key whitelisting, a student can write `attended: true`, compromising attendance verification.
4. **From Observation 4:** Because `events/{eventId}` update allows any authenticated user to modify `registeredCount` by `+1` without an atomic cross-collection check, an attacker can script repeated updates to artificially exhaust event capacity, creating an effective denial of service against other students.
5. **From Observations 5 & 6:** In Next.js with client-side Firebase Auth, client tokens reside in IndexedDB and are unavailable to HTTP-layer proxy middleware without custom session cookies. The client layout guard successfully blocks rendering of protected child components, ensuring zero flash of data. However, because client-side navigation can be manipulated in browser environments, data security relies entirely on Firestore Security Rules.
6. **Synthesis:** The platform's security posture is currently vulnerable at the database rule layer (Score: 1/5). Hardening `firestore.rules` with strict role scoping, key whitelisting, type/size limits, and removal of `|| true;` will elevate the system to production-ready grade (Score: 5/5).

---

## 3. Caveats

1. **Session Cookie Proxying:** Implementing Edge-level route protection in `src/proxy.ts` would require migrating Firebase Auth to HTTP-only session cookies (`firebase-admin` session cookies). Since the platform currently uses client-side SPA auth persistence (`browserLocalPersistence`), adding Edge cookie validation requires architectural coordination with the frontend team.
2. **Spark vs. Blaze Plan Concurrency:** The client-side registration transaction in `events/[id]/page.tsx` was created to support the Firebase Spark plan (avoiding Cloud Functions). While the proposed `firestore.rules` strictly prevents self-approval on manual events and invalid states, true anti-race-condition locking under heavy concurrent bursts is best handled by the already developed Cloud Function (`functions/src/registerForEvent.ts`).
3. **Leaderboard Profile Reads:** In Firestore, collection-wide queries (such as `/leaderboard` fetching top 50 users) require `allow read` on the collection. Field-level masking cannot hide `email` or `universityId` within a document during a collection query. Future work should split private profile data into a dedicated `/users/{userId}/private/info` document if public leaderboard reads are extended to unauthenticated guests.

---

## 4. Conclusion

The IEEE Qassim platform has solid architectural foundations, but `firestore.rules` currently possesses critical security defects that must be patched before production launch. Specifically:
- `registrations` read rule must be stripped of `|| true;`.
- `users` update rule must restrict `isEventOrganizer()` exclusively to `totalPoints`.
- `registrations` create rule must restrict keys to `['userId', 'eventId', 'status', 'timestamp']` and match `registrationMode`.
- `events` counter updates must require `Registration Open` status and enforce capacity upper bounds.
- `storage.rules` is secure by default (blocked), and ready for prospective media upload rules.
- `AdminLayout` cleanly prevents unauthorized content flashing, but should adopt `router.replace('/')` and secondary component checks.

The exact hardened `firestore.rules` and `storage.rules` have been fully designed and documented in `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Inspect Vulnerable Lines:**
   ```bash
   # Confirm line 68 in firestore.rules contains || true;
   sed -n '64,74p' firestore.rules
   
   # Confirm line 34-37 in firestore.rules grants isEventOrganizer() unconstrained updates
   sed -n '33,38p' firestore.rules
   ```

2. **Verify Project Test Suite:**
   ```bash
   npm test
   ```
   Ensures all 93 unit and platform invariant tests pass without regression.

3. **Validate Rules Syntax:**
   Using the Firebase CLI:
   ```bash
   npx -y firebase-tools@latest setup:emulators:firestore
   # Or deploy/dry-run rules:
   # firebase deploy --only firestore:rules --dry-run
   ```

4. **Invalidation Conditions:**
   - If `|| true;` was removed from `firestore.rules`, Finding #1 is invalidated.
   - If `isEventOrganizer()` is constrained by `affectedKeys().hasOnly(['totalPoints'])`, Finding #2 is invalidated.
