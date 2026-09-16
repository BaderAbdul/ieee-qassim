# Adversarial Challenger 2 — E2E Lifecycle & UX Fault Tolerance Report

**Agent**: Adversarial Challenger 2 (`challenger_prod_2`)  
**Parent Conversation ID**: `e94baf2d-564b-4a7f-a493-4178fa9a622d`  
**Date**: 2026-09-17  
**Working Directory**: `/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_2`  
**Handoff Type**: Hard (All investigations, stress harnesses, and verifications complete)

---

## 1. Observation

### 1.1 Empirical Test Suite & Execution Results
1. **Lifecycle Stress Harness (`tests/challenger_e2e_lifecycle_stress.test.ts`)**:
   - Command: `node --test --experimental-strip-types tests/challenger_e2e_lifecycle_stress.test.ts`
   - Result: `✔ 6/6 PASS in 225ms`.
   - Empirically challenges:
     - Concurrency serialization & waitlist capacity starvation.
     - Re-registration rejection in Firestore rules key-diff evaluation.
     - Pipeline disconnect between Registration Desk bulk attend and Cloud Function `issueCertificates`.
     - Race condition in Host QR Scanner leading to double point allocation.
     - Schema corruption between QR Host writes and Profile Page transactions rendering.
     - Certificate issuance scaling limits for 0, 1, and 300 attendees.

2. **UX Fault Injection Harness (`tests/challenger_ux_resilience.test.ts`)**:
   - Command: `node --test --experimental-strip-types tests/challenger_ux_resilience.test.ts`
   - Result: `✔ 7/7 PASS in 218ms`.
   - Empirically verifies:
     - 7 segment error boundaries comply with Next.js App Router contracts (`use client`, `error`, `reset()`, fallback links).
     - Component crash fault injection and recovery through `reset()`.
     - 9 streaming fallbacks mount geometric skeleton components.
     - Cumulative Layout Shift (CLS) geometry matching (`h-72 sm:h-96` hero banner, `lg:col-span-2` / `lg:col-span-1` grid).
     - Responsive directionality and elimination of `space-x-reverse`.
     - Identification of missing root `app/global-error.tsx`.

3. **Headless Browser Verification Matrix (`tests/browser_audit.mjs`)**:
   - Command: `node tests/browser_audit.mjs` (executed with headless Google Chrome 150.0.7871.114)
   - Result: `✔ 42/42 PASS (0 layout breaks, 0 RTL/LTR mismatches, 0 horizontal overflows)`.
   - Viewports audited: Mobile SM (375x667), Mobile MD (390x844), Desktop (1280x800).
   - Locales audited: Arabic (`ar`, RTL) and English (`en`, LTR) across 14 route targets.

4. **Production Webpack Compilation**:
   - Command: `npx next build --webpack`
   - Result: `✓ Compiled successfully in 13.6s` with 22 routes generated (0 TypeScript errors, 0 lint errors).

### 1.2 Identified Bugs & Architectural Vulnerabilities (Verbatim Code Citations)

1. **Defect 1 — Registration Capacity Starvation on Cancellations**:
   - In `src/app/[locale]/events/[id]/page.tsx:149-155`:
     ```typescript
     let currentAttendeeCount = eventData.registeredCount || 0;
     let newStatus = 'approved';
     if (eventData.registrationMode === 'Manual') {
       newStatus = 'pending';
     } else if (currentAttendeeCount >= (eventData.capacity || 0)) {
       newStatus = 'waitlisted';
     }
     ```
   - In `src/app/[locale]/events/[id]/page.tsx:171-173`:
     ```typescript
     transaction.update(eventRef, {
       registeredCount: increment(1)
     });
     ```
   - Observation: When a student is placed on the waitlist, `registeredCount` is still incremented by 1. If an approved student cancels, `registeredCount` decrements, but waitlisted students are not auto-promoted, and any subsequent applicant is compared against `registeredCount >= capacity`. For an event with capacity 10, if 10 approved and 10 waitlisted students register (`registeredCount = 20`), and then 5 approved students cancel (`registeredCount = 15`), the next student (#21) is incorrectly assigned `status: 'waitlisted'` because `15 >= 10`, leaving 5 empty approved seats unfilled.

2. **Defect 2 — Re-Registration Blocked by Firestore Rules Key-Diff**:
   - In `firestore.rules:151-156`:
     ```
     allow update: if isEventOrganizer() || (
       isOwner(resource.data.userId)
       && request.resource.data.status == 'cancelled'
       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'cancelledAt'])
     ) || (
       isOwner(resource.data.userId)
       && resource.data.status == 'cancelled'
       && request.resource.data.status in ['approved', 'waitlisted', 'pending']
       && !('attended' in request.resource.data)
       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId'])
     );
     ```
   - In `src/app/[locale]/events/[id]/page.tsx:157-169`:
     ```typescript
     const regData: Record<string, any> = {
       userId: user.uid,
       eventId: eventId,
       status: newStatus,
       timestamp: serverTimestamp(),
       userName: userData?.arabicFullName || userData?.displayName || user.displayName || 'Student',
       userEmail: userData?.email || user.email || '',
     };
     transaction.set(regRef, regData);
     ```
   - Observation: When a cancelled student re-registers, `transaction.set(regRef, regData)` replaces the existing document. Because `regData` omits `cancelledAt`, Firestore considers `cancelledAt` to be deleted. In Firestore Security Rules, deleted fields appear in `request.resource.data.diff(resource.data).affectedKeys()`. Because `cancelledAt` is not in the whitelist `hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId'])`, the rule evaluation evaluates to `false`, throwing `permission-denied` on re-registration.

3. **Defect 3 — Pipeline Disconnect: Registration Desk Bulk Attend Bypasses `attendance_logs`**:
   - In `src/app/[locale]/admin/events/[id]/registrations/page.tsx:125-128`:
     ```typescript
     const promises = selectedIds.map(id => 
       updateDoc(doc(db, 'registrations', id), { status: newStatus })
     );
     await Promise.all(promises);
     ```
   - In `functions/src/issueCertificates.ts:50-57, 74-76`:
     ```typescript
     for (const userId of userIds) {
       const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`);
       ...
       const [logSnap, certSnap, userSnap] = await Promise.all([
         transaction.get(logRef), ...
       ]);
       ...
       if (!data.logSnap.exists) {
         continue; // Skip, no attendance found
       }
     ```
   - In `src/app/[locale]/admin/events/[id]/certificates/page.tsx:49-51`:
     ```typescript
     const attQ = query(collection(db, 'attendance_logs'), where('eventId', '==', eventId));
     const attSnap = await getDocs(attQ);
     const userIds = attSnap.docs.map(d => d.data().userId as string);
     ```
   - Observation: When an organizer marks students as `attended` in the Registration Desk, it only mutates `registrations/{id}`. It does NOT invoke `manualAttendanceOverride` and does NOT write `attendance_logs/${eventId}_${userId}`. Consequently, those students never appear on the Certificates management page (`attQ` returns 0 docs), and even if their IDs are submitted to `issueCertificates`, `issueCertificates` skips every one of them (`logSnap.exists == false`), resulting in 0 issued certificates.

4. **Defect 4 — Race Condition on Host QR Scanner Double Scans (Batch vs Transaction)**:
   - In `src/app/[locale]/admin/events/[id]/qr/page.tsx:103-155`:
     ```typescript
     const regRef = doc(db, 'registrations', `${eventId}_${userId}`);
     const regSnap = await getDoc(regRef);
     ...
     if (regSnap.data().attended) {
       ... return;
     }
     const batch = writeBatch(db);
     ...
     batch.update(userRef, { totalPoints: increment(event.points) });
     await batch.commit();
     ```
   - Observation: In the edge scanner, check-in validation performs an unisolated read `await getDoc(regRef)` followed by a `writeBatch`. If two pending check-in requests arrive in rapid succession with the same valid token (e.g., student double-scan or network packet retry), both `getDoc` calls resolve before either `batch.commit()` executes. Both read `attended === undefined`, both construct batches, and both commit `totalPoints: increment(event.points)`, awarding the student double points (e.g. 200 points instead of 100). Unlike Cloud Function `processCheckIn.ts` which uses `db.runTransaction`, client `writeBatch` offers no isolation against dirty concurrent reads.

5. **Defect 5 — Schema Collision between QR Host and Profile Transactions View**:
   - In `src/app/[locale]/admin/events/[id]/qr/page.tsx:140-146`:
     ```typescript
     const txRef = doc(collection(db, 'point_transactions'));
     batch.set(txRef, {
       userId,
       eventId,
       points: event.points,
       type: 'earned',
       description: `حضور فعالية: ${event.title}`,
       timestamp: serverTimestamp()
     });
     ```
   - In `src/app/[locale]/profile/page.tsx:747-765` & `src/lib/types.ts:34-43`:
     ```typescript
     export interface PointTransaction {
       amount: number;
       source: PointTransactionSource;
       reason: string;
       createdAt: Timestamp | Date;
     }
     ...
     tx.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
     tx.source === 'attendance' ? ... : 'System'
     formatDateSafe(tx.createdAt, ...)
     ```
   - Observation: The QR host writes `{ points, type, description, timestamp }`, but `ProfilePage` expects `{ amount, source, reason, createdAt }`. When a student checks in via the QR host and views their profile, `tx.amount` is `undefined` (rendering a red icon with down arrow), `tx.source` is `undefined` (displaying `"System"` instead of `"Attendance"`), `tx.reason` is `undefined` (blank title), and `tx.createdAt` is `undefined` (blank timestamp).

6. **Defect 6 — Certificate Issuance Transaction Limit at Scale (300 Attendees)**:
   - In `functions/src/issueCertificates.ts:45-108`:
     A single transaction iterates over `userIds` and performs:
     - 3 reads per user (`logRef`, `certRef`, `userRef`)
     - 1 write per user (`certRef`)
   - Observation: For 300 attendees, this single transaction attempts 900 document reads and up to 300 document writes, totaling 1,200 operations. In Google Cloud Firestore, transactions are capped at 500 document operations and subject to 30-second lock timeout thresholds. Processing 300 attendees in a single `db.runTransaction` risks fatal transaction contention errors (`ABORTED: Transaction lock timeout`).

7. **Defect 7 — Absence of Root `src/app/global-error.tsx`**:
   - Observation: Zero `global-error.tsx` files exist in `src/app/` or `src/app/[locale]/`. According to Next.js App Router specifications, `src/app/[locale]/error.tsx` cannot catch errors thrown inside `src/app/[locale]/layout.tsx` (e.g., initialization crash in `NextIntlClientProvider` or `AuthProvider`). If an exception occurs during root layout rendering, the application crashes to a white screen without an error fallback.

---

## 2. Logic Chain

1. **Waitlist & Registration Starvation (Defect 1)**:
   - Observation 1.2.1 shows that `registeredCount` is incremented regardless of whether a registration is `'approved'` or `'waitlisted'`.
   - When 10 approved and 10 waitlisted users register, `registeredCount = 20`.
   - When 5 approved attendees cancel, `registeredCount` drops to 15.
   - When a new student attempts to register, line 153 checks `currentAttendeeCount >= capacity` (15 >= 10).
   - Therefore, the applicant is relegated to the waitlist even though physical capacity (5 empty seats) exists.
   - Conclusion: `registeredCount` must represent strictly approved active registrations, or waitlist promotion must be triggered synchronously upon cancellation.

2. **Re-Registration Security Rule Block (Defect 2)**:
   - Observation 1.2.2 shows that `handleCancelRegistration` writes `status: 'cancelled'` and `cancelledAt: serverTimestamp()`.
   - When the student re-registers, `handleRegister` calls `transaction.set(regRef, regData)` with keys excluding `cancelledAt`.
   - The deletion of `cancelledAt` makes `cancelledAt` an affected key under Firestore diff semantics.
   - `firestore.rules:155` enforces `affectedKeys().hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId'])`.
   - Because `'cancelledAt'` is not in that list, Firestore rejects the update with `PERMISSION_DENIED`.
   - Conclusion: Either `firestore.rules` must permit `cancelledAt` in the re-registration whitelist, or client `handleRegister` must retain `cancelledAt: FieldValue.delete()` in a compliant update schema.

3. **Registration Desk vs. Certificate Pipeline Break (Defect 3)**:
   - Observation 1.2.3 shows that the Registration Desk's bulk "attended" action updates only `registrations/{id}.status = 'attended'`.
   - `CertificatesManagementPage` queries `attendance_logs` to build the attendee list.
   - `functions/src/issueCertificates.ts:74` skips any student where `attendance_logs/${eventId}_${userId}` is missing.
   - Since the Registration Desk never writes `attendance_logs`, all students marked attended via the desk are invisible to certificate generation and skipped by Cloud Functions.
   - Conclusion: The Registration Desk bulk update must execute the `manualAttendanceOverride` cloud function or write deterministic `attendance_logs/${eventId}_${userId}` documents.

4. **Host QR Scanner Concurrency Exploitation (Defect 4)**:
   - Observation 1.2.4 shows that `src/app/[locale]/admin/events/[id]/qr/page.tsx` validates attendance using client-side `getDoc` and writes via `writeBatch`.
   - Unlike transactions, `writeBatch` does not verify that read documents remain unmodified between read and write.
   - Under concurrent requests, two scans read `attended == undefined` simultaneously, and both batches commit `increment(event.points)`.
   - Test 4 in `tests/challenger_e2e_lifecycle_stress.test.ts` reproduced this with a student receiving 200 points instead of 100.
   - Conclusion: The Edge QR Host must execute check-ins within a Firestore transaction (`runTransaction`) using deterministic document locks.

5. **Point Transaction Field Discrepancy (Defect 5)**:
   - Observation 1.2.5 shows `qr/page.tsx` writing `{ points, type, description, timestamp }` while `profile/page.tsx` consumes `{ amount, source, reason, createdAt }`.
   - In JavaScript, accessing missing properties returns `undefined`. `undefined > 0` evaluates to `false`.
   - This corrupts the transaction badge to red (negative points) and renders blank strings for reason and timestamp.
   - Conclusion: The QR Host must align its write payload with the canonical `PointTransaction` schema.

6. **Scaling Beyond 500 Operations in Certificate Issuance (Defect 6)**:
   - Observation 1.2.6 demonstrates that `issueCertificates` executes $4N$ operations inside a single transaction.
   - At $N = 300$, this generates 1,200 operations.
   - Firestore transactions have a 500-write limit and strict lock duration boundaries.
   - Conclusion: `issueCertificates` must chunk the attendee array into batches of 50–100 or delegate processing to Cloud Tasks.

---

## 3. Caveats

- **CODE_ONLY Network Constraint**: All verifications were conducted locally in the project environment using Node 24 native test runner, in-memory transactional database engines, and headless Google Chrome on local ports.
- **Physical QR Optics**: Real-world camera frame drops or lens glare during mobile camera scanning cannot be simulated via code-level harnesses, though token validation, nonce generation, and expiration mechanics were thoroughly validated.
- **No other caveats**: All 13 empirical challenge tests and 42 browser layout checks were executed directly.

---

## 4. Conclusion

**Verdict: HIGH RISK / REMEDIATION REQUIRED BEFORE MASS ENROLLMENT**

While the baseline platform demonstrates outstanding UI styling, bilingual parity (RTL/LTR), and fast Next.js production builds (13.6s), our adversarial challenge uncovered **7 critical bugs and architectural vulnerabilities** in the End-to-End User Journey and UX fault tolerance:

1. **Waitlist Starvation**: Cancellations leave capacity unfilled because `registeredCount` counts waitlisted applicants as occupied seats.
2. **Re-registration Security Rejection**: Re-registering after cancellation fails with `permission-denied` due to a key-diff mismatch on `cancelledAt` in `firestore.rules`.
3. **Attendance Pipeline Disconnect**: Admin bulk "Mark as Attended" in the Registration Desk does not create `attendance_logs`, causing Cloud Function `issueCertificates` to issue 0 certificates.
4. **QR Double Point Race Condition**: Edge Host scanner uses non-transactional `writeBatch`, allowing concurrent duplicate scans to grant double points.
5. **Schema Mismatch**: Point transactions written by the QR Host crash the Profile Activity UI with `undefined` values and red error icons.
6. **Certificate Scaling Limit**: Issuing certificates to 300 students in a single transaction generates 1,200 operations, exceeding Firestore transaction limits.
7. **Missing Root Error Boundary**: Lack of `src/app/global-error.tsx` leaves root layout provider failures unhandled.

---

## 5. Verification Method

To independently execute and verify all challenger stress harnesses and findings, run the following commands in the project root (`/home/bader/Documents/IEEE QU SITE`):

### 5.1 Run E2E Lifecycle Stress Harness (6 Empirical Challenges)
```bash
node --test --experimental-strip-types tests/challenger_e2e_lifecycle_stress.test.ts
```
**Expected Output**:
```
✔ CHALLENGE 1: Concurrent registrations serialize correctly, but waitlist starves capacity on cancellations (21ms)
✔ CHALLENGE 2: Re-registration after cancellation triggers Firestore security rule key-diff rejection (1ms)
✔ CHALLENGE 3: Registration Desk bulk "Mark as Attended" fails to write attendance_logs, causing issueCertificates to issue 0 certificates (5ms)
✔ CHALLENGE 4: Non-transactional QR Host check-in allows duplicate point awards under concurrent requests (11ms)
✔ CHALLENGE 5: Point transaction schema written by QR host corrupts Profile Activity UI rendering (1ms)
✔ CHALLENGE 6: Certificate issuance boundary tests (0 attendees, 1 attendee, non-existent, 300 attendees) (3ms)
ℹ tests 6 | pass 6 | fail 0
```

### 5.2 Run UX Resilience & Fault Injection Harness (7 Challenges)
```bash
node --test --experimental-strip-types tests/challenger_ux_resilience.test.ts
```
**Expected Output**:
```
✔ UX Resilience: All 7 segment error boundaries comply with Next.js App Router contract (18ms)
✔ UX Fault Injection: Error boundary logic handles arbitrary, undefined, or digest-bearing errors (1ms)
✔ UX Resilience Defect: Missing root "app/global-error.tsx" leaves root layout crashes unhandled (1ms)
✔ UX Resilience: All 9 streaming fallbacks exist and mount matching geometric skeletons (9ms)
✔ CLS Defense: Event Details Skeleton geometry strictly matches Event Details Page geometry (4ms)
✔ Mobile Responsiveness: Logical CSS properties enforced; space-x-reverse eliminated (3ms)
✔ UX Fault Tolerance: Non-existent /my-activity route redirects to /profile (1ms)
ℹ tests 7 | pass 7 | fail 0
```

### 5.3 Run Headless Chrome Layout & Responsive Audit (42 Checks)
```bash
node tests/browser_audit.mjs
```
**Expected Output**:
`✔ ALL BROWSER INSPECTIONS PASSED (42/42 checks passed across Mobile SM, Mobile MD, Desktop; 0 overflows, 0 broken layouts)`

### 5.4 Run Full Production Compilation
```bash
npx next build --webpack
```
**Expected Output**:
`✓ Compiled successfully in ~13-14s` with `22/22` pages generated.
