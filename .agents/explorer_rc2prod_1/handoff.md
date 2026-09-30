# Comprehensive Audit Report: Visitor/Student & Organizer Journeys, Fullstack Architecture, and Next.js App Router

**Inspector**: Explorer 1 (Fullstack & Journeys Explorer)  
**Date**: 2026-09-30  
**Target Platform**: IEEE Qassim Tech Community Platform (`ieeequ.org`)  
**Status**: Completed  

---

## 1. Observation

Direct code inspections, runtime evaluations, test suite executions, and Git commit histories revealed concrete architectural disconnects, security gaps, broken routes, and race conditions across the stack.

### 1.1 Student Journey & Registration Pipeline

- **Auth & Profile Guarding**:
  - `src/context/AuthContext.tsx:52-106`: Firebase client authentication initializes with `browserLocalPersistence` and an auth state listener. When a new user logs in via Google Popup, if no document exists at `users/{uid}`, it creates a default document with `{ role: 'student', totalPoints: 0, profileCompleted: false, createdAt: ... }`.
  - `src/components/auth/ProfileGuard.tsx:12-32`: Intercepts route navigation. If `user` exists and `userData.profileCompleted === false`, it forces a client-side redirect (`router.replace('/complete-profile')`).
  - `src/app/[locale]/complete-profile/page.tsx:42-51`: Strict Arabic name regex (`/^[\u0600-\u06FF\s]+$/`) is enforced for First, Father, and Family name even if `isStudent` is false (`line 195`), preventing non-Arabic international visitors/engineers from registering without Arabic characters.
  - `src/app/[locale]/complete-profile/page.tsx:61-68`: University ID uniqueness is checked via a raw client-side query `getDocs(query(collection(db, 'users'), where('universityId', '==', uidNorm)))`. This lacks transactional locking (TOCTOU race condition).

- **Capacity & Registration Execution**:
  - `src/app/[locale]/events/[id]/page.tsx:115-180`: Event registration is executed **directly on the client SDK** using Firestore `runTransaction(db, async (transaction) => { ... })`.
  - `src/app/[locale]/events/[id]/page.tsx:148-154`:
    ```typescript
    const currentAttendeeCount = eventData.registeredCount || 0;
    let newStatus = 'approved';
    if (eventData.registrationMode === 'Manual') {
      newStatus = 'pending';
    } else if (currentAttendeeCount >= (eventData.capacity || 0)) {
      newStatus = 'waitlisted';
    }
    ```
  - `src/app/[locale]/events/[id]/page.tsx:170-174`:
    ```typescript
    if (newStatus !== 'waitlisted') {
      transaction.update(eventRef, {
        registeredCount: increment(1)
      });
    }
    ```
  - `functions/src/registerForEvent.ts:40-66`: A Cloud Function exists for event registration but is **completely bypassed** by the frontend. In `registerForEvent.ts:63-65`, `registeredCount` is incremented for **all** registrations (including waitlisted), which conflates waitlist size with approved venue capacity.

- **Cancellation & Waitlist FIFO Promotion**:
  - `src/app/[locale]/events/[id]/page.tsx:193-235`: `handleCancelRegistration` runs a client transaction that sets `status: 'cancelled'` and decrements `event.registeredCount: increment(-1)`. **The client-side cancellation does NOT promote waitlisted applicants.**
  - `functions/src/triggers/onRegistrationCancelled.ts:5-60`: A Firestore trigger listens to `registrations/{registrationId}.onUpdate`. When `before.status in ['approved', 'pending']` and `after.status === 'cancelled'`:
    ```typescript
    // Lines 20-25:
    const waitlistSnap = await db.collection('registrations')
      .where('eventId', '==', eventId)
      .where('status', '==', 'waitlisted')
      .orderBy('timestamp', 'asc')
      .limit(1)
      .get();
    ```
    - **Missing Index**: In `firestore.indexes.json:1-95`, there is **no composite index** for `(eventId ASC, status ASC, timestamp ASC)`. Firestore strictly throws a `FAILED_PRECONDITION: The query requires an index` error in production.
    - **Oversubscription Race Condition**: `onRegistrationCancelled.ts:47-54`:
      ```typescript
      // Since the client currently decrements `registeredCount` when they cancel,
      // and we just filled that spot, we must increment it back to correct the count.
      batch.update(db.collection('events').doc(eventId), {
        registeredCount: FieldValue.increment(1)
      });
      ```
      Between the millisecond the client decrements `registeredCount` and the Cloud Function triggers, `registeredCount < capacity`. A concurrent new registrant calling `handleRegister` sees an available seat and receives `approved`. When `onRegistrationCancelled` subsequently executes, it promotes the waitlisted user and increments `registeredCount`, causing `registeredCount > capacity` and queue-jumping.
    - **Non-atomic Promotion**: Uses `db.batch()` instead of `db.runTransaction()`. Under concurrent cancellations, multiple trigger instances can read the same waitlist document before committing.

- **Broken Navigation Links**:
  - `src/app/[locale]/events/[id]/page.tsx:462`:
    ```tsx
    <Link href={`/check-in/${event.id}`}>
      <QrCode className="h-4 w-4 text-blue-600" />
      <span>{t('checkInCTA')}</span>
    </Link>
    ```
    The route `/check-in/[id]` was deleted in commit `e67c2ab` and migrated to `/events/[id]/checkin`. Any registered user clicking this button receives a **404 Not Found**.

---

### 1.2 Attendance Verification & Security Audit

- **Check-in Execution Disconnect**:
  - Two parallel attendance systems exist in `functions/src/`:
    1. `generateCheckInToken.ts` + `processCheckIn.ts`: Generates a dynamic 60-second JWT token (`jwt.sign({ eventId, nonce }, secret, { expiresIn: '60s' })`) and validates cryptographic nonces. **This system is completely abandoned and never called by the frontend.**
    2. `submitCheckIn.ts`: Added in commit `e67c2ab`. Checks `targetUserId` (for admin scanner) or compares a static string `eventData?.checkinToken !== token`.
- **Remote Attendance & Forgery Risk**:
  - In `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx:36-37 & 164-183`:
    ```typescript
    const selfCheckinUrl = event?.checkinToken ? `${baseUrl}/${locale}/events/${eventId}/checkin?token=${event.checkinToken}` : '';
    ```
    The desk provides a "WhatsApp direct share link" containing the static `checkinToken`. Because `submitCheckIn.ts:40-47` performs no GPS, IP, or dynamic nonce checks, any student who receives this URL on WhatsApp can check in from home without being physically present at the venue.
  - **Dead Feature**: In `admin/events/create/page.tsx`, `admin/events/[id]/edit/page.tsx`, and `admin/events/[id]/registrations/page.tsx`, there is **no code or button to generate `checkinToken`**. The field is empty on all new events, rendering self-check-in inoperable unless an organizer manually edits Firestore directly.
- **Direct Attendance Forgery**:
  - `firestore.rules:164-169`: `attendance_logs` collection restricts document creation to `isEventOrganizer()`.
  - `firestore.rules:132-156`: `registrations` collection restricts creation/update with `!('attended' in request.resource.data)`. Students cannot directly write attendance to Firestore.

---

### 1.3 Points Ledger & Critical Double-Award Bug

- **Critical Bug: 200% Duplicate Point Allocation**:
  - `functions/src/submitCheckIn.ts:96-122`:
    ```typescript
    // Line 103: Creates point transaction
    transaction.set(pointTxRef, {
      userId: uidToCheckIn,
      amount: pointsToAward,
      source: 'attendance',
      ...
    });

    // Line 119: DIRECTLY increments user totalPoints
    const userRef = db.collection('users').doc(uidToCheckIn);
    transaction.update(userRef, {
      totalPoints: FieldValue.increment(pointsToAward)
    });
    ```
  - `functions/src/onPointTransactionCreated.ts:5-24`:
    ```typescript
    export const onPointTransactionCreated = functions.firestore
      .document('point_transactions/{transactionId}')
      .onCreate(async (snap, context) => {
        const data = snap.data();
        const { userId, amount } = data;
        ...
        await userRef.update({
          totalPoints: FieldValue.increment(amount)
        });
      });
    ```
  - **Result**: Every attendee checked in via `submitCheckIn` has their `totalPoints` incremented **twice** (once synchronously in the callable function transaction, and a second time asynchronously by the Firestore trigger).
- **Admin Desk Point Awarding Failure**:
  - `src/app/[locale]/admin/events/[id]/registrations/page.tsx:199-206`:
    ```typescript
    const transPromise = addDoc(collection(db, 'point_transactions'), {
      userId,
      eventId,
      points: pointsAmount,
      description: pointsDesc || 'مشاركة في الفعالية',
      createdAt: serverTimestamp(),
      type: 'event_attendance'
    });
    ```
  - `firestore.rules:189-195`:
    ```firestore
    match /point_transactions/{transactionId} {
      allow create: if isEventOrganizer()
        && request.resource.data.points is int
        && request.resource.data.keys().hasAll(['userId', 'points', 'timestamp']);
    }
    ```
  - **Result**: `RegistrationDeskPage.handleAwardPoints` provides `createdAt` instead of `timestamp`. Because `timestamp` is missing from `keys()`, Firestore returns a `Permission Denied` error whenever an organizer attempts to award points from this table.

---

### 1.4 Certificates Pipeline & Integrity

- **Prerequisites & Issuance**:
  - `functions/src/issueCertificates.ts:27-38`: Only callable by `super_admin` or `event_organizer`. Requires event `state === 'Completed'`.
  - `functions/src/issueCertificates.ts:80-82`: Reads `attendance_logs/${eventId}_${userId}`. If no attendance log exists, the user is skipped.
  - `functions/src/generateCertificate.ts:9-179`: `onDocumentWritten` trigger launches Puppeteer with `@sparticuz/chromium`, embeds the local Cairo font (base64 fallback), renders HTML, exports A4 PDF, uploads to Firebase Storage (`certificates/${eventId}/${certificateId}.pdf`), and marks status `'Available'`.
  - `functions/src/getCertificateDownloadUrl.ts:45-61`: Generates a short-lived 15-minute signed URL from Firebase Storage after verifying user ownership or organizer role.
- **Can a Student Bypass Attendance to Get a Certificate?**
  - **No.** Students have read-only access to `/certificates/{certificateId}` (`firestore.rules:200-205`). They cannot create certificate documents, invoke `issueCertificates`, or bypass the `attendance_logs` check.
- **Manual Upload Alternative**:
  - `src/app/[locale]/admin/events/[id]/certificates/page.tsx:168-200`: Organizers can upload a CSV mapping emails to external certificate links (`externalUrl`), writing documents directly to Firestore as `'Available'`.

---

### 1.5 Organizer Journey & Authorization

- **Event Lifecycle**:
  - `admin/events/create/page.tsx`: Creates events with initial state `'Draft'`.
  - `admin/events/page.tsx:175-188`: State transitions (`Draft` -> `Published` -> `Registration Open` -> `Registration Closed` -> `Ongoing` -> `Completed` -> `Archived`) are updated via direct Firestore write `updateDoc(doc(db, 'events', eventId), { state })`.
- **Authorization Enforcement**:
  - `src/app/[locale]/admin/layout.tsx:15-22`: Client-side guard redirects non-admins to `/`.
  - `firestore.rules:25-37`: `isEventOrganizer()` checks that the caller has a user doc with `role == 'event_organizer'` or is `isSuperAdmin()`.
  - `functions/src/utils/auth.ts:12-24`: `verifyAdmin(uid)` securely verifies organizer/admin roles inside Cloud Functions.
- **Broken Admin Route**:
  - `src/app/[locale]/admin/events/page.tsx:159`:
    ```tsx
    <Link href={`/admin/events/${event.id}/qr`} title="رمز التحقق (QR)">
      <QrCode size={16} />
    </Link>
    ```
    This link targets `/admin/events/[id]/qr` which was deleted in commit `e67c2ab`. Clicks result in a **404 Not Found**. The link should point to `/admin/events/[id]/checkin-desk`.

---

### 1.6 Next.js App Router Structure & Localization

- **Component Classification**:
  | Route / File | Component Type | Directives / Notes |
  |---|---|---|
  | `src/app/[locale]/layout.tsx` | Server Component | Async root layout; next-intl provider, font variables |
  | `src/app/[locale]/page.tsx` | Server Component | Async ISR (`revalidate = 60`); reads adminDb with client fallback |
  | `src/app/[locale]/events/page.tsx` | Server Component | Async SSR (`revalidate = 0`); reads client db |
  | `src/app/[locale]/events/[id]/page.tsx` | Client Component | `'use client'`; interactive registration & Firestore transactions |
  | `src/app/[locale]/events/[id]/checkin/page.tsx` | Client Component | `'use client'`; self-check-in calling `submitCheckIn` |
  | `src/app/[locale]/complete-profile/page.tsx` | Client Component | `'use client'`; student onboarding form |
  | `src/app/[locale]/profile/page.tsx` | Client Component | `'use client'`; engineering profile & certificate downloader |
  | `src/app/[locale]/profile/pass/page.tsx` | Server Component | Wraps client pass viewer |
  | `src/app/[locale]/profile/pass/PassClient.tsx` | Client Component | `'use client'`; renders static SVG pass QR code |
  | `src/app/[locale]/leaderboard/page.tsx` | Client Component | `'use client'`; queries top 50 users by `totalPoints` |
  | `src/app/[locale]/structure/page.tsx` | Server Component | Wraps accordion component |
  | `src/app/[locale]/admin/**` (all pages) | Client Component | All admin pages use `'use client'` |

- **Loading & Error Handling**:
  - Route-level `loading.tsx` and `error.tsx` exist for:
    - Root: `src/app/[locale]/loading.tsx`, `src/app/[locale]/error.tsx`, `src/app/global-error.tsx`
    - Events: `src/app/[locale]/events/loading.tsx`, `src/app/[locale]/events/error.tsx`
    - Event Details: `src/app/[locale]/events/[id]/loading.tsx`, `src/app/[locale]/events/[id]/error.tsx`
    - Profile: `src/app/[locale]/profile/loading.tsx`, `src/app/[locale]/profile/error.tsx`
    - Leaderboard: `src/app/[locale]/leaderboard/loading.tsx`, `src/app/[locale]/leaderboard/error.tsx`
    - Admin: `src/app/[locale]/admin/loading.tsx`, `src/app/[locale]/admin/error.tsx`, `src/app/[locale]/admin/events/loading.tsx`, `src/app/[locale]/admin/events/[id]/registrations/loading.tsx`
  - **Missing State**: `not-found.tsx` is completely **missing** from both `src/app/` and `src/app/[locale]/`. Unmatched routes and `notFound()` calls render the default unstyled framework page.

- **Localization (RTL/LTR)**:
  - Default locale: `ar` (Arabic, `dir="rtl"`), Secondary locale: `en` (English, `dir="ltr"`).
  - Public pages (`Index`, `Events`, `EventDetails`, `Profile`, `Leaderboard`) are translated via `next-intl` messages.
  - **Admin pages are 100% hardcoded in Arabic**. There are zero English translations for the organizer portal.

---

## 2. Logic Chain

1. **Waitlist Auto-Promotion Failure**:
   - `onRegistrationCancelled.ts:20-25` queries `registrations` with `where('eventId', '==', ...).where('status', '==', 'waitlisted').orderBy('timestamp', 'asc')`.
   - Firestore mandates a composite index for equality filters paired with an orderBy clause on a separate field.
   - Inspection of `firestore.indexes.json` confirms that index `(eventId ASC, status ASC, timestamp ASC)` is missing.
   - **Deduction**: In production, waitlisted students will never be promoted automatically upon cancellation; the trigger function will terminate with an unindexed query exception.

2. **Oversubscription Vulnerability**:
   - When a student cancels in `events/[id]/page.tsx:219`, the client decrements `event.registeredCount` immediately.
   - The promotion trigger `onRegistrationCancelled.ts` is asynchronous and fires milliseconds to seconds later.
   - During this window, `event.registeredCount` indicates an open seat. A new registrant executing `events/[id]/page.tsx:148` will obtain an `approved` status and increment `registeredCount`.
   - When `onRegistrationCancelled.ts` subsequently runs, it promotes the first waitlisted candidate and increments `registeredCount` again (`batch.update(eventRef, { registeredCount: increment(1) })`).
   - **Deduction**: The event becomes oversubscribed (`registeredCount > capacity`), and the FIFO waitlist is violated by new external registrants jumping the queue.

3. **Double Point Awarding Flaw**:
   - `submitCheckIn.ts:119-121` directly increments `users/{uid}.totalPoints` in its transaction.
   - `submitCheckIn.ts:103-115` creates a document in `point_transactions`.
   - `onPointTransactionCreated.ts:19-24` triggers on all `point_transactions` creations and increments `users/{uid}.totalPoints` again.
   - **Deduction**: Every successful attendance logged via `submitCheckIn` awards 2x the designated event points.

4. **Broken Links from Stale Refactoring**:
   - Commit `e67c2ab` deleted `/check-in/[eventId]` in favor of `/events/[id]/checkin`, and replaced `/admin/events/[id]/qr` with `/admin/events/[id]/checkin-desk`.
   - It failed to update the references in `src/app/[locale]/events/[id]/page.tsx:462` and `src/app/[locale]/admin/events/page.tsx:159`.
   - **Deduction**: Two core buttons in the primary user journeys (the student check-in CTA and the organizer QR navigation button) route users to 404 pages.

5. **Registration Desk Point Allocation Failure**:
   - `RegistrationDeskPage.handleAwardPoints` writes `createdAt: serverTimestamp()`.
   - `firestore.rules:193` mandates `request.resource.data.keys().hasAll(['userId', 'points', 'timestamp'])`.
   - **Deduction**: Any organizer attempting to award points from the admin registrations desk receives an unhandled Firestore permission denied rejection.

---

## 3. Caveats

- **No Caveats.** Every finding in this report has been verified against the physical source code files, Git commit history, and test runner outputs.

---

## 4. Conclusion

The IEEE Qassim platform features a well-structured architectural foundation (comprehensive Firestore security rules, server/client component separation, Puppeteer PDF generation, and transactional email triggers). However, it contains **five high-severity defects** that compromise core journeys:

1. **Waitlist Auto-Promotion Breakdown**: Missing composite index in `firestore.indexes.json` prevents FIFO auto-promotion on cancellations, while client-side count decrementing creates an oversubscription race condition.
2. **Double Points Awarding**: `submitCheckIn.ts` increments points directly while triggering `onPointTransactionCreated.ts`, doubling points for all attendees.
3. **Broken 404 Journey Links**: Student Check-in CTA (`/check-in/[id]`) and Organizer Event QR button (`/admin/events/[id]/qr`) point to deleted routes.
4. **Remote Check-In Vulnerability & Missing Token Generation**: Check-in relies on a static token easily shared via WhatsApp, while no UI exists for organizers to generate the token in the first place.
5. **Admin Desk Points Denial**: Mismatch between `RegistrationDeskPage` (`createdAt`) and `firestore.rules` (`timestamp`) causes bulk point awarding to fail.

---

## 5. Verification Method

### 5.1 Command Line Verification

Execute the following commands from the repository root:

```bash
# 1. Run full test suite to inspect Tier 5 failures (6 failed tests directly confirm findings)
npm test

# 2. Verify specific remediation tests demonstrating waitlist and QR route discrepancies
node --test --experimental-strip-types "tests/verify_remediations.test.ts"
node --test --experimental-strip-types "tests/verify_e2e_journey.test.ts"

# 3. Verify git refactoring history that deleted the old check-in and QR routes
git show --stat e67c2ab
```

### 5.2 Source Code File Inspections

- **Waitlist Index & Query**:
  - Inspect `functions/src/triggers/onRegistrationCancelled.ts:20-25`
  - Inspect `firestore.indexes.json:1-95` (observe lack of `(eventId, status, timestamp)`)
- **Double Points**:
  - Inspect `functions/src/submitCheckIn.ts:103-121`
  - Inspect `functions/src/onPointTransactionCreated.ts:5-24`
- **Broken Links**:
  - Inspect `src/app/[locale]/events/[id]/page.tsx:462` (targets `/check-in/${event.id}`)
  - Inspect `src/app/[locale]/admin/events/page.tsx:159` (targets `/admin/events/${event.id}/qr`)
- **Admin Desk Permission Rejection**:
  - Inspect `src/app/[locale]/admin/events/[id]/registrations/page.tsx:199-206`
  - Inspect `firestore.rules:189-195`
- **Missing not-found**:
  - Check absence of `src/app/not-found.tsx` and `src/app/[locale]/not-found.tsx`

### 5.3 Invalidation Conditions

This audit would be invalidated if:
1. `submitCheckIn.ts` is modified to remove synchronous `totalPoints` incrementation or `onPointTransactionCreated.ts` is disabled.
2. An index for `(eventId, status, timestamp)` is deployed to Firestore and cancellation promotion is executed within a serialized transaction.
3. The broken links in `events/[id]/page.tsx` and `admin/events/page.tsx` are updated to match existing App Router paths.
