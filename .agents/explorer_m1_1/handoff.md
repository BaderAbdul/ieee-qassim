# Handoff Report - Explorer 1 (Frontend UI/UX, Routes, RTL/LTR & Component Audit)

## 1. Observation

### 1.1. Build & Linting Failure
- **Command**: `npm run build` (`next build`)
  - **Output**: Failed during TypeScript type check with errors such as:
    ```
    functions/src/getCertificateDownloadUrl.ts(6,78): error TS7006: Parameter 'context' implicitly has an 'any' type.
    functions/src/issueCertificates.ts(2,28): error TS2307: Cannot find module 'firebase-functions' or its corresponding type declarations.
    Failed to type check.
    ```
  - **Root Cause**: `tsconfig.json` lines 25-33 includes `"**/*.ts"` without excluding `"functions"`.
- **Command**: `npm run lint` (`eslint`)
  - **Output**: `172 problems (149 errors, 23 warnings)`.
  - **Notable Errors**:
    - `src/app/[locale]/my-activity/page.tsx:47:7`: `react-hooks/set-state-in-effect` ("Avoid calling setState() directly within an effect").
    - Hundreds of `@typescript-eslint/no-explicit-any` errors across multiple files.
    - `@next/next/no-img-element` warnings in `EventCard.tsx:52`, `page.tsx:39`, `my-activity/page.tsx:170`.

### 1.2. Missing Routes & Orphaned Pages
- **Missing `/profile`**:
  - `find_by_name` on `src/app/[locale]` returned: `admin`, `check-in`, `events`, `leaderboard`, `my-activity`, `page.tsx`. There is **no `/profile` route or component** in the codebase.
- **Missing Global Navigation**:
  - `src/app/[locale]/layout.tsx` (lines 37-47) wraps children in `NextIntlClientProvider` and `AuthProvider`, but includes NO `<Navbar />` or `<Footer />`.
  - The Navbar and Footer are hardcoded solely inside `src/app/[locale]/page.tsx` (lines 17-56 and 139-141). Consequently, `/events`, `/events/[id]`, `/my-activity`, and `/leaderboard` have no navigation header.
- **Broken Admin Route**:
  - `src/app/[locale]/admin/events/page.tsx:131` links to `/admin/events/${event.id}/edit`, which does not exist (`404`).

### 1.3. Firestore Security Rule & Query Conflicts
- **Leaderboard Failure**:
  - `src/app/[locale]/leaderboard/page.tsx:28`: `query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50))`.
  - `firestore.rules:25`: `match /users/{userId} { allow read: if isOwner(userId) || isEventOrganizer(); }`.
  - Result: Non-admin users cannot query the `users` collection; the query triggers `permission-denied`, catching silently and displaying the empty state.
- **Event Capacity Query Failure**:
  - `src/app/[locale]/events/[id]/page.tsx:41`: `query(collection(db, 'registrations'), where('eventId', '==', eventId))`.
  - `firestore.rules:42`: `match /registrations/{registrationId} { allow read: if isOwner(resource.data.userId) || isEventOrganizer(); }`.
  - Result: Non-admin users cannot read other registrations; query triggers `permission-denied` and sets attendee count to 0.

### 1.4. Localization & RTL/LTR Inconsistencies
- `messages/ar.json` and `messages/en.json` contain only 2 keys (`Index.title`, `Index.description`).
- `src/app/[locale]/events/[id]/page.tsx`: 100% of static labels (lines 129, 138, 178, 187, 206, 228, 244, 253, 261, 270, 287-290, 300-307) are hardcoded in Arabic.
- `src/components/ui/EventCard.tsx:102`: `<span>السعة: {event.capacity}</span>` is hardcoded Arabic even when `locale === 'en'`.
- Physical CSS properties instead of Tailwind v4 logical utilities:
  - `EventCard.tsx:65`: `rtl:left-4 ltr:right-4` (should be `end-4`).
  - `EventCard.tsx:85,90,95,101`: `rtl:ml-2 ltr:mr-2` (should be `me-2`).
  - `admin/events/[id]/certificates/page.tsx:179`: `text-right` (should be `text-start`).
  - `admin/page.tsx:78`: contains stray Hebrew word (`באמצעות`).
- Font rendering: `globals.css:4` defines `--font-sans: "Inter", "Cairo", sans-serif;`, but neither font is imported via `next/font/google`.

### 1.5. Teams, Projects, Challenges Omission
- `grep_search` across `src/` for `team` returned 0 results.
- `grep_search` across `src/` for `project` returned only Firebase config references (`projectId`).
- `grep_search` across `src/` for `challenge` returned only:
  - `src/lib/types.ts:3`: `EventType = 'Workshop' | ... | 'Challenge' | 'Other'`
  - `src/app/[locale]/admin/events/create/page.tsx:127`: `<option value="Challenge">`
- No pages, forms, or data models exist for Teams, Projects, or Challenges.

---

## 2. Logic Chain

1. **Build Blocker**: Next.js App Router relies on `tsconfig.json` to identify compilation targets. Because `tsconfig.json` had `"include": ["**/*.ts"]` and excluded only `node_modules`, the compiler pulled in `functions/src/*.ts`. `functions` has its own dependencies (`firebase-functions`, etc.) not present in root `node_modules`. Hence, `npm run build` cannot pass until `"functions"` is added to `"exclude"`.
2. **Security Rule Breakdown**: Firestore evaluates security rules on query scope, not per-document filters. If a client queries `collection('users')` or `collection('registrations')` without satisfying rules for every potential document, Firestore aborts the query with `permission-denied`. Because `firestore.rules` enforces `isOwner` or `isEventOrganizer`, regular users can never query these collections directly. Consequently, the leaderboard and event capacity counters fail in production.
3. **Navigation & User Journey Continuity**: In Next.js App Router, layout files define persistent UI across routes. Placing the Navbar inside `page.tsx` isolates it from all nested sub-routes. When a user navigates to `/events` or `/my-activity`, the header disappears, stranding the user without navigation controls or locale switching.
4. **Missing Profile Route**: The task requires an Engineering Profile (`/profile`) showcasing user details, engineering skills, badges, points, and certificates. Currently, `/my-activity` serves only as a partial dashboard and does not capture engineering skills or badges. Creating `/profile` is an explicit missing requirement.
5. **RTL / LTR Correctness**: RTL websites must adapt both layout direction (`dir="rtl"`) and spacing. Hardcoding physical classes (`rtl:ml-2 ltr:mr-2`, `text-right`) is error-prone, whereas Tailwind v4 logical properties (`me-2`, `text-start`) automatically invert according to the document direction set in `layout.tsx`. Furthermore, missing web fonts cause fallback to generic OS system fonts, breaking visual typography.

---

## 3. Caveats

- **No Live Deployed Firestore Testing**: Observations regarding `permission-denied` rules were derived through static code analysis of `firestore.rules` and page queries; they were not verified against live Google Cloud Firestore instances with active security rule simulators.
- **Backend Cloud Functions Execution**: Functions in `functions/` were inspected for callable interface signatures (`registerForEvent`, `processCheckIn`, `getCertificateDownloadUrl`), but local emulator execution was not run during this frontend audit.
- **ESLint `any` Enforcement**: ESLint flagged 149 `any` types; resolving them requires updating TypeScript interface contracts in `src/lib/types.ts`.

---

## 4. Conclusion

The IEEE Qassim Platform frontend contains well-designed UI elements but requires structural refinement before Milestone 3 (UI Polish & UX Refinement) can proceed:
1. Fix `tsconfig.json` to restore `next build` functionality.
2. Introduce a shared `Navbar` and `Footer` in `src/app/[locale]/layout.tsx`.
3. Create the missing `/profile` page for student engineering identity, skills, and badges.
4. Resolve `firestore.rules` query incompatibilities for `/leaderboard` and `/events/[id]`.
5. Populate `messages/ar.json` and `messages/en.json` to enable genuine bilingual support.
6. Convert physical Tailwind direction hacks to logical CSS properties and load `Cairo`/`Inter` via `next/font/google`.
7. Preserve the complete omission of Teams, Projects, and Challenges.

---

## 5. Verification Method

### Independent Verification Steps:
1. **Verify Root Build Exclusion**:
   Inspect `tsconfig.json` and run `npx tsc --noEmit` excluding `functions/`.
2. **Verify Missing `/profile` Route**:
   Run `ls src/app/\[locale\]/profile` to confirm non-existence.
3. **Verify Isolated Navbar**:
   Inspect `src/app/[locale]/layout.tsx` and `src/app/[locale]/page.tsx` to confirm Navbar is missing from the layout.
4. **Verify Firestore Rule Conflict**:
   Compare `src/app/[locale]/leaderboard/page.tsx` line 28 with `firestore.rules` line 25.
5. **Verify Non-functional Filters**:
   Inspect `src/app/[locale]/events/page.tsx` line 60 to confirm the `<select>` element lacks state or event handlers.
6. **Verify Teams/Projects/Challenges Omission**:
   Run `rg -i "team|project|challenge" src/` to verify absence of features.
