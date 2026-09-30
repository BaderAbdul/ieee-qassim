# Backend, Cloud Functions, Indexes & Operational Readiness Audit Report

**Date**: 2026-09-30  
**Investigator**: Explorer 3 (Backend & Operational Readiness Explorer)  
**Target Platform**: IEEE Qassim Student Branch Platform  

---

## 1. Observation

Direct evidence collected from inspecting codebase source files, operational configurations, test executions, and compilation runs:

### 1.1 Cloud Functions Inventory (`functions/src/`)
Cloud Functions package configuration (`functions/package.json`) uses Node 20 runtime with dependencies: `@sparticuz/chromium: ^153.0.0`, `firebase-admin: ^12.0.0`, `firebase-functions: ^4.7.0`, `jsonwebtoken: ^9.0.2`, `puppeteer-core: ^25.10.0`, `resend: ^6.28.0`. There are **zero test scripts** and zero testing devDependencies in `functions/package.json`.

All functions are exported in `functions/src/index.ts`:

| # | Function Export | Source File | Trigger Type | Implementation Purpose | Frontend Integration Status |
|---|---|---|---|---|---|
| 1 | `registerForEvent` | `functions/src/registerForEvent.ts:7` | `functions.https.onCall` (v1) | Serialized event registration in transaction locking `events.registeredCount`, capacity checks, auto-waitlisting. | **UNUSED BY CLIENT**. Client (`src/app/[locale]/events/[id]/page.tsx:129-180`) performs registrations directly via Firestore `runTransaction(db, ...)` authorized under `firestore.rules:102-111,134-141`. |
| 2 | `generateCheckInToken` | `functions/src/generateCheckInToken.ts:7` | `functions.https.onCall` (v1) | Signs 60s rotating check-in JWT tokens using `process.env.JWT_SECRET` and organizer authorization. | **UNUSED BY CLIENT**. The admin check-in desk uses static token `event.checkinToken` stored on event document. |
| 3 | `processCheckIn` | `functions/src/processCheckIn.ts:8` | `functions.https.onCall` (v1) | Decodes dynamic JWT QR token, writes `attendance_logs`, sets registration status to `attended`, mints `point_transactions` record. | **UNUSED BY CLIENT**. Frontend calls `submitCheckIn`. |
| 4 | `submitCheckIn` | `functions/src/submitCheckIn.ts:7` | `functions.https.onCall` (v1) | Dual-purpose: validates static token for student self check-in (`/events/[id]/checkin`), and handles admin scanner check-in with `targetUserId` (`/admin/events/[id]/checkin-desk`). Writes `attendance_logs`, marks `attended`, writes `point_transactions`, and runs `transaction.update(userRef, { totalPoints: increment(points) })`. | **ACTIVELY CALLED** by `/admin/events/[id]/checkin-desk` and `/events/[id]/checkin`. **Double-counting bug**: If `onPointTransactionCreated` is also active, points are incremented twice. |
| 5 | `manualAttendanceOverride` | `functions/src/manualAttendanceOverride.ts:7` | `functions.https.onCall` (v1) | Admin override for student attendance. Writes `attendance_logs` and `point_transactions`. | **UNUSED BY CLIENT**. Admin desk uses `submitCheckIn`. Note: Does not update registration doc to `attended`. |
| 6 | `addManualPoints` | `functions/src/addManualPoints.ts:7` | `functions.https.onCall` (v1) | Admin point adjustment. Writes to `point_transactions` with `source: 'manual_adjustment'`. | **ACTIVELY CALLED** by `/admin/users/page.tsx:73`. |
| 7 | `onPointTransactionCreated` | `functions/src/onPointTransactionCreated.ts:5` | `functions.firestore.document('point_transactions/{transactionId}').onCreate` (v1) | Increments `users/{userId}.totalPoints` by `data.amount`. | **BACKGROUND TRIGGER**. Schema conflict: expects `amount: number`. Client `registrations/page.tsx:199` writes `points: number` (causing trigger to ignore it), while `submitCheckIn.ts` writes both `amount` and `points`. |
| 8 | `beforeCreate` | `functions/src/authBlocking.ts:5` | `beforeUserCreated` (v2 identity) | Auth blocking function. Currently a no-op (`return;`). | **BACKGROUND HOOK**. No domain enforcement implemented in code. |
| 9 | `beforeSignIn` | `functions/src/authBlocking.ts:10` | `beforeUserSignedIn` (v2 identity) | Auth blocking function. Currently a no-op (`return;`). | **BACKGROUND HOOK**. No domain enforcement implemented in code. |
| 10 | `issueCertificates` | `functions/src/issueCertificates.ts:7` | `functions.https.onCall` (v1) | Batch creates `certificates` records with `status: 'Generating'` for attendees of completed events. | **ACTIVELY CALLED** by `/admin/events/[id]/certificates/page.tsx:128`. |
| 11 | `generateCertificate` | `functions/src/generateCertificate.ts:9` | `onDocumentWritten('certificates/{certificateId}')` (v2, 1GiB memory, 120s timeout) | Server-side Chromium PDF rendering via Puppeteer, embeds Cairo fonts as base64, uploads PDF to Storage bucket, updates status to `Available`. | **BACKGROUND TRIGGER**. |
| 12 | `getCertificateDownloadUrl` | `functions/src/getCertificateDownloadUrl.ts:6` | `functions.https.onCall` (v1) | Verifies user ownership/admin role and generates 15-minute signed URL for certificate PDF in Storage. | **ACTIVELY CALLED** by `/profile/page.tsx:271`. |
| 13 | `retryCertificate` | `functions/src/retryCertificate.ts:7` | `functions.https.onCall` (v1) | Resets `status: 'Generating'` for `Failed` certificates to re-trigger generation worker. | **ACTIVELY CALLED** by `/admin/events/[id]/certificates/page.tsx:142`. |
| 14 | `revokeCertificate` | `functions/src/revokeCertificate.ts:7` | `functions.https.onCall` (v1) | Updates status to `Revoked` and deletes PDF file from Storage bucket. | **ACTIVELY CALLED** by `/admin/events/[id]/certificates/page.tsx:157`. |
| 15 | `processMailQueue` | `functions/src/workers/processMailQueue.ts:39` | `onDocumentWritten('mail/{mailId}')` (v2) | Claims pending emails, dispatches via Resend API, schedules exponential backoff retries. | **BACKGROUND TRIGGER**. Has fatal top-level check: throws `Error` if `RESEND_API_KEY` is not set and `FUNCTIONS_EMULATOR !== 'true'`, crashing module initialization if not deployed with secret. |
| 16 | `retryMailQueue` | `functions/src/cron/retryMailQueue.ts:5` | `onSchedule('every 5 minutes')` (v2) | Finds pending emails where `nextAttemptAt <= now` and touches doc to re-trigger worker. | **CRON TRIGGER**. **CRITICAL RUNTIME ERROR**: Query `mail.where('status', '==', 'PENDING').where('nextAttemptAt', '<=', now)` requires missing composite index. |
| 17 | `emailRegistrations` | `functions/src/triggers/emailRegistrations.ts:5` | `onDocumentWritten('registrations/{registrationId}')` (v2) | Enqueues transactional email on registration status change (`pending`, `approved`, `waitlisted`, `rejected`, `cancelled`). | **BACKGROUND TRIGGER**. |
| 18 | `emailAttendance` | `functions/src/triggers/emailAttendance.ts:5` | `onDocumentCreated('attendance_logs/{logId}')` (v2) | Enqueues attendance confirmation email. | **BACKGROUND TRIGGER**. |
| 19 | `emailCertificates` | `functions/src/triggers/emailCertificates.ts:5` | `onDocumentWritten('certificates/{certificateId}')` (v2) | Enqueues certificate available / revoked notification emails. | **BACKGROUND TRIGGER**. |
| 20 | `sendEventReminders` | `functions/src/cron/sendEventReminders.ts:5` | `onSchedule('every 1 hours')` (v2) | Finds events in next 24 hours and enqueues reminder emails to approved attendees. | **CRON TRIGGER**. |
| 21 | `onRegistrationCancelled` | `functions/src/triggers/onRegistrationCancelled.ts:5` | `functions.firestore.document('registrations/{registrationId}').onUpdate` (v1) | Auto-promotes first waitlisted applicant when registration is cancelled, and increments event `registeredCount`. | **BACKGROUND TRIGGER**. **CRITICAL RUNTIME ERROR**: Query `registrations.where('eventId', '==', id).where('status', '==', 'waitlisted').orderBy('timestamp', 'asc')` requires missing composite index. |

### 1.2 Deployment Status: CODE EXISTS vs PRODUCTION DEPLOYED
1. **Source Code**: All 21 functions exist, are imported in `functions/src/index.ts`, and compile cleanly (`npm run build` in `functions/` exits with code 0).
2. **Repository Indicators**:
   - `.firebaserc` does **not** exist in the repository.
   - `firebase.json` defines `{ "functions": { "source": "functions" }, "firestore": { ... }, "storage": { ... } }`.
   - `firebase-tools` CLI is not installed locally (`npx firebase --version` fails).
   - Deployment status to production GCP/Firebase **cannot be verified from the local workspace**.
3. **Client-Side Fallbacks**:
   - **Event Registration**: Runs directly in client Firestore transaction (`src/app/[locale]/events/[id]/page.tsx:129`). Does not depend on Cloud Functions deployment.
   - **Check-In (`/events/[id]/checkin` and `/admin/events/[id]/checkin-desk`)**: **No fallback**. Calls `submitCheckIn` via `httpsCallable`. Fails if Cloud Functions are not deployed.
   - **Certificate Issuance & Download**: Issuance via `issueCertificates` has no automated fallback (only a manual link entry input for admins). Download via `getCertificateDownloadUrl` fails unless admin provided an external URL.
   - **Transactional Emails & Crons**: Completely dependent on Cloud Functions deployment.

### 1.3 Firestore Indexes Audit (`firestore.indexes.json` vs Actual Queries)
`firestore.indexes.json` contains 11 composite index definitions:
- `registrations`: `(eventId ASC, status ASC)`
- `registrations`: `(eventId ASC, timestamp ASC)`
- `registrations`: `(userId ASC, timestamp DESC)`
- `events`: `(state ASC, date DESC)`
- `events`: `(state ASC, createdAt DESC)`
- `point_transactions`: `(userId ASC, createdAt DESC)`
- `certificates`: `(eventId ASC, status ASC)`
- `certificates`: `(userId ASC, issuedAt DESC)`
- `pending_checkins`: `(eventId ASC, status ASC, timestamp ASC)`
- `ideas`: `(isPublic ASC, votesCount DESC)`
- `attendance_logs`: `(eventId ASC, timestamp DESC)`

**Direct Codebase Query Cross-Reference & Missing Indexes**:
1. **CRITICAL MISSING COMPOSITE INDEX 1 (`registrations`)**:
   - Query in `functions/src/triggers/onRegistrationCancelled.ts:20-25`:
     ```typescript
     db.collection('registrations')
       .where('eventId', '==', eventId)
       .where('status', '==', 'waitlisted')
       .orderBy('timestamp', 'asc')
     ```
   - Required index: `registrations` -> `eventId ASC, status ASC, timestamp ASC`.
   - Current indexes on `registrations` only have `(eventId, status)` and `(eventId, timestamp)`. Firestore cannot satisfy equality on two fields + inequality/orderBy on a third field without a 3-field composite index.
   - Consequence: Throws `FAILED_PRECONDITION` error on cancellation, permanently failing waitlist auto-promotion.
2. **CRITICAL MISSING COMPOSITE INDEX 2 (`mail`)**:
   - Query in `functions/src/cron/retryMailQueue.ts:9-13`:
     ```typescript
     db.collection('mail')
       .where('status', '==', 'PENDING')
       .where('nextAttemptAt', '<=', admin.firestore.Timestamp.now())
     ```
   - Required index: `mail` -> `status ASC, nextAttemptAt ASC`.
   - Current `firestore.indexes.json` contains **zero** definitions for `mail`.
   - Consequence: Throws `FAILED_PRECONDITION` on every 5-minute cron invocation.

### 1.4 Environment Variables & Configuration Audit
1. **`.env.example`**: Missing from repository entirely.
2. **`.env.local`**: Present (gitignored). Contains:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `RESEND_API_KEY` (`re_Vsqgf...`)
   - `SENDER_EMAIL` (`onboarding@resend.dev`)
3. **Missing Server-Side Admin Config**:
   - In `src/lib/firebase/admin.ts:7-18`, server-side Admin SDK initialization requires:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
   - All three are **missing from `.env.local`**. In SSR (`src/app/[locale]/page.tsx:31-85`), `admin.ts` falls back to `{ projectId: 'dummy-project-id' }`, causing server-side homepage queries to fail silently and render default dummy stats.
4. **Cloud Functions Runtime Secrets**:
   - `JWT_SECRET`: Missing from `.env.local`. Must be set in GCP Secret Manager for `generateCheckInToken` and `processCheckIn`.
   - `RESEND_API_KEY`: Required by `processMailQueue`. Must be configured in Secret Manager for Cloud Functions v2.

### 1.5 Automated Build & Test Toolchain
1. **Next.js Production Build (`npm run build`)**:
   - Command: `next build --webpack`
   - Result: **SUCCESS**. Compiled in 15.5s, TypeScript checked in 12.8s (0 type errors), all 22 static/dynamic routes generated.
2. **ESLint (`npm run lint`)**:
   - Command: `eslint`
   - Result: **FAILED with 71 problems (22 errors, 49 warnings)**.
   - Errors:
     - `react/no-unescaped-entities`: Unescaped quotes in `src/app/[locale]/admin/page.tsx:224`.
     - `@typescript-eslint/no-explicit-any`: Multiple explicit `any` in `src/app/[locale]/admin/structure/page.tsx` and `src/components/ui/DigitalMemberCard.tsx`.
3. **Test Suite Execution (`npm test`)**:
   - Command: `node --experimental-strip-types tests/runner.ts` (129 tests across 5 tiers)
   - Results:
     - Tier 1 (Feature Coverage): **42/42 PASS**
     - Tier 2 (Boundary & Corner Cases): **37/37 PASS**
     - Tier 3 (Cross-Feature Combinations): **8/8 PASS**
     - Tier 4 (Real-World Scenarios): **6/6 PASS**
     - Tier 5 (Production Readiness): **30/36 PASS, 6 FAIL**
   - Failure Root Causes:
     - 5 failures: `ENOENT: no such file or directory, open '.../src/app/[locale]/admin/events/[id]/qr/page.tsx'`. The test suite looks for the old `qr/page.tsx` which was refactored/moved to `checkin-desk/page.tsx`.
     - 1 failure: `tests/verify_remediations.test.ts:21` expects `src/app/[locale]/events/[id]/page.tsx` to contain client-side waitlist FIFO query `where('status', '==', 'waitlisted')`. However, waitlist promotion was moved to Cloud Function `onRegistrationCancelled.ts`.
4. **Cloud Functions Testing**:
   - Zero test files exist in `functions/`. Cloud Functions have no automated unit or integration tests.

---

## 2. Logic Chain

1. **Client vs Cloud Functions Execution**:
   - Observation 1.1 shows that `registerForEvent` and `generateCheckInToken` exist in `functions/`, but are not called in `src/`.
   - `src/app/[locale]/events/[id]/page.tsx` directly performs Firestore transactions for event registration.
   - `firestore.rules:102-111,134-141` was explicitly authored to allow authenticated clients to create registrations and increment `registeredCount`.
   - Therefore, the client has an active, working registration mechanism independent of Cloud Functions, but check-in (`submitCheckIn`), manual points (`addManualPoints`), and certificate issuing (`issueCertificates`) are strictly coupled to Cloud Functions.
2. **Double Point Minting Hazard**:
   - `submitCheckIn.ts:120` executes `transaction.update(userRef, { totalPoints: FieldValue.increment(pointsToAward) })` AND writes to `point_transactions` with `amount: pointsToAward`.
   - When that `point_transactions` document is created, the background trigger `onPointTransactionCreated.ts:22` triggers on `onCreate` and executes `await userRef.update({ totalPoints: FieldValue.increment(amount) })`.
   - Both operations increment the same field. If both functions are deployed and active, attendees receive **double points** for every attendance check-in.
3. **Database Index Gaps**:
   - `onRegistrationCancelled.ts` executes a 3-part query: `where(eventId)`, `where(status)`, `orderBy(timestamp)`.
   - In Firestore architecture, an equality check on two fields combined with ordering on a third field strictly requires a composite index containing all three fields.
   - Similarly, `retryMailQueue.ts` filters by equality on `status` and inequality on `nextAttemptAt`. Firestore requires a composite index across both fields.
   - Neither index exists in `firestore.indexes.json`. Therefore, in any real Firestore environment, these operations throw `FAILED_PRECONDITION`.
4. **Test Suite Discrepancies**:
   - Tier 1-4 tests (93 tests) run against an in-memory mock platform (`tests/engine/database.ts`), which explains why they all pass.
   - Tier 5 runs assertions directly on source file content via `readFileSync`. Because the admin QR scanning feature was renamed/refactored from `admin/events/[id]/qr/page.tsx` to `admin/events/[id]/checkin-desk/page.tsx`, the static file assertions throw `ENOENT`.

---

## 3. Caveats

1. **GCP Project Live Deployment State**: Because this workspace is inspected in CODE_ONLY network mode and lacks GCP service account credentials / Firebase CLI authentication tokens, the live deployment status of Cloud Functions in Google Cloud Project `ieeeqassim` cannot be confirmed.
2. **Email Delivery in Production**: `processMailQueue.ts` connects to Resend. While a mock mode is provided for local emulation (`FUNCTIONS_EMULATOR === 'true'`), live email dispatch requires a verified domain in Resend and valid API key.
3. **In-Memory vs Live Firestore Emulation**: Tiers 1-4 execute against an in-memory mock engine. They validate business logic flows but do not test Firestore composite index enforcement or security rules syntax.

---

## 4. Conclusion

1. **Cloud Functions Architecture**: 21 Cloud Functions exist and compile. However, there is a divergence between the documented architecture and the actual implementation:
   - Registration runs client-side, while check-in and certificates rely on Cloud Functions.
   - A critical double-counting bug exists between `submitCheckIn` and `onPointTransactionCreated`.
   - `processMailQueue` has a top-level error throw that risks breaking functions initialization.
2. **Database Indexes**: Two mandatory composite indexes are missing from `firestore.indexes.json`:
   - `registrations`: `(eventId ASC, status ASC, timestamp ASC)`
   - `mail`: `(status ASC, nextAttemptAt ASC)`
3. **Configuration & Secrets**:
   - `.env.example` is missing.
   - `.env.local` lacks Firebase Admin SDK credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`), degrading server-side homepage rendering.
   - `JWT_SECRET` is not configured.
4. **Toolchain & Quality Gates**:
   - `next build --webpack` succeeds.
   - `npm run lint` fails with 22 errors.
   - `npm test` fails 6 tests in Tier 5 due to stale file path references (`qr/page.tsx` vs `checkin-desk/page.tsx`).
   - Cloud Functions have zero automated tests.

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the observations:

```bash
# 1. Verify Cloud Functions compilation
cd functions && npm run build && cd ..

# 2. Verify Next.js production build
npm run build

# 3. Verify lint failures
npm run lint

# 4. Verify test suite execution and inspect the 6 Tier 5 failures
npm test

# 5. Run Tier 5 tests in isolation to see exact ENOENT paths
node --test --experimental-strip-types "tests/verify_*.test.ts"
```

### 5.2 Specific Files to Inspect
- `functions/src/submitCheckIn.ts:118-122` vs `functions/src/onPointTransactionCreated.ts:21-24` (Double increment verification).
- `functions/src/workers/processMailQueue.ts:8-12` (Top-level exception verification).
- `functions/src/triggers/onRegistrationCancelled.ts:20-25` vs `firestore.indexes.json` (Missing 3-field index verification).
- `functions/src/cron/retryMailQueue.ts:9-13` vs `firestore.indexes.json` (Missing mail index verification).
- `src/lib/firebase/admin.ts:7-18` vs `.env.local` (Missing Admin credentials verification).
- `tests/verify_e2e_journey.test.ts:10` and `tests/verify_remediations.test.ts:14` (Stale `qr/page.tsx` reference verification).

---

## 6. Actionable Remediation Roadmap

1. **Fix Missing Firestore Composite Indexes (`firestore.indexes.json`)**:
   Add the following entries to `firestore.indexes.json`:
   ```json
   {
     "collectionGroup": "registrations",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "eventId", "order": "ASCENDING" },
       { "fieldPath": "status", "order": "ASCENDING" },
       { "fieldPath": "timestamp", "order": "ASCENDING" }
     ]
   },
   {
     "collectionGroup": "mail",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "status", "order": "ASCENDING" },
       { "fieldPath": "nextAttemptAt", "order": "ASCENDING" }
     ]
   }
   ```
2. **Deduplicate Point Incrementing**:
   - Either remove `userRef.update({ totalPoints: FieldValue.increment(...) })` in `submitCheckIn.ts` and rely strictly on `onPointTransactionCreated`, OR remove `onPointTransactionCreated` from `index.ts` if transactions handle all mutations.
   - Standardize transaction schemas to use both `amount` and `points` consistently.
3. **Resilience in `processMailQueue.ts`**:
   - Move `RESEND_API_KEY` validation inside the function handler instead of top-level module evaluation to prevent crashing `firebase deploy` or functions initialization.
4. **Create `.env.example`**:
   - Provide a complete template documenting all client and server variables (`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `SENDER_EMAIL`).
5. **Update Stale Test Paths**:
   - Update `tests/verify_e2e_journey.test.ts` and `tests/verify_remediations.test.ts` to reference `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`.
   - Update the waitlist test assertion to recognize `functions/src/triggers/onRegistrationCancelled.ts`.
6. **Resolve ESLint Errors**:
   - Escape quotes in `src/app/[locale]/admin/page.tsx:224`.
   - Add proper type interfaces for structure members instead of `any`.
