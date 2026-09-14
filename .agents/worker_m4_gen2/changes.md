# Changes Summary — Worker M4 Gen 2 (Milestone 4: Architecture Integrity & Bug Fixes)

## 1. Build & Lint Configuration
- **`tsconfig.json`**:
  - Added `"functions"`, `"tests"`, and `".agents"` to the `"exclude"` array.
  - Rationale: Next.js root compiler previously attempted to compile Cloud Functions code and independent test runner files located in subdirectories, which broke Next.js build due to separate dependencies and target environments.
- **`eslint.config.mjs`**:
  - Added `"functions/**"`, `"tests/**"`, and `".agents/**"` to `globalIgnores`.
  - Rationale: Prevented compiled CommonJS artifacts in `functions/lib/` and agent metadata files from polluting the root ESLint verification process.

## 2. Firestore Security Rules (`firestore.rules`)
- **`match /users/{userId}`**:
  - `allow read: if isAuthenticated();`: Authenticated users can read public profile fields needed for the platform leaderboard and public engineering profile.
  - `allow create`: Enforces `isSuperAdmin() || (isOwner(userId) && request.resource.data.role == 'student' && request.resource.data.totalPoints == 0 && (!('email' in request.resource.data) || request.resource.data.email == request.auth.token.email))`. Prevents self-escalation to `admin` / `super_admin` and guarantees initialized points are 0.
  - `allow update`: Prevents clients from updating `role` or `totalPoints` directly via `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints'])`.
  - `match /private/{docId}`: Restricted to `isOwner(userId) || isEventOrganizer()`.
- **`match /events/{eventId}`**:
  - `allow update`: Allows organizers full updates, or authenticated attendees to decrement `registeredCount` upon cancellation: `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount']) && request.resource.data.registeredCount >= 0`.
- **`match /registrations/{registrationId}`**:
  - `allow read`: Allows event organizers, registration owner, and permit checking registration counts or existence without crashing with `permission-denied`.
  - `allow update`: Allows user to cancel own registration updating only `status` ('cancelled') and `cancelledAt`.

## 3. Event Capacity Decrement on Cancellation
- **`src/app/[locale]/events/[id]/page.tsx`**:
  - `handleCancelRegistration` runs a Firestore transaction:
    - Atomically checks if registration is active (`status !== 'cancelled'`).
    - Marks registration as `cancelled` with `cancelledAt: serverTimestamp()`.
    - Atomically updates event document with `registeredCount: increment(-1)` if `currentCount > 0`.
    - Updates local state safely (`Math.max(0, prev - 1)`).
- **`src/lib/types.ts`**:
  - Added `registeredCount?: number;` to `PlatformEvent` interface to ensure strict TypeScript type checking passes across event views and admin pages.

## 4. Attendance Check-In & Suspense
- **`src/app/[locale]/check-in/[eventId]/page.tsx`**:
  - Separated page into `StudentCheckInPage` root component with `<Suspense>` wrapper around `CheckInContent`.
  - Fixes Next.js 16 / React 19 CSR deoptimization warning for `useSearchParams()`.
  - Comprehensive attendance states handled: `loading`, `success`, `already_checked_in`, `not_registered`, `invalid_token`, and `error`.
- **`functions/src/processCheckIn.ts`**:
  - Uses atomic Firestore transaction checking attendance log existence via deterministic ID `${eventId}_${uid}`.
  - If already logged, returns `{ status: 'already_checked_in' }` without re-awarding points.
  - If new, creates attendance log, updates registration status to `attended`, and logs deterministic point transaction `attendance_${eventId}_${uid}`.

## 5. Certificate Font Path Resolution Fallback
- **`functions/src/generateCertificate.ts`**:
  - Implemented `resolveFontBase64` which searches across multiple candidate runtime locations (`../src/assets/fonts`, `assets/fonts`, `./src/assets/fonts`, `functions/src/assets/fonts`, `src/assets/fonts`).
  - Returns `null` fallback and logs a warning instead of throwing an unhandled exception when TTF font files are absent on disk.
  - Dynamically builds `@font-face` CSS only when base64 font data is available, with web-safe fallback typography.

## 6. Type Safety & Date Handling Fixes
- **`src/app/[locale]/admin/events/[id]/registrations/page.tsx`**:
  - Added safe `toDate` helper to handle `{ toDate?: () => Date } | Date | null | undefined`.
  - Fixed CSV export and table cell date rendering without invalid `.toDate()` calls on native JS `Date` objects.
- **`src/app/[locale]/my-activity/page.tsx`**:
  - Added safe `toDate` helper for registration timestamps, point transaction creation dates, and certificate issue dates.
  - Eliminated `any` type assertions and fixed React 19 `useEffect` unmounted state update leaks using `let active = true;` cleanup.
