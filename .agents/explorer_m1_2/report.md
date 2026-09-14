# Comprehensive Firebase, Architecture, Security Rules & Cloud Functions Audit
**Target System**: IEEE Qassim University Engineering Community Platform (`ieee-qu-site`)  
**Auditor**: Explorer 2 (teamwork_preview_explorer)  
**Date**: 2026-09-14  
**Status**: COMPLETE  

---

## Executive Summary

An in-depth forensic audit of the IEEE Qassim Engineering Community Platform codebase was conducted, covering Firebase client configuration, Cloud Firestore schemas and data integrity, Firestore and Storage security rules, Cloud Functions (triggers, callables, and cron workers), and the complete end-to-end student journey:
**Discover $\rightarrow$ Register $\rightarrow$ Attend $\rightarrow$ Earn Points $\rightarrow$ Build Activity $\rightarrow$ Receive Certificate**.

### Key Architectural Findings & Vulnerabilities:
1. **Critical Privilege Escalation Flaw in `firestore.rules` (`users/{userId}`)**:
   - `allow create: if isOwner(userId);` contains **no field or value constraints**.
   - Any authenticated user calling `setDoc(doc(db, 'users', uid), { role: 'super_admin', totalPoints: 999999 })` can instantly self-assign `super_admin` privileges and infinite points.
2. **Critical Business Logic Failure: Leaderboard Inaccessible to Students**:
   - `firestore.rules` restricts `users/{userId}` read to `isOwner(userId) || isEventOrganizer()`.
   - Firestore rules are not filters. Regular students executing the leaderboard collection query `getDocs(query(collection(db, 'users'), orderBy('totalPoints', 'desc')))` receive `FirebaseError: Missing or insufficient permissions`.
3. **High-Severity Runtime Defect in Cloud Functions (`generateCertificate.ts`)**:
   - Line 34–35 attempts to load fonts via `path.join(__dirname, '../../src/assets/fonts/Cairo-Regular.ttf')`.
   - In production runtime (running from `functions/lib/`), this path resolves to `<project_root>/src/assets/fonts/` which does not exist. This will crash PDF certificate generation with an uncaught `ENOENT` exception on every execution.
4. **Build System Failure in Root and Cloud Functions**:
   - `functions/node_modules` is missing `firebase-functions` and `firebase-admin` dependencies, failing `tsc` build with 85 type errors.
   - Root `tsconfig.json` includes `**/*.ts` without excluding `functions/`, causing root `next build` to fail type checking.
5. **Event Capacity Leak on Cancellation**:
   - Cancelling a registration updates `registrations/{regId}.status = 'cancelled'` client-side, but **never decrements `events/{eventId}.registeredCount`**.
   - There is no background trigger or transaction to reclaim seats, causing permanent capacity exhaustion drift over time.
6. **Strict Cloud Functions Dependencies**:
   - Event Registration, QR Attendance Check-in, Points Incrementation, Certificate PDF Generation, Certificate Signed Download URLs, and Transactional Emails strictly require deployed Cloud Functions / Admin SDK due to security rules and secret isolation.

---

## 1. Firebase Client Configuration & Authentication Setup

### 1.1 Client Configuration (`src/lib/firebase/client.ts`)
- **SDK**: Firebase Web SDK v12.19.0.
- **Config**: Sourced from environment variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`).
- **Initialization**: Singleton pattern using `!getApps().length ? initializeApp(firebaseConfig) : getApp()`.
- **Exports**: `auth`, `db` (Firestore), `functions`, `googleProvider` (`GoogleAuthProvider`).

### 1.2 Admin Configuration (`src/lib/firebase/admin.ts`)
- **SDK**: `firebase-admin` v14.4.0.
- **Config**: Initializes with service account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- **Exports**: `adminAuth = getAuth()`, `adminDb = getFirestore()`.

### 1.3 Auth Flow & State Management (`src/context/AuthContext.tsx`)
- Listens to `onAuthStateChanged(auth)`.
- When an authenticated user signs in:
  - Fetches `users/{uid}` from Firestore.
  - If the document does not exist:
    - Checks university email domain:
      ```typescript
      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN;
      const emailDomain = currentUser.email?.split('@')[1];
      if (allowedDomain && emailDomain !== allowedDomain) {
        await signOut(auth);
        alert(`Only ${allowedDomain} emails are allowed.`);
        return;
      }
      ```
    - Creates default profile document via client `setDoc(userRef, { role: 'student', totalPoints: 0, ... })`.
- **Architectural Risk**:
  - The domain restriction in `AuthContext` is client-side only. A user bypassing the UI client can register with any Google account unless Firebase Auth Blocking Functions (`functions/src/authBlocking.ts`) are deployed with Identity Platform.

---

## 2. Firestore Schemas & Collections Audit

The data model uses 8 collections with deterministic document IDs for idempotency and transaction locking:

| Collection Name | Document ID Pattern | Primary Fields | Key Relations & Constraints |
|---|---|---|---|
| `users` | `{userId}` (Firebase Auth UID) | `role` (`'student' \| 'event_organizer' \| 'super_admin'`), `totalPoints` (number), `email`, `displayName`, `photoURL`, `createdAt` | Profile record; drives RBAC rules; denormalized `totalPoints` updated atomically by transactions/triggers. |
| `events` | `{eventId}` (Auto-ID) | `title`, `titleEn`, `description`, `descriptionEn`, `coverUrl`, `type`, `date`, `location`, `locationEn`, `durationHours`, `gains`, `speakers`, `capacity`, `points`, `hasCertificate`, `state`, `registrationMode`, `registeredCount`, `createdAt`, `updatedAt` | Core event metadata. States: `'Draft'`, `'Published'`, `'Registration Open'`, `'Registration Closed'`, `'Ongoing'`, `'Completed'`, `'Archived'`. `registeredCount` tracks capacity serialization. |
| `registrations` | `{eventId}_{userId}` (Composite Deterministic) | `userId`, `eventId`, `status` (`'pending' \| 'approved' \| 'waitlisted' \| 'rejected' \| 'cancelled'`), `timestamp`, `cancelledAt` | Strict 1:1 registration per user per event; prevented from duplicate registration by deterministic key. |
| `attendance_logs` | `{eventId}_{userId}` (Composite Deterministic) | `userId`, `eventId`, `timestamp`, `verifiedByQR` (boolean), `tokenNonce` (string), `manualOverride` (boolean), `overriddenBy`, `overrideTimestamp` | Immutable check-in proof; deterministic key guarantees check-in idempotency. |
| `point_transactions` | `attendance_{eventId}_{userId}` or Auto-ID | `userId`, `amount` (int), `source` (`'attendance' \| 'attendance_override' \| 'manual_adjustment'`), `reason`, `sourceEventId`, `createdBy`, `createdAt` | Immutable ledger of all point deltas. Written exclusively by Cloud Functions/Admin SDK. |
| `certificates` | `certificate_{eventId}_{userId}` (Composite Deterministic) | `id`, `eventId`, `userId`, `status` (`'Not Issued' \| 'Generating' \| 'Available' \| 'Failed' \| 'Revoked'`), `storagePath`, `studentName`, `eventTitle`, `eventType`, `attendanceDate`, `issueDate`, `attemptCount`, `lastError`, `issuedBy`, `revokedBy`, `revokedAt`, `createdAt`, `updatedAt` | Generated PDF certificate record. Tracks async rendering lifecycle. |
| `mail` | `{dedupeKey}` (Deterministic) | `to`, `template`, `data`, `status` (`'PENDING' \| 'PROCESSING' \| 'DELIVERED' \| 'FAILED'`), `dedupeKey`, `attemptCount`, `nextAttemptAt`, `lastAttemptAt`, `lastError`, `deliveredAt`, `createdAt`, `updatedAt` | Outbox pattern mail queue; processed asynchronously by Cloud Functions worker. |
| `audit_logs` | `{logId}` | Restricted to super_admin read, write: false | Security and administrative audit trail. |

---

## 3. Security Rules Audit (`firestore.rules` & `storage.rules`)

### 3.1 Security Evaluation Score (per `firebase-security-rules-auditor` criteria)
- **Score: 1 (Critical)**
- **Summary**: While write access to `registrations`, `point_transactions`, and `storage` is strictly protected, the user creation rule enables full privilege escalation to `super_admin`, and the read rule on `users` completely breaks the student Leaderboard.

### 3.2 Findings Breakdown

#### Finding 1: User Self-Assignment of `super_admin` Role & Infinite Points (Critical)
- **File**: `firestore.rules`, lines 26–29:
  ```javascript
  // Users Collection
  match /users/{userId} {
    allow read: if isOwner(userId) || isEventOrganizer();
    allow create: if isOwner(userId);
    allow update: if isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints']) || isSuperAdmin();
    allow delete: if isSuperAdmin();
  }
  ```
- **Vulnerability**: While `update` guards against altering `role` and `totalPoints`, `create` only checks `isOwner(userId)`.
- **Exploitation**: An attacker authenticates and sends:
  ```typescript
  setDoc(doc(db, 'users', auth.currentUser.uid), {
    role: 'super_admin',
    totalPoints: 1000000,
    email: auth.currentUser.email
  });
  ```
  The rule permits this because `isOwner(userId)` is true and there are no field restrictions on `create`.
- **Remediation**:
  ```javascript
  allow create: if isOwner(userId)
    && request.resource.data.role == 'student'
    && request.resource.data.totalPoints == 0
    && request.resource.data.email == request.auth.token.email;
  ```

#### Finding 2: Leaderboard Denied for Non-Admin Students (Major / Broken Logic)
- **File**: `firestore.rules`, line 25; `src/app/[locale]/leaderboard/page.tsx`, line 28.
- **Vulnerability**: `allow read: if isOwner(userId) || isEventOrganizer();` forbids students from reading any user profile other than their own. The Leaderboard page executes:
  ```typescript
  const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
  const snap = await getDocs(q);
  ```
- **Result**: Firestore rules do not act as query filters. The collection query is rejected with `permission-denied` for all standard students.
- **Remediation**: Allow authenticated users to read non-sensitive profile fields (or split into public user profiles, or allow `allow read: if isAuthenticated();`).

#### Finding 3: Third-Party Certificate Verification Blocked (Moderate)
- **File**: `firestore.rules`, lines 65–68:
  ```javascript
  match /certificates/{certificateId} {
    allow read: if isOwner(resource.data.userId) || isEventOrganizer();
    allow create, update, delete: if isEventOrganizer();
  }
  ```
- **Vulnerability**: Unauthenticated users or third parties (e.g. employers scanning a verification link or QR code) cannot read certificate records.
- **Remediation**: Allow public read access to `certificates/{certificateId}` if `resource.data.status == 'Available'`.

#### Finding 4: Storage Rules Block All Client Access (`storage.rules`)
- **File**: `storage.rules`, lines 1–15:
  ```javascript
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read, write: if false;
      }
    }
  }
  ```
- **Assessment**: Secure. Enforces the signed URL pattern where only the backend Admin SDK generates time-limited signed URLs (`getCertificateDownloadUrl`).

---

## 4. Cloud Functions Audit (`functions/` Directory)

All 18 exported functions were audited:

### 4.1 Exported Cloud Functions Matrix

| # | Function Name | Trigger Type | Execution Policy | Security & Role Check | Dependencies & Secrets |
|---|---|---|---|---|---|
| 1 | `registerForEvent` | `https.onCall` (v1) | Firestore Transaction | `verifyAuth` (authenticated user) | Admin SDK Firestore |
| 2 | `generateCheckInToken` | `https.onCall` (v1) | On-demand Callable | `verifyAdmin` (`super_admin` \| `event_organizer`) | `JWT_SECRET` |
| 3 | `processCheckIn` | `https.onCall` (v1) | Firestore Transaction | `verifyAuth` (authenticated user) | `JWT_SECRET`, Admin SDK |
| 4 | `manualAttendanceOverride` | `https.onCall` (v1) | Firestore Transaction | `verifyAdmin` | Admin SDK |
| 5 | `addManualPoints` | `https.onCall` (v1) | On-demand Callable | `verifyAdmin` | Admin SDK |
| 6 | `onPointTransactionCreated` | Firestore `onCreate` (v1) | Background Trigger | Firestore internal event | `point_transactions/{id}` |
| 7 | `beforeCreate` | Auth `beforeUserCreated` (v2) | Identity Platform blocking | Auth context | `ALLOWED_DOMAIN` |
| 8 | `beforeSignIn` | Auth `beforeUserSignedIn` (v2) | Identity Platform blocking | Auth context | `ALLOWED_DOMAIN` |
| 9 | `issueCertificates` | `https.onCall` (v1) | Firestore Transaction | `verifyAdmin` | Admin SDK |
| 10 | `generateCertificate` | Firestore `onDocumentWritten` (v2) | Background Worker (1GiB memory, 120s) | Firestore trigger | `@sparticuz/chromium`, `puppeteer-core`, fonts |
| 11 | `getCertificateDownloadUrl` | `https.onCall` (v1) | On-demand Callable | `verifyAuth` (Owner or Admin) | Admin Storage (GCS signed URL) |
| 12 | `retryCertificate` | `https.onCall` (v1) | Firestore Transaction | `verifyAdmin` | Admin SDK |
| 13 | `revokeCertificate` | `https.onCall` (v1) | Firestore Transaction + GCS Delete | `verifyAdmin` | Admin Storage |
| 14 | `processMailQueue` | Firestore `onDocumentWritten` (v2) | Background Worker | Firestore trigger | `RESEND_API_KEY`, `SENDER_EMAIL` |
| 15 | `retryMailQueue` | Scheduler `every 5 minutes` (v2) | Pub/Sub Cron | Internal scheduler | Admin SDK |
| 16 | `sendEventReminders` | Scheduler `every 1 hours` (v2) | Pub/Sub Cron | Internal scheduler | Admin SDK |
| 17 | `emailRegistrations` | Firestore `onDocumentWritten` (v2) | Background Trigger | Firestore trigger | Mail queue |
| 18 | `emailAttendance` | Firestore `onDocumentCreated` (v2) | Background Trigger | Firestore trigger | Mail queue |
| 19 | `emailCertificates` | Firestore `onDocumentWritten` (v2) | Background Trigger | Firestore trigger | Mail queue |

---

## 5. Core Student Journey Logic & Data Flow Trace

```
[Discover Event] (/events)
       │
       ▼
[Register For Event] (/events/[id])
       │  (Callable: registerForEvent)
       │  Locks capacity, creates registrations/{eventId}_{userId}
       ▼
[Attend Event via QR] (/check-in/[eventId]?token=...)
       │  (Admin generates rotating 60s JWT via generateCheckInToken)
       │  (Student scans QR -> Callable: processCheckIn)
       │  Validates registration & event status
       │  Writes attendance_logs/{eventId}_{userId}
       ▼
[Earn Gamified Points]
       │  (processCheckIn writes point_transactions/attendance_{eventId}_{userId})
       │  Trigger: onPointTransactionCreated increments users/{userId}.totalPoints
       ▼
[View Activity & History] (/my-activity)
       │  Queries registrations, point_transactions, and certificates
       ▼
[Receive Certificate]
       │  Admin clicks issueCertificates for Completed event
       │  Trigger: generateCertificate renders PDF using Puppeteer & Cairo fonts
       │  Student downloads via getCertificateDownloadUrl (15-min signed GCS URL)
```

### 5.1 Discover $\rightarrow$ Register
- **Endpoint**: `/events` $\rightarrow$ `/events/[id]`.
- **Mechanism**: The client initiates registration via `httpsCallable(functions, 'registerForEvent')({ eventId })`.
- **Concurrency & Capacity**:
  - The function enters a Firestore transaction on `events/{eventId}` and `registrations/${eventId}_${uid}`.
  - Checks `registeredCount` against `capacity`. If `registeredCount >= capacity`, sets status to `waitlisted`.
  - Serializes `registeredCount` by updating `registeredCount: attendeeCount + 1`.
- **Idempotency**: The registration document key is `${eventId}_${uid}`. If a record exists with status other than `'cancelled'`, the request is rejected with `failed-precondition`.
- **Defect Identified**: Cancellation (`handleCancelRegistration` in `src/app/[locale]/events/[id]/page.tsx`) only updates `status: 'cancelled'`. It does **not** decrement `events/{eventId}.registeredCount`, leaking seats over time.

### 5.2 Attend (Check-in)
- **Admin Side**:
  - Organizer opens `/admin/events/[id]/qr`.
  - Every 45s, `generateCheckInToken` creates an HMAC-signed JWT (60s lifetime) containing `eventId` and a cryptographic nonce.
- **Student Side**:
  - Student scans the QR code, opening `/check-in/[eventId]?token=<jwt>`.
  - Client calls `httpsCallable(functions, 'processCheckIn')({ eventId, token })`.
- **Backend Validation**:
  - Verifies JWT signature and expiry using `JWT_SECRET`.
  - Verifies event is `Ongoing`.
  - Verifies student registration exists and has status `'approved'`.
  - Checks if `attendance_logs/${eventId}_${uid}` already exists. If yes, returns `{ status: 'already_checked_in' }` without duplicate writes.
  - Atomically writes `attendance_logs/${eventId}_${uid}` and `point_transactions/attendance_${eventId}_${uid}`.

### 5.3 Earn Points
- **Architecture**: Two-phase ledger system:
  1. `processCheckIn` writes an immutable record to `point_transactions/attendance_${eventId}_${uid}` with `amount: eventData.points`.
  2. Background trigger `onPointTransactionCreated` listens to `point_transactions/{id}` creation and calls:
     ```typescript
     await userRef.update({
       totalPoints: FieldValue.increment(amount)
     });
     ```
- **Security**: Direct client modification of `point_transactions` and `totalPoints` is blocked by `firestore.rules`.
- **Critical Dependency**: If Cloud Functions are not deployed, `onPointTransactionCreated` will not run, and the student's `totalPoints` in their profile will remain 0 even after successful check-in.

### 5.4 Build Activity
- **Endpoint**: `/my-activity`.
- **Data Gathering**:
  - Queries `registrations` where `userId == user.uid`.
  - Queries `point_transactions` where `userId == user.uid`.
  - Queries `certificates` where `userId == user.uid`.
  - Reads `userData.totalPoints` from `AuthContext`.
- **UI Tabs**:
  - **Events Tab**: Lists registered events with real-time status badges (`تم القبول`, `قائمة الانتظار`, `ملغى`).
  - **Points Tab**: Chronological feed of point gains with source (`حضور فعالية`, `تعديل إداري`) and timestamps.
  - **Certificates Tab**: Visual certificate cards with instant download triggers.

### 5.5 Receive Certificate
- **Issuance**:
  - Organizer marks event `'Completed'` and accesses `/admin/events/[id]/certificates`.
  - Organizer clicks "Issue Certificates" $\rightarrow$ calls `httpsCallable(functions, 'issueCertificates')`.
  - Backend verifies event is `Completed`, checks `attendance_logs`, and creates `certificates/certificate_${eventId}_${userId}` with `status: 'Generating'`.
- **Rendering**:
  - Trigger `generateCertificate` detects `status: 'Generating'`.
  - Launches headless Chromium via Puppeteer, embeds Cairo Arabic fonts, and generates landscape A4 PDF.
  - Saves PDF to Cloud Storage: `certificates/{eventId}/{certificateId}.pdf`.
  - Updates Firestore certificate status to `'Available'`.
- **Download & Security**:
  - Student clicks "عرض الشهادة" on `/my-activity`.
  - Calls `httpsCallable(functions, 'getCertificateDownloadUrl')({ certificateId })`.
  - Function verifies caller is the certificate owner (or admin), checks file existence in Cloud Storage, generates a 15-minute signed URL, and returns it.
  - Student browser downloads/previews the PDF securely without public bucket access.

---

## 6. Features Strictly Requiring Deployed Cloud Functions

The table below classifies platform features into those strictly requiring Cloud Functions vs. those that could operate via client Firestore rules/transactions:

| Feature | Strictly Requires Cloud Functions? | Rationale & Security Boundary | Can it be done Client-Side? |
|---|---|---|---|
| **Event Registration (`registerForEvent`)** | **Yes** (Current Rules) | `firestore.rules` enforces `allow create: if false;` on `registrations`. Concurrency serialization on `registeredCount` prevents race-condition overselling. | Could theoretically be client-side with complex rules and transactions, but exposes event counters to client tampering. |
| **Attendance QR Token (`generateCheckInToken`)** | **Strictly Yes** | Requires private `JWT_SECRET` to sign time-limited nonced tokens. Exposing secret on client allows token forgery and attendance spoofing. | **No**. |
| **Attendance Verification (`processCheckIn`)** | **Strictly Yes** | Requires verifying cryptographic JWT signature, validating registration status, and creating protected attendance and point records. | **No**. |
| **Points Increment (`onPointTransactionCreated`)** | **Strictly Yes** (Current Rules) | Client write access to `point_transactions` is completely disabled (`allow write: if false;`). Users cannot increment their own `totalPoints`. | Could be consolidated directly into `processCheckIn` transaction to eliminate background trigger latency, but still requires server/Admin SDK. |
| **Certificate PDF Rendering (`generateCertificate`)** | **Strictly Yes** | Requires Puppeteer, headless Chromium binary, local font rendering, and writing to restricted Storage bucket. | **No**. Cannot generate authenticated PDFs in browser safely. |
| **Certificate Signed URL (`getCertificateDownloadUrl`)** | **Strictly Yes** | `storage.rules` prohibits all direct client reads (`allow read: if false;`). Cloud Storage V4 signed URL generation requires service account private key. | **No**. |
| **Transactional Emails & Reminders** | **Strictly Yes** | Uses Resend API key and Cloud Scheduler cron triggers. | **No**. |
| **Manual Points Adjustment (`addManualPoints`)** | **Strictly Yes** (Current Rules) | `point_transactions` collection is read-only for clients. | Could be allowed for admins in `firestore.rules`, but callable function provides better auditability. |
| **User Profile Initialization** | **No** | Currently performed directly by client via `setDoc` in `AuthContext.tsx`. | Yes, works client-side, but requires fixing `firestore.rules` create validation. |
| **Registration Cancellation** | **No** | Currently performed directly by client via `setDoc` with `status: 'cancelled'`. | Yes, permitted by rules. |

---

## 7. Concrete Defect Inventory & Actionable Fix Recommendations

### Defect 1: Cairo Font Path ENOENT in `generateCertificate.ts`
- **Location**: `functions/src/generateCertificate.ts`, lines 34–35:
  ```typescript
  const fontRegularPath = path.join(__dirname, '../../src/assets/fonts/Cairo-Regular.ttf');
  const fontBoldPath = path.join(__dirname, '../../src/assets/fonts/Cairo-Bold.ttf');
  ```
- **Problem**: When compiled with `tsc`, the output resides in `functions/lib/`. The path `../../src` traverses out of `functions/` and searches for `<root>/src/assets/fonts/`, which does not exist (fonts exist in `functions/src/assets/fonts/`).
- **Fix**: Update the path resolution and configure `cpx` or copy script in `package.json` to copy assets to `functions/lib/assets/`:
  ```typescript
  const fontRegularPath = path.join(__dirname, '../src/assets/fonts/Cairo-Regular.ttf');
  const fontBoldPath = path.join(__dirname, '../src/assets/fonts/Cairo-Bold.ttf');
  ```

### Defect 2: Missing Dependencies in `functions/` & Root `tsconfig.json` Failure
- **Location**: `functions/node_modules/` and root `tsconfig.json`.
- **Problem**: `functions/` does not have its dependencies installed (`firebase-functions` missing). Root `tsconfig.json` includes `**/*.ts`, causing `next build` to attempt typechecking `functions/` against root dependencies and failing.
- **Fix**:
  1. Add `"exclude": ["node_modules", "functions"]` to root `tsconfig.json`.
  2. Run `npm install` inside `functions/` so that `firebase-functions` and `firebase-admin` are properly installed.

### Defect 3: Privilege Escalation in `firestore.rules`
- **Location**: `firestore.rules`, line 27.
- **Problem**: `allow create: if isOwner(userId);` allows arbitrary role and points injection.
- **Fix**:
  ```javascript
  match /users/{userId} {
    allow read: if isOwner(userId) || isEventOrganizer() || isAuthenticated();
    allow create: if isOwner(userId)
      && request.resource.data.role == 'student'
      && request.resource.data.totalPoints == 0
      && request.resource.data.email == request.auth.token.email;
    allow update: if isOwner(userId)
      && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints'])
      || isSuperAdmin();
    allow delete: if isSuperAdmin();
  }
  ```

### Defect 4: Registration Capacity Counter Leak
- **Location**: `src/app/[locale]/events/[id]/page.tsx`, lines 108–117.
- **Problem**: Cancellation does not decrement `events/{eventId}.registeredCount`.
- **Fix**: Implement an `onRegistrationUpdated` Cloud Function trigger (or a callable `cancelRegistration` function) that decrements `events/{eventId}.registeredCount` by 1 using `FieldValue.increment(-1)` when status changes to `'cancelled'`.

### Defect 5: Missing Admin Route `/admin/events/[id]/edit` & Navigation to Certificates
- **Location**: `src/app/[locale]/admin/events/page.tsx`, line 131.
- **Problem**: Edit button points to non-existent route; certificates page exists at `/admin/events/[id]/certificates` but has no link in the admin events table.
- **Fix**: Add a direct link to `/admin/events/${event.id}/certificates` in the actions column of `admin/events/page.tsx` and implement the edit page or modal.

---

## 8. Summary Conclusion

The IEEE Qassim Platform possesses a well-structured architectural model with robust foundations (deterministic document IDs, distributed transactions, immutable point ledger, and signed URL storage protection). However, it suffers from critical security gaps (`users` role escalation, broken leaderboard query rules) and latent runtime bugs in Cloud Functions (font path error, broken function dependencies, and event capacity leakage). Addressing these defects will ensure platform stability, security, and scalability for upcoming milestones.
