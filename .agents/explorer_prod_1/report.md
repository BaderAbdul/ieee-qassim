# Security & Data Integrity Audit Report: IEEE Qassim Platform Production Readiness

**Auditor:** Explorer 1 (Security & Data Integrity Specialist)  
**Date:** 2026-09-17  
**Scope:** `firestore.rules`, `storage.rules`, Next.js 16 Proxy (`src/proxy.ts`), Admin Route Protection (`src/app/[locale]/admin/*`), and Privileged Authority Boundaries (`functions/src/*`).

---

## 1. Executive Summary & Security Score

A comprehensive red-team and static security analysis was conducted on the IEEE Qassim Community Platform codebase. The platform features an ambitious architecture combining Next.js 16.3.5 client-side rendering, Google Cloud Firestore, and Firebase Cloud Functions.

However, several **Critical (Severity 1)** and **Major (Severity 2)** security vulnerabilities were identified in the current security rules and access control configuration:

1. **Catastrophic Public Data Leakage in Registrations:** In `firestore.rules` line 68, `allow read` contains `|| true;`, making the entire database of event registrations, attendee identities, and statuses readable by any unauthenticated visitor on the open internet.
2. **Horizontal Privilege Escalation & Role Hijacking via Event Organizers:** In `users/{userId}` update rules, any user with `role == 'event_organizer'` has unrestricted write authority to all user profiles, permitting an organizer to elevate their own role (or any other user's role) to `'super_admin'`.
3. **Registration Status Forgery & Anti-Tampering Deficit:** On registration creation, students can supply arbitrary statuses (`'approved'`, `'waitlisted'`, `'pending'`) and forge administrative fields (e.g. `attended: true`), bypassing organizer approval and event capacity thresholds.
4. **Denial of Service (DoS) via Unconstrained Event Counter Manipulation:** Authenticated users can increment/decrement `events/{eventId}.registeredCount` repeatedly without creating registrations, enabling trivial capacity depletion attacks.
5. **Admin Route Edge Defense Vacuum:** Next.js 16 Proxy (`src/proxy.ts`) performs zero session or role validation, delegating 100% of admin route protection to client-side `useEffect` redirection.

### Security Auditor Evaluation (JSON)

```json
{
  "score": 1,
  "summary": "Critical data exposure and privilege escalation vulnerabilities identified. The registrations collection is world-readable via an unconditional '|| true' clause, event organizers can escalate privileges to super_admin on any user document, and students can forge registration approval and attendance states.",
  "findings": [
    {
      "check": "The Update Bypass & Authority Source",
      "severity": "critical",
      "issue": "In /users/{userId}, allow update grants isEventOrganizer() unrestricted write access across all fields on any user document. Any organizer can alter 'role' to 'super_admin'.",
      "recommendation": "Restrict organizer writes strictly to 'totalPoints' with integer type checks. Reserve 'role' modifications strictly for isSuperAdmin()."
    },
    {
      "check": "Authority Source & Business Logic",
      "severity": "critical",
      "issue": "In /registrations/{registrationId}, line 68 contains '|| true;', allowing unauthenticated public reads of all student registration documents.",
      "recommendation": "Eliminate '|| true;' immediately. Restrict read access strictly to event organizers and registration owners (resource.data.userId == request.auth.uid)."
    },
    {
      "check": "Authority Source & Field-Level Security",
      "severity": "major",
      "issue": "In /registrations/{registrationId}, client creation allows request.resource.data.status in ['approved', 'waitlisted', 'pending'] and permits injection of sensitive fields like 'attended: true'.",
      "recommendation": "Enforce status based on event document registrationMode ('Manual' -> 'pending'). Restrict keys to strictly ['userId', 'eventId', 'status', 'timestamp'] on creation."
    },
    {
      "check": "Storage Abuse & Resource Exhaustion/DoS",
      "severity": "major",
      "issue": "In /events/{eventId}, any authenticated user can repeatedly update 'registeredCount' (+1 or -1) without registering, allowing artificial capacity exhaustion.",
      "recommendation": "Require event state to be 'Registration Open' and tightly couple capacity bounds, or transition registration to Cloud Functions / transactional rules."
    },
    {
      "check": "Type Safety & Storage Abuse",
      "severity": "major",
      "issue": "Missing string length limits, type enforcement, and payload size bounds across /users, /ideas, and /pending_checkins, exposing Firestore to DoS and document bloat.",
      "recommendation": "Add explicit type guards ('is string', 'is int') and maximum string length constraints on all user-submitted fields."
    }
  ]
}
```

---

## 2. In-Depth Vulnerability Analysis: Firestore & Storage Rules

### 2.1 Users Collection (`/users/{userId}`)

#### Existing Rule:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isSuperAdmin() || (
    isOwner(userId)
    && request.resource.data.role == 'student'
    && request.resource.data.totalPoints == 0
    && (!('email' in request.resource.data) || request.resource.data.email == request.auth.token.email)
  );
  allow update: if isSuperAdmin() || isEventOrganizer() || (
    isOwner(userId)
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints'])
  );
  allow delete: if isSuperAdmin();

  match /private/{docId} {
    allow read, write: if isOwner(userId) || isEventOrganizer();
  }
}
```

#### Vulnerabilities:
1. **Organizer Role Escalation (Critical):**
   - Condition: `isSuperAdmin() || isEventOrganizer() || (...)`
   - Because `isEventOrganizer()` appears as a top-level `||` branch without an `affectedKeys()` constraint, an authenticated user whose profile currently has `role: 'event_organizer'` can issue a client update modifying their own document (or any other user's document) to `{ role: 'super_admin' }`.
   - Because `functions/src/utils/auth.ts` and Firestore security rules derive super admin authority directly from `users/{uid}.role`, this allows an organizer to seize total control of the system.
2. **Unbounded Field Injection on Update & Create (Major):**
   - When a student updates their profile, the rule only checks `!affectedKeys().hasAny(['role', 'totalPoints'])`.
   - A student can inject arbitrary administrative or metadata flags: `{ isAdmin: true, isVolunteer: true, verified: true, badges: ['engineering_leader'] }`.
   - A student can inject a 1 MB payload string into any arbitrary field name, causing document storage exhaustion.
3. **Broad Read Access & PII Exposure (Moderate):**
   - `allow read: if isAuthenticated();` enables any student to query `collection('users')` and harvest university IDs (`universityId`), full Arabic names, phone/email, and academic data.
   - The subcollection `/private/{docId}` is dead code (never read or written by `src/` or `functions/`).

---

### 2.2 Events Collection (`/events/{eventId}`)

#### Existing Rule:
```javascript
match /events/{eventId} {
  allow read: if resource.data.state != 'Draft' || isEventOrganizer();
  allow update: if isEventOrganizer() || (
    isAuthenticated()
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount'])
    && (
       request.resource.data.registeredCount == resource.data.registeredCount + 1 ||
       request.resource.data.registeredCount == resource.data.registeredCount - 1
    )
    && request.resource.data.registeredCount >= 0
  );
  allow create, delete: if isEventOrganizer();
}
```

#### Vulnerabilities:
1. **Uncoupled Counter Tampering & DoS (Major):**
   - The rule permits any authenticated user to mutate `registeredCount` up or down by 1 in an isolated request without creating a registration.
   - A simple loop script can artificially inflate `registeredCount` until `registeredCount >= capacity`, falsely reporting that the event is full and blocking genuine student registrations.
   - Conversely, an attacker can decrement `registeredCount` down to 0, corrupting dashboard metrics.
2. **Missing Schema & Range Validation on Event Creation (Minor):**
   - Organizers can create events with negative capacity, invalid state enums, or unbounded description strings.

---

### 2.3 Registrations Collection (`/registrations/{registrationId}`)

#### Existing Rule:
```javascript
match /registrations/{registrationId} {
  allow read: if isEventOrganizer()
    || (resource != null && isOwner(resource.data.userId))
    || true;
  allow create: if isAuthenticated() 
    && request.resource.data.userId == request.auth.uid
    && registrationId == (request.resource.data.eventId + '_' + request.auth.uid)
    && request.resource.data.status in ['approved', 'waitlisted', 'pending']; 
  allow update: if isEventOrganizer() || (
    isOwner(resource.data.userId)
    && request.resource.data.status == 'cancelled'
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'cancelledAt'])
  );
  allow delete: if isEventOrganizer();
}
```

#### Vulnerabilities:
1. **Public Leakage via `|| true;` (Critical):**
   - Line 68 unconditionally evaluates to `true`.
   - Every registration record in the entire database is readable anonymously without authentication via `getDocs(collection(db, 'registrations'))`.
2. **Client-Side Self-Approval (Major):**
   - `request.resource.data.status in ['approved', 'waitlisted', 'pending']` gives the client complete discretion over the status value.
   - Even when an event specifies `registrationMode: 'Manual'`, a student can directly submit `status: 'approved'`.
   - Even when an event is full (`registeredCount >= capacity`), a student can submit `status: 'approved'` instead of being waitlisted.
3. **Attendance & Integrity Forgery on Creation (Major):**
   - The `create` rule does not enforce `hasOnly()` on the keys of `request.resource.data`.
   - A malicious student can include `{ attended: true, attendedAt: request.time }` upon registering, which compromises the integrity of attendance verification.
4. **Permanent Re-Registration Lockout (Logic Bug):**
   - When a student cancels their registration and later decides to re-register, the frontend (`events/[id]/page.tsx` line 164) executes `transaction.set(regRef, regData)` on the existing document.
   - Firestore classifies `set()` on an existing document as an `update`.
   - The update rule strictly requires `request.resource.data.status == 'cancelled'`, causing re-registration attempts to fail with `permission-denied`.

---

### 2.4 Certificates Collection (`/certificates/{certificateId}`)

#### Existing Rule:
```javascript
match /certificates/{certificateId} {
  allow read: if isOwner(resource.data.userId) || isEventOrganizer() || (resource != null && resource.data.status == 'Available');
  allow create, update, delete: if isEventOrganizer();
}
```

#### Assessment:
- **Strengths:** Non-organizers/students cannot create, update, or delete certificates (`allow create, update, delete: if isEventOrganizer();`).
- **Public Verification:** Reading is allowed if `status == 'Available'`. This is necessary for public credential verification (e.g. sharing certificate links on LinkedIn or QR verification).
- **Hardening Needed:** Ensure organizers can only create certificates with valid schema, preventing corrupted state.

---

### 2.5 Storage Rules (`storage.rules`)

#### Existing Rule:
```javascript
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

#### Assessment:
- **Current Security:** Maximum lockdown (100% of client reads and writes are rejected).
- **Backend Access:** PDF generation and signed URLs operate via Google Cloud Storage Admin SDK (`@google-cloud/storage` in Cloud Functions), which bypasses `storage.rules`.
- **Production Assessment:** 
  - Direct client uploads are currently blocked. If the application later introduces client uploads (e.g. event banners, student avatars), rules must strictly enforce:
    1. Content-Type regex (`image/(jpeg|png|webp)`).
    2. Byte size caps (e.g. <= 5MB for banners, <= 2MB for avatars).
    3. Document ownership and role constraints.
    4. Explicit prevention of HTML/SVG/executable uploads (mitigating Stored XSS).

---

## 3. Admin Route Protection Audit

### 3.1 Next.js 16 Proxy (`src/proxy.ts`)

```typescript
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  matcher: ['/', '/(ar|en)/:path*']
};
```

#### Architectural Reality:
- **Next.js 16 Convention:** `proxy.ts` replaces `middleware.ts`.
- **Firebase Auth Behavior:** Standard Firebase Web Client stores authentication tokens in browser IndexedDB/LocalStorage. The browser does NOT send these tokens in HTTP headers or cookies during static document requests.
- **Consequence:** `src/proxy.ts` cannot inspect Firebase Auth tokens unless an HTTP session cookie is explicitly synced. Therefore, `src/proxy.ts` allows requests for `/ar/admin/*` to pass through to the Next.js runtime.

### 3.2 Client-Side Guard (`src/app/[locale]/admin/layout.tsx`)

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer') {
        router.push('/');
      }
    }
  }, [user, userData, loading, router]);

  if (loading || !user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }
  ...
```

#### Security Assessment:
1. **Client Content Flash:**
   - **Verified Clean:** The layout returns a loading spinner and refuses to render `children` whenever `loading || !user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')`. No protected UI elements or data records flash on screen during unauthorized visits.
2. **History Pollution:**
   - The layout uses `router.push('/')`. If a non-admin clicks "Back" in their browser, they get stuck in a redirect loop. It should use `router.replace('/')`.
3. **Child Page Vulnerabilities:**
   - Sub-pages (`admin/page.tsx`, `admin/events/page.tsx`, `admin/events/[id]/registrations/page.tsx`) perform direct Firestore `getDocs()` calls inside `useEffect`.
   - **Crucial Invariant:** The client layout guard is a UX navigation boundary, NOT a security boundary. True security rests 100% on `firestore.rules`.

### 3.3 Server Actions & Route Handlers

- **Verification:** The project contains **zero** Next.js Server Actions (`'use server'`) and **zero** Next.js Route Handlers (`src/app/api/.../route.ts`).
- **Cloud Functions:** All privileged backend logic runs through Firebase Cloud Functions (`functions/src/*`). In `functions/src/utils/auth.ts`, `verifyAdmin(uid)` securely verifies the caller's role against Firestore on Google's trusted infrastructure.

---

## 4. Hardened Production `firestore.rules` Design

The hardened rules below eliminate all identified vulnerabilities:
- Eliminates `|| true;` on registrations.
- Strictly locks role escalation: only `super_admin` can modify `role` or `isAdmin`.
- Enforces registration status validation against event configuration.
- Enforces strict field whitelisting (`hasOnly()`), type safety, and string size constraints.
- Fixes re-registration after cancellation.
- Hardens event counter adjustments.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================================
    // HELPER FUNCTIONS & AUTHENTICATION UTILITIES
    // ============================================================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function hasUserDoc() {
      return isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

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

    // Validation Helpers
    function isStringWithMax(val, maxLen) {
      return val is string && val.size() <= maxLen;
    }

    function isPositiveInt(val) {
      return val is int && val >= 0;
    }

    // ============================================================================
    // USERS COLLECTION
    // ============================================================================
    match /users/{userId} {
      // Authenticated users can read profiles for leaderboard, team displays & search
      allow read: if isAuthenticated();

      // Create: Students can create their initial profile only as 'student' with 0 points
      allow create: if isSuperAdmin() || (
        isOwner(userId)
        && request.resource.data.role == 'student'
        && request.resource.data.totalPoints == 0
        && (!('email' in request.resource.data) || request.resource.data.email == request.auth.token.email)
        && request.resource.data.keys().hasOnly([
          'role', 'totalPoints', 'email', 'displayName', 'photoURL', 'createdAt',
          'profileCompleted', 'firstName', 'fatherName', 'familyName', 'arabicFullName',
          'universityId', 'college', 'major', 'academicLevel', 'isQassimStudent', 'profileCompletedAt'
        ])
        && (!('displayName' in request.resource.data) || isStringWithMax(request.resource.data.displayName, 100))
        && (!('arabicFullName' in request.resource.data) || isStringWithMax(request.resource.data.arabicFullName, 150))
        && (!('universityId' in request.resource.data) || isStringWithMax(request.resource.data.universityId, 20))
      );

      // Update:
      // 1. Super Admin can update anything.
      // 2. Event Organizer can ONLY adjust points (e.g. via QR Edge Check-in) and CANNOT alter roles or personal info.
      // 3. Owners can update their profile fields, but CANNOT touch role, totalPoints, or badges.
      allow update: if isSuperAdmin() || (
        isEventOrganizer()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['totalPoints'])
        && isPositiveInt(request.resource.data.totalPoints)
      ) || (
        isOwner(userId)
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints', 'badges', 'isAdmin'])
        && (!('displayName' in request.resource.data) || isStringWithMax(request.resource.data.displayName, 100))
        && (!('arabicFullName' in request.resource.data) || isStringWithMax(request.resource.data.arabicFullName, 150))
        && (!('universityId' in request.resource.data) || isStringWithMax(request.resource.data.universityId, 20))
      );

      // Delete: Super admin only
      allow delete: if isSuperAdmin();

      match /private/{docId} {
        allow read, write: if isOwner(userId) || isEventOrganizer();
      }
    }

    // ============================================================================
    // EVENTS COLLECTION
    // ============================================================================
    match /events/{eventId} {
      // Public can read published events; organizers can see all states
      allow read: if resource.data.state != 'Draft' || isEventOrganizer();

      // Updates: Organizers can update full event; Authenticated users can only update registeredCount (+1/-1) during active registration
      allow update: if isEventOrganizer() || (
        isAuthenticated()
        && resource.data.state == 'Registration Open'
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount'])
        && (
           request.resource.data.registeredCount == resource.data.registeredCount + 1 ||
           request.resource.data.registeredCount == resource.data.registeredCount - 1
        )
        && request.resource.data.registeredCount >= 0
        && request.resource.data.registeredCount <= (resource.data.capacity + 100)
      );

      allow create, delete: if isEventOrganizer();
    }

    // ============================================================================
    // REGISTRATIONS COLLECTION
    // ============================================================================
    match /registrations/{registrationId} {
      // SECURED READS:
      // Organizers can inspect all registrations.
      // Students can only read their own registration records.
      allow get: if isAuthenticated() && (
        isEventOrganizer() ||
        (resource != null && resource.data.userId == request.auth.uid) ||
        registrationId.matches('^.+_' + request.auth.uid + '$')
      );

      allow list: if isEventOrganizer() || (
        isAuthenticated() && resource.data.userId == request.auth.uid
      );

      // SECURED CREATION:
      // Client creation enforces:
      // 1. User registers themselves only.
      // 2. Deterministic ID format: {eventId}_{userId}.
      // 3. Event must be in 'Registration Open' state.
      // 4. If event registrationMode is 'Manual', status MUST be 'pending'.
      // 5. If event registrationMode is 'Auto', status must be 'approved' or 'waitlisted'.
      // 6. Whitelisted keys only — student CANNOT forge 'attended' or 'attendedAt'.
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && registrationId == (request.resource.data.eventId + '_' + request.auth.uid)
        && request.resource.data.keys().hasOnly(['userId', 'eventId', 'status', 'timestamp'])
        && exists(/databases/$(database)/documents/events/$(request.resource.data.eventId))
        && get(/databases/$(database)/documents/events/$(request.resource.data.eventId)).data.state == 'Registration Open'
        && (
          (get(/databases/$(database)/documents/events/$(request.resource.data.eventId)).data.registrationMode == 'Manual'
            && request.resource.data.status == 'pending')
          ||
          (get(/databases/$(database)/documents/events/$(request.resource.data.eventId)).data.registrationMode == 'Auto'
            && request.resource.data.status in ['approved', 'waitlisted'])
        );

      // SECURED UPDATES:
      // 1. Organizers can approve, reject, or mark attendance.
      // 2. Students can cancel their own registration: status -> 'cancelled'.
      // 3. Students can re-register after cancelling: status -> 'approved' | 'waitlisted' | 'pending'.
      allow update: if isEventOrganizer() || (
        isOwner(resource.data.userId)
        && request.resource.data.status == 'cancelled'
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'cancelledAt'])
      ) || (
        isOwner(resource.data.userId)
        && resource.data.status == 'cancelled'
        && request.resource.data.status in ['approved', 'waitlisted', 'pending']
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'timestamp'])
        && get(/databases/$(database)/documents/events/$(resource.data.eventId)).data.state == 'Registration Open'
      );

      allow delete: if isEventOrganizer();
    }

    // ============================================================================
    // ATTENDANCE LOGS
    // ============================================================================
    match /attendance_logs/{logId} {
      allow read: if isOwner(resource.data.userId) || isEventOrganizer();
      allow create: if isEventOrganizer() && request.resource.data.keys().hasAll(['eventId', 'userId', 'timestamp']);
      allow update, delete: if isSuperAdmin();
    }

    // ============================================================================
    // PENDING CHECK-INS (Dynamic QR Verification)
    // ============================================================================
    match /pending_checkins/{checkInId} {
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.keys().hasOnly(['eventId', 'userId', 'token', 'status', 'timestamp'])
        && isStringWithMax(request.resource.data.token, 32)
        && isStringWithMax(request.resource.data.eventId, 100);

      allow read: if isOwner(resource.data.userId) || isEventOrganizer();
      allow update, delete: if isEventOrganizer();
    }

    // ============================================================================
    // POINT TRANSACTIONS (Immutable Ledger)
    // ============================================================================
    match /point_transactions/{transactionId} {
      allow read: if isOwner(resource.data.userId) || isEventOrganizer();
      allow create: if isEventOrganizer()
        && request.resource.data.points is int
        && request.resource.data.keys().hasAll(['userId', 'points', 'timestamp']);
      allow update, delete: if false; // Strict immutability
    }

    // ============================================================================
    // CERTIFICATES
    // ============================================================================
    match /certificates/{certificateId} {
      allow read: if isOwner(resource.data.userId)
        || isEventOrganizer()
        || (resource != null && resource.data.status == 'Available');
      allow create, update, delete: if isEventOrganizer();
    }

    // ============================================================================
    // SETTINGS
    // ============================================================================
    match /settings/{docId} {
      allow read: if true;
      allow write: if isSuperAdmin() || (isEventOrganizer() && docId == 'homepage');
    }

    // ============================================================================
    // IDEAS & PROPOSALS
    // ============================================================================
    match /ideas/{ideaId} {
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && isStringWithMax(request.resource.data.title, 200)
        && isStringWithMax(request.resource.data.description, 3000);

      allow read: if isAuthenticated() && (
        isOwner(resource.data.userId) ||
        isEventOrganizer() ||
        resource.data.isPublic == true
      );

      allow update: if isEventOrganizer() || (
        isAuthenticated()
        && resource.data.isPublic == true
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votesCount', 'voters'])
        && (
          (request.resource.data.voters.hasAll(resource.data.get('voters', []))
           && request.resource.data.voters.size() == resource.data.get('voters', []).size() + 1
           && request.resource.data.voters.hasAll([request.auth.uid])
           && request.resource.data.votesCount == resource.data.get('votesCount', 0) + 1)
          ||
          (resource.data.get('voters', []).hasAll(request.resource.data.voters)
           && request.resource.data.voters.size() == resource.data.get('voters', []).size() - 1
           && !request.resource.data.voters.hasAny([request.auth.uid])
           && request.resource.data.votesCount == resource.data.get('votesCount', 0) - 1)
        )
      );

      allow delete: if isEventOrganizer();
    }

    // ============================================================================
    // MAIL QUEUE & AUDIT LOGS
    // ============================================================================
    match /mail/{mailId} {
      allow read, write: if false; // Cloud Functions exclusively
    }

    match /audit_logs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if false; // Cloud Functions / Admin SDK exclusively
    }
  }
}
```

---

## 5. Hardened Production `storage.rules` Design

The storage rules must enforce:
1. Complete lockdown of backend-generated certificates (accessible exclusively via Cloud Function signed URLs).
2. Type, MIME, and size restrictions if future client uploads are activated for event covers or user avatars.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isImageFile() {
      return request.resource.contentType.matches('image/(jpeg|png|webp)');
    }

    // Default: Complete denial
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Certificates: Strictly backend generated & downloaded via signed URLs
    match /certificates/{eventId}/{certificateId} {
      allow read, write: if false;
    }

    // Event Covers: Publicly readable; Organizers upload images <= 5MB
    match /event_covers/{eventId}/{fileName} {
      allow read: if true;
      allow write: if isAuthenticated()
        && request.resource.size < 5 * 1024 * 1024
        && isImageFile();
    }

    // User Avatars: Publicly readable; Owner uploads images <= 2MB
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if isAuthenticated()
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024
        && isImageFile();
    }
  }
}
```

---

## 6. Admin Route Protection Code Enhancements

### 6.1 Enhancing `src/app/[locale]/admin/layout.tsx`

To prevent browser history entrapment and provide instantaneous defense against tampering:
- Change `router.push('/')` to `router.replace('/')`.
- Introduce an explicit `AccessDenied` state rather than hanging on an infinite spinner if unauthorized.

```tsx
// Improvement snippet for src/app/[locale]/admin/layout.tsx
useEffect(() => {
  if (!loading) {
    if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
      router.replace('/');
    }
  }
}, [user, userData, loading, router]);

if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
}

if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h2 className="text-xl font-bold text-gray-800 mb-2 font-cairo">غير مصرح بالدخول</h2>
      <p className="text-gray-500 text-sm mb-4">هذه الصفحة مخصصة لمديري ومنظمي الفعاليات فقط.</p>
    </div>
  );
}
```

### 6.2 Secondary Guard on Admin Pages

To achieve true defense-in-depth, each page component under `admin/*` should guard its `useEffect` data queries with `if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) return;` (as currently implemented in `admin/users/page.tsx`).

---

## 7. Actionable Implementation Checklist

| Priority | Component | Action Item | Target File |
|:---|:---|:---|:---|
| **P0** | Firestore Rules | Remove `\|\| true;` from registrations read rule. | `firestore.rules` |
| **P0** | Firestore Rules | Restrict organizer profile updates strictly to `totalPoints`. Block organizer role escalation. | `firestore.rules` |
| **P0** | Firestore Rules | Enforce event mode check and key whitelisting on registration creation. | `firestore.rules` |
| **P1** | Firestore Rules | Add string length constraints and type checks across all user collections. | `firestore.rules` |
| **P1** | Storage Rules | Deploy hardened `storage.rules` with MIME and size constraints. | `storage.rules` |
| **P2** | Admin Layout | Replace `router.push` with `router.replace` and add clean unauthorized fallback. | `src/app/[locale]/admin/layout.tsx` |
| **P2** | Admin Pages | Add secondary role guard before executing Firestore queries across all admin sub-pages. | `src/app/[locale]/admin/**/*.tsx` |
