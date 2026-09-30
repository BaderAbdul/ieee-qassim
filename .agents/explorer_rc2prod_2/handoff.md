# Comprehensive Security, Authentication, and Authorization Audit Report
**Target System**: IEEE Qassim Platform (`IEEE QU SITE`)  
**Auditor**: Explorer 2 (Security & Firebase Explorer)  
**Date**: 2026-09-30  
**Scope**: Authentication, ProfileGuard, Firestore Security Rules (`firestore.rules`), Storage Security Rules (`storage.rules`), Admin Route Protection, and Backend API / Cloud Function Authorization.

---

## 1. Observation

### 1.1 Authentication & Domain Configuration
1. **Google Auth Provider Setup**:
   - Location: `src/lib/firebase/client.ts:22-26`
   ```typescript
   // Setup Google Auth Provider
   export const googleProvider = new GoogleAuthProvider();
   // We'll restrict domain later during the sign-in flow or via custom params
   // googleProvider.setCustomParameters({ hd: "university.edu" });
   ```
   *Observation*: The hosted domain parameter (`hd`) is explicitly commented out.

2. **Identity Platform Blocking Functions**:
   - Location: `functions/src/authBlocking.ts:5-13`
   ```typescript
   export const beforeCreate = beforeUserCreated((_event) => {
     // Allow all users to register regardless of domain
     return;
   });

   export const beforeSignIn = beforeUserSignedIn((_event) => {
     // Allow all users to sign in regardless of domain
     return;
   });
   ```
   *Observation*: No blocking checks or email domain restrictions exist at the Firebase Authentication layer. Any valid Google account (e.g. `@gmail.com`, `@qu.edu.sa`, `@outlook.com`) can register and sign in.

3. **User Document Provisioning on Auth**:
   - Location: `src/context/AuthContext.tsx:71-81`
   ```typescript
   const newUserData: UserData = {
     role: 'student',
     totalPoints: 0,
     email: currentUser.email,
     displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
     photoURL: currentUser.photoURL || null,
     createdAt: new Date().toISOString(),
     profileCompleted: false,
   };
   await setDoc(userRef, newUserData, { merge: true });
   ```
   *Observation*: Initial signup assigns `role: 'student'`, `totalPoints: 0`, and `profileCompleted: false`.

4. **ProfileGuard Behavior**:
   - Location: `src/components/auth/ProfileGuard.tsx:13-32`
   ```typescript
   // Super admins do not need to complete profile
   if (userData.role === 'super_admin') {
     if (pathname.includes('/complete-profile')) router.replace('/');
     return;
   }
   // If profile is not completed and they are not on the complete-profile page
   if (userData.profileCompleted === false && !pathname.includes('/complete-profile')) {
     router.replace('/complete-profile');
   }
   ```
   *Observation*: Non-superadmin users with `profileCompleted: false` are gated and redirected to `/complete-profile`.

5. **Profile Completion Differentiation (Qassim vs Non-Qassim)**:
   - Location: `src/app/[locale]/complete-profile/page.tsx:53-75, 95-112`
   ```typescript
   // Step 1: Is Student Selection
   if (isStudent) {
     // Enforces 9-digit University ID format and uniqueness query
     if (!/^\d{9}$/.test(uidNorm)) newErrors.universityId = t('errors.universityIdFormat');
     if (!college) newErrors.college = t('errors.required');
     if (!major) newErrors.major = t('errors.required');
     if (!academicLevel) newErrors.academicLevel = t('errors.required');
   }
   // Step 2: Payload construction
   const updateData: Record<string, string | boolean | null> = {
     firstName: firstName.trim(),
     fatherName: fatherName.trim(),
     familyName: familyName.trim(),
     arabicFullName: `${firstName.trim()} ${fatherName.trim()} ${familyName.trim()}`,
     isQassimStudent: isStudent,
     profileCompleted: true,
     profileCompletedAt: new Date().toISOString(),
   };
   if (isStudent) {
     updateData.universityId = universityId.trim();
     updateData.college = college;
     updateData.major = major;
     updateData.academicLevel = academicLevel;
   }
   await updateDoc(userRef, updateData);
   ```
   *Observation*: When `isStudent === false`, `universityId`, `college`, `major`, and `academicLevel` are omitted. Only the Arabic tripartite name is validated and saved. `profileCompleted` is set to `true`, successfully satisfying `ProfileGuard` and releasing non-Qassim users without lockout.

---

### 1.2 Firestore Security Rules (`firestore.rules`)

1. **Helper Functions & Role Resolution**:
   - Location: `firestore.rules:25-37`
   ```firestore
   function isSuperAdmin() {
     return isAuthenticated() && (
       (request.auth.token.email_verified == true && request.auth.token.email in ['admin@ieeequ.org', 'bader@ieeequ.org']) ||
       (hasUserDoc() && getUserData().role == 'super_admin')
     );
   }

   function isEventOrganizer() {
     return isAuthenticated() && (
       isSuperAdmin() ||
       (hasUserDoc() && getUserData().role == 'event_organizer')
     );
   }
   ```
   *Observation*: Super admin status can be achieved via hardcoded verified email or `users/{uid}.role == 'super_admin'`. Event organizers are derived from `users/{uid}.role == 'event_organizer'`.

2. **Users Collection Rules**:
   - Location: `firestore.rules:51-86`
   ```firestore
   allow read: if isAuthenticated();

   allow create: if isSuperAdmin() || (
     isOwner(userId)
     && request.resource.data.role == 'student'
     && request.resource.data.totalPoints == 0
     && (!('email' in request.resource.data) || request.resource.data.email == request.auth.token.email)
     && request.resource.data.keys().hasOnly([ ... ])
     ...
   );

   allow update: if isSuperAdmin() || (
     isEventOrganizer()
     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['totalPoints'])
     && isPositiveInt(request.resource.data.totalPoints)
   ) || (
     isOwner(userId)
     && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints', 'badges', 'isAdmin'])
     ...
   );

   allow delete: if isSuperAdmin();
   ```
   *Observation*:
   - Regular users cannot set `role` or `totalPoints` upon creation or update.
   - `isEventOrganizer()` is allowed to update `totalPoints` directly on any user document if the value is a positive integer. There is NO check preventing organizers from updating their OWN document (`userId == request.auth.uid`), nor is there any upper bound or rate limiting on `totalPoints`.
   - All authenticated users can read all user profile fields (`allow read: if isAuthenticated();`), exposing student numbers (`universityId`) to any signed-in user.

3. **Events Collection Rules**:
   - Location: `firestore.rules:98-114`
   ```firestore
   allow read: if resource.data.state != 'Draft' || isEventOrganizer();

   allow update: if isEventOrganizer() || (
     isAuthenticated()
     && resource.data.state == 'Registration Open'
     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount'])
     && (
        request.resource.data.registeredCount == resource.data.registeredCount + 1 ||
        request.resource.data.registeredCount == resource.data.registeredCount - 1
     )
     && request.resource.data.registeredCount >= 0
   );

   allow create, delete: if isEventOrganizer();
   ```
   *Observation*:
   - Any non-draft event is publicly readable by anyone (even unauthenticated).
   - Any event organizer can update or delete ANY event. There is no `ownerId` / `creatorId` scoped check.
   - Any authenticated user can modify `registeredCount` by `+/- 1` directly on active events.

4. **Registrations Collection Rules**:
   - Location: `firestore.rules:120-159`
   ```firestore
   allow get: if isAuthenticated() && (
     isEventOrganizer() ||
     resource == null ||
     resource.data.userId == request.auth.uid ||
     registrationId.matches('^.+_' + request.auth.uid + '$')
   );

   allow list: if isEventOrganizer() || (
     isAuthenticated() && resource.data.userId == request.auth.uid
   );

   allow create: if isAuthenticated()
     && request.resource.data.userId == request.auth.uid
     && registrationId == (request.resource.data.eventId + '_' + request.auth.uid)
     && request.resource.data.status in ['approved', 'waitlisted', 'pending']
     && !('attended' in request.resource.data)
     && request.resource.data.keys().hasAll(['userId', 'eventId', 'status', 'timestamp'])
     && request.resource.data.keys().hasOnly(['userId', 'eventId', 'status', 'timestamp', 'userName', 'userEmail', 'universityId']);

   allow update: if isEventOrganizer() || (
     isOwner(resource.data.userId)
     && request.resource.data.status == 'cancelled'
     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'cancelledAt'])
   ) || (
     isOwner(resource.data.userId)
     && resource.data.status == 'cancelled'
     && request.resource.data.status in ['approved', 'waitlisted', 'pending']
     && !('attended' in request.resource.data)
     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId', 'cancelledAt'])
   );
   ```
   *Observation*:
   - Users cannot create registrations for other users (`userId == request.auth.uid` and deterministic ID).
   - Users cannot write `attended: true` or update their status to `attended`.
   - On creation, `request.resource.data.status in ['approved', 'waitlisted', 'pending']` is accepted directly from the client without verifying whether the event is at capacity.
   - On re-registration after cancellation, the student can set `status: 'approved'` directly, bypassing waitlists.

5. **Attendance Logs Collection**:
   - Location: `firestore.rules:164-169`
   ```firestore
   allow read: if isOwner(resource.data.userId) || isEventOrganizer();
   allow create: if isEventOrganizer()
     && request.resource.data.keys().hasAll(['eventId', 'userId', 'timestamp']);
   allow update, delete: if isSuperAdmin();
   ```
   *Observation*: Students cannot write attendance logs directly. Organizers can create attendance logs directly from the client without verifying event status or registration.

6. **Point Transactions Collection**:
   - Location: `firestore.rules:189-195`
   ```firestore
   allow read: if isOwner(resource.data.userId) || isEventOrganizer();
   allow create: if isEventOrganizer()
     && request.resource.data.points is int
     && request.resource.data.keys().hasAll(['userId', 'points', 'timestamp']);
   allow update, delete: if false; // Strict immutability
   ```
   - Client code in `src/app/[locale]/admin/events/[id]/registrations/page.tsx:199-206`:
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
   *Observation*: The security rule requires key `'timestamp'` and type check on `'points'`. The client code sends `'createdAt'` instead of `'timestamp'`. This write fails permission checks when executed by an organizer client.
   - Trigger code in `functions/src/onPointTransactionCreated.ts:8-14`:
   ```typescript
   const data = snap.data();
   const { userId, amount } = data;
   if (!userId || typeof amount !== 'number') return null;
   ```
   *Observation*: The trigger checks for `amount`, whereas the rule checks for `points`.

7. **Certificates Collection**:
   - Location: `firestore.rules:200-205`
   ```firestore
   allow read: if isOwner(resource.data.userId)
     || isEventOrganizer()
     || (resource != null && resource.data.status == 'Available');
   allow create, update, delete: if isEventOrganizer();
   ```
   *Observation*: Organizers can create and update certificates directly. Available certificates are publicly readable to support verification.

8. **Mail Queue & Audit Logs**:
   - Location: `firestore.rules:253-260`
   ```firestore
   match /mail/{mailId} {
     allow read, write: if false;
   }
   match /audit_logs/{logId} {
     allow read: if isSuperAdmin();
     allow write: if false;
   }
   ```
   *Observation*: Completely locked down against direct client write. Only Cloud Functions / Admin SDK can write.

---

### 1.3 Storage Security Rules (`storage.rules`)
- Location: `storage.rules:1-15`
  ```firestore
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read, write: if false;
      }
      match /certificates/{eventId}/{certificateId} {
        allow read, write: if false; 
      }
    }
  }
  ```
- Location: `src/app/[locale]/admin/events/create/page.tsx:58-63`
  ```typescript
  const res = await fetch('https://api.cloudinary.com/v1_1/jhjhfrnr/image/upload', {
    method: 'POST',
    body: formData, // contains upload_preset: 'Ieee_events'
  });
  ```
- Location: `functions/src/generateCertificate.ts:147-150` & `functions/src/getCertificateDownloadUrl.ts:56-60`
  *Observation*:
  - Firebase Storage rejects all direct client reads and writes (`allow read, write: if false;`).
  - Certificates are saved via `admin.storage().bucket()` (Admin SDK) and accessed exclusively via short-lived (15-min) signed URLs generated by `getCertificateDownloadUrl`.
  - Event cover images do NOT use Firebase Storage; they are uploaded to Cloudinary using an unauthenticated public upload preset (`Ieee_events`).
  - User avatars are sourced from Google Auth (`photoURL`).

---

### 1.4 Admin Route Protection & Backend API Authorization
1. **Client-Side Route Guarding**:
   - Location: `src/app/[locale]/admin/layout.tsx:15-38`
   ```typescript
   useEffect(() => {
     if (!loading) {
       if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
         router.replace('/');
       }
     }
   }, [user, userData, loading, router]);
   ```
   *Observation*:
   - `/admin/*` is protected exclusively on the client side via React context in `AdminLayout`.
   - There are NO Next.js server actions, NO edge middleware authentication checks, and NO Next.js API routes (`/api/*`). Static JS bundles for admin pages are served to any client.

2. **Backend Cloud Functions Authorization**:
   - Location: `functions/src/utils/auth.ts:12-24`
   ```typescript
   export const verifyAdmin = async (uid: string) => {
     const userSnap = await admin.firestore().collection('users').doc(uid).get();
     if (!userSnap.exists) throwUnauthorized('User profile not found.');
     const role = userSnap.data()?.role;
     if (role !== 'event_organizer' && role !== 'super_admin') {
       throwUnauthorized('Admin access required.');
     }
     return { uid, role };
   };
   ```
   - Cloud Functions enforcing `verifyAdmin`:
     - `addManualPoints`: requires `role === 'super_admin'`.
     - `manualAttendanceOverride`: requires `role in ['super_admin', 'event_organizer']`.
     - `issueCertificates`: requires `role in ['super_admin', 'event_organizer']`.
     - `revokeCertificate`: requires `role in ['super_admin', 'event_organizer']`.
     - `generateCheckInToken`: requires `role in ['super_admin', 'event_organizer']`.
   *Observation*: Server-side Cloud Functions strictly verify caller credentials against Firestore `users/{uid}.role` via Firebase Admin SDK.

3. **Check-In Vulnerability (Static QR Token Exposure)**:
   - Location: `src/app/[locale]/events/[id]/checkin/page.tsx:43-47`
   ```typescript
   const submitCheckInFn = httpsCallable(functions, 'submitCheckIn');
   const response = await submitCheckInFn({ eventId, token });
   ```
   - Location: `functions/src/submitCheckIn.ts:40-47`
   ```typescript
   if (isAdmin && targetUserId) {
     uidToCheckIn = targetUserId.replace('ieee-qu-user:', '');
   } else {
     if (!token || typeof token !== 'string') throwFailedPrecondition('Invalid or missing token.');
     if (eventData?.checkinToken !== token) throwFailedPrecondition('Check-in link is invalid or expired.');
   }
   ```
   - Location: `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx:36`
   ```typescript
   const selfCheckinUrl = event?.checkinToken ? `${baseUrl}/${locale}/events/${eventId}/checkin?token=${event.checkinToken}` : '';
   ```
   *Observation*:
   - `submitCheckIn` compares the provided `token` against `eventData.checkinToken` stored on the event document.
   - In `firestore.rules:99`, any non-draft event is publicly readable by anyone.
   - Any student registered for the event can read `events/{eventId}.checkinToken` directly from Firestore (or inspecting the webpage state) and submit check-in remotely without scanning the QR code at the physical venue.
   - The secure dynamic JWT QR system implemented in `functions/src/generateCheckInToken.ts` and `functions/src/processCheckIn.ts` is bypassed because the frontend connects to `submitCheckIn` instead.

---

## 2. Logic Chain

```
[Observation: Google Auth has no hd parameter, authBlocking returns void]
   │
   ▼
[Inference 1: Any Google account can authenticate regardless of email domain. No domain restriction exists.]

[Observation: CompleteProfile differentiates isStudent true vs false; ProfileGuard checks profileCompleted]
   │
   ▼
[Inference 2: Non-Qassim members choose isStudent=false, enter Arabic name, set profileCompleted=true, and pass ProfileGuard without lockout.]

[Observation: firestore.rules users.update allows isEventOrganizer() to modify totalPoints with any positive int]
   │
   ▼
[Inference 3: An event organizer can directly update their own totalPoints to any number via client SDK without constraint. Self-points inflation vulnerability.]

[Observation: firestore.rules registrations.create trusts client-supplied status in ['approved', 'waitlisted', 'pending']]
   │
   ▼
[Inference 4: A client can write status='approved' directly to /registrations, bypassing event capacity checks and waitlists.]

[Observation: firestore.rules events.read allows public read of all fields of non-draft events]
   AND
[Observation: submitCheckIn compares student-supplied token against events/{eventId}.checkinToken]
   │
   ▼
[Inference 5: Because the entire event document is publicly readable, checkinToken is exposed to any client. A student can read the token and check in remotely without being present at the event.]

[Observation: storage.rules blocks all reads and writes; certificates use signed URLs generated by Admin SDK]
   │
   ▼
[Inference 6: Storage is secure against unauthorized client writes and leaks, but covers rely on an insecure third-party unsigned Cloudinary preset.]

[Observation: Next.js admin routes are gated solely by client-side AdminLayout component state]
   AND
[Observation: Backend Cloud Functions and Firestore security rules independently enforce role checks]
   │
   ▼
[Inference 7: While the admin UI bundle is sent to the client, backend data operations are defended in depth by Firestore rules and Admin SDK role checks, except for the specific rule gaps noted above.]
```

---

## 3. Vulnerability Matrix

| Vulnerability ID | Severity | Category | Affected File(s) & Line(s) | Description | Impact |
|---|---|---|---|---|---|
| **VULN-01** | **High** | Attendance Forgery / State Leak | `firestore.rules:99`, `functions/src/submitCheckIn.ts:44-46`, `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx:36` | `checkinToken` is stored on the publicly readable event document. Any registered student can read the token via Firestore client SDK and call `submitCheckIn` remotely without attending the event. | Remote attendance forgery; unauthorized points accumulation. |
| **VULN-02** | **High** | Gamification Manipulation | `firestore.rules:74-78` | Event organizers are granted client-side write access to `users.totalPoints` with any positive integer. The rule does not check `userId != request.auth.uid`, allowing organizers to award themselves arbitrary points. | Organizer leaderboard manipulation and self-points inflation. |
| **VULN-03** | **Medium** | Business Logic / Capacity Bypass | `firestore.rules:137, 150-156`, `src/app/[locale]/events/[id]/page.tsx:149-168` | Client creates registrations directly in Firestore. The rule trusts `request.resource.data.status in ['approved', 'waitlisted', 'pending']` without verifying capacity against `events/{id}.capacity`. A student can also cancel and re-register directly as `approved`. | Overbooking of venue capacity; waitlist circumvention. |
| **VULN-04** | **Medium** | Schema Desynchronization / Data Integrity | `firestore.rules:193`, `src/app/[locale]/admin/events/[id]/registrations/page.tsx:199-206`, `functions/src/onPointTransactionCreated.ts:9` | Rules require `'timestamp'` and `'points'`, whereas the admin client writes `'createdAt'`, causing direct writes to fail. Furthermore, the Cloud Function trigger expects `'amount'`, ignoring documents written with `'points'`. | Broken manual point awarding from registration desk; desynchronized point ledger. |
| **VULN-05** | **Medium** | PII Exposure | `firestore.rules:52` | `allow read: if isAuthenticated();` on `/users/{userId}` exposes university IDs (`universityId`), email addresses, college, and major of all registered students to any logged-in user. | Student identity scraping and privacy violation. |
| **VULN-06** | **Low** | Asset Injection / Quota Exhaustion | `src/app/[locale]/admin/events/create/page.tsx:58-63` | Uses an unauthenticated, unsigned Cloudinary upload preset (`Ieee_events`) in client source code. | Malicious file uploads to Cloudinary; storage quota exhaustion. |
| **VULN-07** | **Low** | Information Disclosure | `src/app/[locale]/admin/layout.tsx:15-38` | Admin route protection exists solely in client React state. Admin page components and metadata are bundled in client JavaScript. | Admin dashboard structure and internal workflow visibility to unauthorized users. |

---

## 4. Caveats

1. **Assumptions on Deployment Environment**:
   - The audit assumes Firebase Cloud Functions are deployed with environment secrets (`JWT_SECRET`) properly configured in Google Cloud Secret Manager.
   - If `JWT_SECRET` is missing in runtime, `generateCheckInToken` and `processCheckIn` throw internal errors.
2. **Third-Party Services**:
   - Cloudinary account credentials and preset permissions were inspected via source code only; backend Cloudinary access control settings cannot be directly verified in CODE_ONLY mode.
3. **Identity Platform Upgrade**:
   - `authBlocking.ts` specifies Identity Platform dependencies. If the Firebase project has not upgraded to Identity Platform, blocking functions are inactive. Regardless, the functions are empty pass-throughs.

---

## 5. Conclusion

1. **Authentication & ProfileGuard**:
   - Confirmed: There is NO domain restriction blocking Google login. Any Google account can sign in.
   - Confirmed: `ProfileGuard` and `complete-profile` properly accommodate non-Qassim users without locking them out.
2. **Authorization & Route Security**:
   - Server-side defense-in-depth is largely intact via Cloud Functions and Firestore rules. An unauthorized user cannot execute admin actions (modifying event states, changing roles, issuing certificates, or updating settings) simply by tampering with the client UI.
3. **Critical Remediation Priorities**:
   - The primary security risk is **VULN-01 (Check-in Token Exposure)**: Student self-check-in must either utilize the signed dynamic JWT token architecture (`processCheckIn`) or store `checkinToken` in a private subcollection (e.g. `/events/{eventId}/private/checkin`) accessible only by organizers.
   - **VULN-02 (Organizer Self-Points)**: Disallow direct client writes to `users.totalPoints`; require all point adjustments to go through `addManualPoints` or verify `request.auth.uid != userId`.
   - **VULN-03 (Registration Capacity Bypass)**: Route registration creation exclusively through the backend Cloud Function `registerForEvent` and restrict `/registrations` client writes, or enforce capacity validation in rules.

---

## 6. Concrete Remediation Recommendations

### Recommendation 1: Fix Check-in Token Exposure (VULN-01)
Migrate student self-check-in to the already-implemented dynamic JWT verification flow:
- In `src/app/[locale]/events/[id]/checkin/page.tsx`, call `processCheckIn` instead of `submitCheckIn`.
- In `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`, generate QR tokens using `generateCheckInToken` (which signs a 60-second JWT with a cryptographic nonce) rather than printing a static token stored on the public event document.
- In `firestore.rules`, if static check-in links are retained, move `checkinToken` to a private subcollection:
  ```firestore
  match /events/{eventId}/private/checkin {
    allow read, write: if isEventOrganizer();
  }
  ```

### Recommendation 2: Eliminate Organizer Client-Side Points Write (VULN-02)
Remove direct client-side update access to `totalPoints` in `firestore.rules`:
```firestore
// Change in match /users/{userId}:
allow update: if isSuperAdmin() || (
  isOwner(userId)
  && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints', 'badges', 'isAdmin'])
  ...
);
```
Require organizers to use `addManualPoints` Cloud Function exclusively, which validates caller permissions, logs transactions to the immutable ledger, and prevents self-awarding.

### Recommendation 3: Enforce Capacity on Registrations (VULN-03)
Enforce that event registration creation occurs exclusively via the `registerForEvent` Cloud Function (which safely locks event capacity in a transaction), and disallow direct client-side creation in `firestore.rules`:
```firestore
match /registrations/{registrationId} {
  allow read: if isEventOrganizer() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow write: if isEventOrganizer(); // Clients register via registerForEvent Cloud Function
}
```

### Recommendation 4: Align Point Transaction Schema (VULN-04)
Standardize field naming across client, rules, and Cloud Functions:
- Use `amount` and `timestamp` (or `createdAt`) consistently across `point_transactions`.
- In `functions/src/onPointTransactionCreated.ts`, accept both `amount` and `points`:
  ```typescript
  const amount = data.amount ?? data.points;
  ```

### Recommendation 5: Protect Sensitive PII (VULN-05)
Move `universityId` to the existing `/users/{userId}/private/{docId}` subcollection so that public leaderboard queries against `/users` only return public identity fields (`displayName`, `photoURL`, `totalPoints`, `badges`).

---

## 7. Verification Method

### 7.1 Automated Test Execution
Run the native test suite:
```bash
node --test --experimental-strip-types tests/verify_security_rules.test.ts
node --test --experimental-strip-types tests/verify_adversarial_security_concurrency.test.ts
node --test --experimental-strip-types tests/verify_performance_bounds.test.ts
```

### 7.2 Independent Rule Verification Commands
1. Verify no domain restriction in client or blocking functions:
   ```bash
   grep -rn "university.edu" src/lib/firebase/client.ts
   cat functions/src/authBlocking.ts
   ```
2. Verify ProfileGuard onboarding logic:
   ```bash
   grep -rn "isStudent" src/app/[locale]/complete-profile/page.tsx
   ```
3. Verify event token exposure:
   ```bash
   grep -n "allow read: if resource.data.state != 'Draft'" firestore.rules
   grep -n "checkinToken" functions/src/submitCheckIn.ts
   ```
4. Verify organizer totalPoints rule:
   ```bash
   sed -n '74,85p' firestore.rules
   ```

### 7.3 Invalidation Conditions
This audit's conclusions would be invalidated if:
1. Firebase Auth is configured in Google Cloud Console with restrictive Identity Platform OAuth scopes or third-party SAML restrictions not tracked in this repository.
2. Direct client writes to `/registrations` are completely disabled in production deployment in favor of `registerForEvent`.
