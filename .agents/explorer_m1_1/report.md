# Frontend UI/UX, Routes, RTL/LTR & Component Audit Report

**Audit Target**: IEEE Qassim Engineering Community Platform  
**Auditor**: Explorer 1 (`teamwork_preview_explorer`)  
**Scope**: App Router Pages, Component Architecture, Core User Journeys, RTL/LTR Layout, State Handling, Teams/Projects/Challenges Omission, and Build/Security Diagnostics.  
**Date**: 2026-09-14  

---

## 1. Executive Summary

A comprehensive forensic audit of the frontend codebase was conducted across all pages, layouts, components, translation dictionaries, CSS styles, and route definitions.

### Key Audit Findings:
1. **Critical Build Blocker (`tsconfig.json`)**: Root `tsconfig.json` includes `**/*.ts` without excluding `functions/`. Running `npm run build` fails because Next.js attempts to compile Cloud Functions source files without required dependencies.
2. **Missing Engineering Profile Route (`/profile`)**: There is **no `/profile` route** in the entire codebase. The only existing user dashboard is at `/my-activity`, which lacks engineering skills, specialization/department details, and badge tallies.
3. **Severe Firestore Rules & Query Conflicts**:
   - **Leaderboard (`/leaderboard`)**: Queries `collection(db, 'users')`. Under `firestore.rules`, user documents are restricted by `isOwner(userId) || isEventOrganizer()`. Regular students and guests receive `permission-denied`, rendering the page completely broken/empty.
   - **Event Details (`/events/[id]`)**: Queries `collection(db, 'registrations')` directly to calculate capacity. Non-admins cannot read other students' registrations under `firestore.rules`, resulting in `permission-denied` and incorrect capacity displays.
4. **Broken Global Navigation & Layout**: Header/Navbar and Footer are hardcoded directly into the Home page (`src/app/[locale]/page.tsx`). All other pages (`/events`, `/events/[id]`, `/my-activity`, `/leaderboard`, `/check-in/...`) render with **no navigation bar, no user menu, and no language toggle**.
5. **Localization & RTL/LTR Breakdown**:
   - Translation files (`messages/ar.json` and `messages/en.json`) contain only **2 keys** (`Index.title` and `Index.description`).
   - Over **95%** of UI text across all pages is either hardcoded with inline ternary operators (`isAr ? ... : ...`) or completely hardcoded in Arabic without English text.
   - Typography gap: "Cairo" and "Inter" fonts are declared in `globals.css` but **never imported or loaded** via `next/font/google`.
   - Tailwind anti-patterns: Widespread use of physical direction hacks (`rtl:ml-* ltr:mr-*`, `rtl:left-* ltr:right-*`, `text-right`) instead of Tailwind v4 logical utility classes (`ms-*`, `me-*`, `start-*`, `end-*`, `text-start`).
6. **Broken Admin Routes & Bugs**:
   - `/admin/events` links to `/admin/events/[id]/edit`, but that route does not exist (404 error).
   - In `admin/page.tsx:78`, a stray Hebrew word (`באמצעות`) appears inside the Arabic dashboard text.
7. **Teams, Projects, Challenges Status**:
   - Verified that no `/teams`, `/projects`, or `/challenges` routes, Firestore collections, or UI pages exist. The only mention is the `Challenge` value in the `EventType` enum.

---

## 2. Architecture & Project Setup Baseline

| Item | Specification | Assessment |
|------|---------------|------------|
| Framework | Next.js 16.3.5 (App Router) | Modern, uses React 19.2.8. |
| Middleware / Proxy | `src/proxy.ts` | Correctly adheres to Next.js 16 convention (`proxy.ts` replacing `middleware.ts`). |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss: ^4`) | Installed, but components do not take full advantage of logical CSS properties. |
| Localization | `next-intl` 4.14.4 | Correct routing configured (`ar`, `en`, default `ar`), but message dictionaries are empty skeletons. |
| Auth & State | `src/context/AuthContext.tsx` | Provides `user`, `userData`, `loading`, `login`, `logout` using Firebase Auth & Firestore `users/{uid}`. |
| ESLint Status | 172 problems (149 errors, 23 warnings) | Fails on `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, and `@next/next/no-img-element`. |
| TypeScript Build | Fails on `next build` due to `functions/` inclusion | Root `tsconfig.json` requires `"exclude": ["node_modules", "functions"]`. |

---

## 3. Core User Journeys & Route Audits

### 3.1. Discover Events (`/events`)
*File*: `src/app/[locale]/events/page.tsx`

| Feature | Current Implementation | Deficiencies & Recommendations |
|---------|------------------------|--------------------------------|
| **Navigation & Layout** | None | No Header/Navbar, language switcher, or Footer. Must introduce a shared `Navbar` and `Footer` in `src/app/[locale]/layout.tsx` or wrap pages in a shared layout. |
| **Catalog Query** | Queries `events` collection where `state` in `['Published', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed']`, sorted client-side by date. | Functional, but loads all events into memory at once. Add limit and category indexing. |
| **Search & Filtering** | Static `<select>` dropdown with hardcoded options (`All Types`, `Workshop`, `Bootcamp`). | **Non-functional**: No `onChange` handler, no state binding. Missing keyword search bar (title, speaker, location) and status filters (Upcoming vs Past). |
| **Event Cards** | Uses `src/components/ui/EventCard.tsx`. | **Localization bug**: `<span>السعة: {event.capacity}</span>` is hardcoded Arabic in English locale. Arrow `التفاصيل ←` is hardcoded text. Uses `rtl:ml-2 ltr:mr-2` instead of `me-2`. Uses `<img>` instead of `next/image`. |
| **Loading State** | Single `<LoadingSpinner size="lg" />`. | No card skeletons; causes layout shift when cards appear. Implement 3-card skeleton grid. |
| **Empty State** | Displays calendar icon and "لا توجد فعاليات حالياً". | Lacks actionable button (e.g., "Clear Filters"). |
| **Error State** | `catch (error)` only logs to `console.error`. | Silent failure: user sees empty state instead of an error message with a "Retry" button. |

---

### 3.2. Event Details (`/events/[id]`)
*File*: `src/app/[locale]/events/[id]/page.tsx`

| Feature | Current Implementation | Deficiencies & Recommendations |
|---------|------------------------|--------------------------------|
| **Visual Hierarchy** | Hero cover image with title and type badge; 2-column layout (content vs sticky sidebar). | Clean layout, good responsive grid (`lg:grid-cols-3`). |
| **Navigation** | None | No back button to `/events`, no breadcrumbs (`الرئيسية > الفعاليات > [اسم الفعالية]`), no global navigation. |
| **Language & i18n** | Partial | English locale is completely broken. Static labels ("عن الفعالية", "ماذا ستتعلم؟", "المتحدثون", "شهادة حضور معتمدة", "ساعات", "مسجل", "متاح قائمة انتظار", "الفعالية غير موجودة") are 100% hardcoded in Arabic. |
| **Capacity & Security Flaw** | Client runs `query(collection(db, 'registrations'), where('eventId', '==', eventId))` to compute `attendeeCount`. | **Security Rule Violation**: Regular students get `permission-denied` on `registrations` collection. Capacity displays as `0 / capacity`. Capacity must be maintained on the `event` document (`event.registeredCount`) or returned from an authenticated backend endpoint. |
| **Registration CTA** | Dynamic button based on state and user authentication. | Works if user registers, but if user has already attended (`status === 'attended'`), the UI displays "طلبك قيد المراجعة" instead of "تم الحضور" with a link to certificates. |
| **Dialogs & Alerts** | Uses native browser `window.confirm()` and `window.alert()`. | Unstyled, non-accessible, and not localized. Replace with accessible modal dialogs. |

---

### 3.3. Registration Flow
*Files*: `src/app/[locale]/events/[id]/page.tsx`, `functions/src/registerForEvent.ts`

| Aspect | Findings | Actionable Recommendation |
|--------|----------|---------------------------|
| **Submission** | Calls `httpsCallable(functions, 'registerForEvent')`. | Correctly enforces server-side atomic registration and waitlist logic. |
| **User Confirmation** | Immediate execution on button click; no confirmation modal or attendee questionnaire. | Introduce a lightweight registration modal summarizing event date, venue, and points reward before submission. |
| **Cancellation Flow** | Updates `registrations/{regId}` with status `cancelled` directly from client. | Security rule permits this if user owns the document, but confirmation prompt is an unstyled browser `confirm()`. |
| **Feedback / Toast** | Errors alert via `alert(error.message)`. | Replace with modern notification toast or inline error banner. |

---

### 3.4. My Activity Dashboard (`/my-activity`)
*File*: `src/app/[locale]/my-activity/page.tsx`

| Feature | Current Implementation | Deficiencies & Recommendations |
|---------|------------------------|--------------------------------|
| **Route Name** | Hosted at `/my-activity`. | Missing `/activity` alias/redirect for users navigating to `/activity`. |
| **Profile Summary** | Displays avatar, display name, email, and `totalPoints` badge. | Visually appealing card, but points calculation depends on `userData.totalPoints`. |
| **Tabs** | 3 tabs: Events (`registrations`), Points (`point_transactions`), Certificates (`certificates`). | Tab switching works well, and each queries documents filtered by `userId == user.uid` (compliant with `firestore.rules`). |
| **Certificate Download** | Calls `getCertificateDownloadUrl` callable function. | Functional, but error handling falls back to browser `alert()`. |
| **Localization** | 100% hardcoded Arabic strings on all tab titles, stats labels, and empty states. | Must extract all strings to `messages/{locale}.json`. |
| **React Hook Lint Error** | Line 47 calls `setLoading(false)` directly inside `useEffect` when `!user`. | Triggers `react-hooks/set-state-in-effect`. Use proper effect dependency handling. |

---

### 3.5. Engineering Profile (`/profile`)
*Current State*: **MISSING ROUTE**

| Requirement | Current Status | Gap Analysis & Proposed Solution |
|-------------|----------------|----------------------------------|
| **Profile Route** | Non-existent (`404`) | Create `src/app/[locale]/profile/page.tsx` (and link from Navbar). |
| **User Engineering Details** | None | Add fields to user model: Major/Department (e.g. Electrical Engineering, Computer Engineering), Academic Year, Technical Bio. |
| **Skills & Interests** | None | Add skill tag list (e.g., IoT, Embedded Systems, Web Development, Robotics, Power Systems). |
| **Attendance Badges** | None | Display achievement badges (e.g., "First Event", "Workshop Master - 5 Events", "Hackathon Finalist", "Top Contributor"). |
| **Points Tally & Rank** | Embedded in `/my-activity` | Display current tier (e.g. Bronze, Silver, Gold, IEEE Fellow Student), lifetime points, and leaderboard rank. |
| **Portfolio & Verified Certificates** | Embedded in `/my-activity` | Showcase verified certificates with public verification ID / QR preview. |

*Recommendation*: Create `/profile` as the public/personal engineering identity hub, while `/my-activity` or `/profile?tab=activity` acts as the transaction and registration ledger.

---

### 3.6. Leaderboard (`/leaderboard`)
*File*: `src/app/[locale]/leaderboard/page.tsx`

| Issue | Severity | Detail & Solution |
|-------|----------|-------------------|
| **Firestore Permission Denied** | **Critical Blocker** | Line 28 runs `query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50))`. In `firestore.rules`: `match /users/{userId} { allow read: if isOwner(userId) || isEventOrganizer(); }`. Regular students receive `permission-denied` and the leaderboard is permanently empty for them. **Solution**: Either create a public `public_profiles` collection populated via Cloud Functions or adjust rules/callable to fetch sanitized leaderboard standings safely. |
| **Localization** | High | All text is hardcoded Arabic ("لوحة الشرف", "طالب", "أنت", "نقطة"). |
| **Physical CSS Property** | Medium | Line 104 uses `text-right` instead of `text-end`. |
| **Data Schema Consistency** | Medium | Uses `u.photoUrl` whereas Auth and Firestore user docs use `photoURL`. |

---

### 3.7. Student Check-In (`/check-in/[eventId]`)
*File*: `src/app/[locale]/check-in/[eventId]/page.tsx`

| Feature | Current Implementation | Deficiencies & Recommendations |
|---------|------------------------|--------------------------------|
| **Check-in Processing** | Reads `?token=...`, calls `processCheckIn` callable function. | Robust state coverage: `loading`, `success`, `already_checked_in`, `not_registered`, `invalid_token`, `error`. |
| **Localization** | 100% Arabic hardcoded text. | Must internationalize all feedback messages for English-speaking students. |
| **Navigation** | Standalone screen without navbar. | Intentional for QR scan landing page, but should have clear "Back to Home" or "View in My Activity" button (currently present for success, but needs localization). |

---

### 3.8. Admin Portal (`/admin/*`)
*Files*: `src/app/[locale]/admin/layout.tsx`, `events/page.tsx`, `events/create/page.tsx`, `check-in/page.tsx`, `users/page.tsx`, `events/[id]/*`

| Page / Component | Key Issues Identified |
|------------------|-----------------------|
| **Admin Layout** | Sidebar uses `space-x-reverse` instead of flex gap. Hardcoded Arabic menu items. |
| **Admin Overview (`/admin`)** | **Line 78 typo**: Contains a stray Hebrew word (`באמצעות`) in the Arabic text. Replace with `باستخدام`. |
| **Admin Events (`/admin/events`)** | **Broken Link**: Line 131 links to `/admin/events/${event.id}/edit` which does not exist (`404`). In addition, the events table lacks direct buttons to navigate to the event's QR display (`/admin/events/${id}/qr`) and Certificate Management (`/admin/events/${id}/certificates`). |
| **Event Creation (`/admin/events/create`)** | Form is complete with bilingual fields (`title`/`titleEn`, `description`/`descriptionEn`, `location`/`locationEn`, `gains`/`gainsEn`). However, all form labels are in Arabic only. |
| **Live QR Display (`/admin/events/[id]/qr`)** | Rotates dynamic token every 45s via `generateCheckInToken`. Uses `QRCodeSVG`. Functional, but hardcoded Arabic. |
| **Registration Desk (`/admin/events/[id]/registrations`)** | Allows manual status changes (`approved`, `waitlisted`, `rejected`) and CSV export. Functional. |
| **Certificates Management (`/admin/events/[id]/certificates`)** | Table headers use `text-right` instead of `text-start`. Action buttons allow batch issue, retry, and revoke. |
| **Users & Points (`/admin/users`)** | Allows searching users and manually adjusting points via `addManualPoints`. Modal is functional, but lacks English localization. |

---

## 4. Teams, Projects & Challenges Omission Plan

### Audit Findings:
- Grepped entire codebase for `team`, `project`, and `challenge`.
- **Zero** routes exist for Teams, Projects, or Challenges.
- **Zero** Firestore collections or security rules exist for them.
- **Only 2 references found**:
  1. `src/lib/types.ts`: `EventType = 'Workshop' | 'Camp' | 'Lecture' | 'Competition' | 'Meetup' | 'Challenge' | 'Other'`
  2. `src/app/[locale]/admin/events/create/page.tsx`: `<option value="Challenge">تحدي (Challenge)</option>`

### Clean Omission Recommendations:
1. **Navigation Integrity**: Keep the main navigation bar strictly focused on:
   - Events (`/events`)
   - Leaderboard (`/leaderboard`)
   - My Activity (`/my-activity` or `/activity`)
   - Profile (`/profile`)
   - Admin (`/admin` for organizers/admins)
   Do **NOT** add navigation items or placeholders for Teams, Projects, or Challenges.
2. **Schema & Event Types**:
   - The event category `Challenge` in `types.ts` is purely a type of event (like `Workshop` or `Competition`). Retaining it in `EventType` causes no harm and requires no complex team-building infrastructure.
   - Do **NOT** create team formation models, challenge submission forms, or project showcase galleries.
   - Keep user profiles focused on individual engineering identity (department, skills, certificates, badges, points).

---

## 5. RTL / LTR Arabic & English Layout & Typography Audit

### 5.1. Directionality & Layout
- **Root Direction**: `src/app/[locale]/layout.tsx` assigns `dir={locale === 'ar' ? 'rtl' : 'ltr'}` to `<html>`. This is the standard Next.js pattern.
- **Tailwind Logical Properties Violation**:
  Multiple components use physical direction or legacy directional hacks:
  - `rtl:ml-* ltr:mr-*` used extensively in `EventCard.tsx`, `events/[id]/page.tsx`, `my-activity/page.tsx`.
  - `rtl:left-4 ltr:right-4` in `EventCard.tsx:65`.
  - `space-x-reverse` paired with `space-x-*` across headers and sidebars.
  - `text-right` hardcoded in tables (`admin/events/[id]/certificates/page.tsx:179`, `admin/users/page.tsx:116`, `leaderboard/page.tsx:104`).
- **Required Transformation**:
  - Replace `rtl:ml-X ltr:mr-X` with `me-X`.
  - Replace `rtl:mr-X ltr:ml-X` with `ms-X`.
  - Replace `rtl:left-X ltr:right-X` with `end-X` or `start-X`.
  - Replace `text-right` with `text-start` or `text-end`.
  - Replace `space-x-*` with flex `gap-*` (eliminates RTL margin flipping bugs).

### 5.2. Font Loading & Rendering
- `globals.css` defines:
  ```css
  @theme {
    --font-sans: "Inter", "Cairo", sans-serif;
  }
  ```
- **The Issue**: Neither `Cairo` nor `Inter` is actually imported or downloaded. If the user's OS does not have Cairo locally installed, Arabic text falls back to system fonts (e.g. standard Arial or Tahoma), which degrades visual quality.
- **Modern Solution**: Use `next/font/google`:
  ```tsx
  import { Cairo, Inter } from 'next/font/google';
  const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });
  const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
  ```
  And apply CSS variables to `<html>` or `<body>`.

### 5.3. Translation Completeness
- Current `messages/ar.json` and `messages/en.json` only define `Index`.
- A complete dictionary structure must be built:
  ```json
  {
    "common": { "login": "...", "logout": "...", "loading": "...", "retry": "...", "back": "..." },
    "nav": { "home": "...", "events": "...", "leaderboard": "...", "activity": "...", "profile": "...", "admin": "..." },
    "events": { "title": "...", "upcoming": "...", "filterAll": "...", "capacity": "...", "points": "...", "register": "...", "status": { ... } },
    "activity": { "title": "...", "tabs": { ... }, "empty": { ... } },
    "profile": { "title": "...", "skills": "...", "department": "...", "badges": "..." }
  }
  ```

---

## 6. State Handling Audit (Empty, Loading, Error)

| Route / Component | Loading State | Empty State | Error State |
|-------------------|---------------|-------------|-------------|
| **Global (`layout.tsx`)** | Missing `loading.tsx` | N/A | Missing `error.tsx` & `not-found.tsx` |
| **Events (`/events`)** | Spinner with text | Calendar icon + text (passive, no CTA) | **Masked**: Firestore errors log to console and fall into empty state |
| **Event Details (`/events/[id]`)** | Spinner with text | "الفعالية غير موجودة" | Catches silently; registration errors use raw `alert()` |
| **My Activity (`/my-activity`)** | Spinner with text | Present per tab, but hardcoded Arabic | Catches silently, leaving empty tab arrays |
| **Profile (`/profile`)** | N/A (Missing route) | N/A | N/A |
| **Leaderboard (`/leaderboard`)** | Spinner | Empty text | **Blocked**: Permission error caught silently, always shows empty state |
| **Check-In (`/check-in/[eventId]`)** | Animated loader icon | N/A | Detailed status icons for invalid token, not registered, generic error |
| **Admin Tables** | Spinner in table body | "لا توجد فعاليات/مستخدمين" | Error updating state alerts via `alert()` |

### Recommendations:
1. Create `src/components/ui/SkeletonCard.tsx` and `src/components/ui/SkeletonTable.tsx` for fluid loading transitions.
2. Create `src/components/ui/ErrorMessage.tsx` featuring an alert icon, clear message, and "Try Again" button.
3. Add App Router convention files:
   - `src/app/[locale]/loading.tsx`
   - `src/app/[locale]/error.tsx`
   - `src/app/[locale]/not-found.tsx`

---

## 7. Diagnostics & Implementation Roadmap for Implementers

### Immediate Critical Fixes (Prerequisites):
1. **Fix `tsconfig.json`**:
   Add `"functions"` to `exclude`:
   ```json
   "exclude": ["node_modules", "functions"]
   ```
2. **Resolve Firestore Leaderboard & Capacity Query Conflicts**:
   - For Leaderboard: Provide a secure endpoint/callable (or dedicated public collection) to deliver top 50 student rankings without violating individual user privacy.
   - For Capacity: Store `registeredCount` directly on the `events/{eventId}` document, incremented/decremented atomically by `registerForEvent` Cloud Function.
3. **Shared Navigation Component**:
   Extract Navbar and Footer from `page.tsx` into `src/components/layout/Navbar.tsx` and `Footer.tsx`, and embed them in `src/app/[locale]/layout.tsx`.
4. **Create `/profile` Route**:
   Build `src/app/[locale]/profile/page.tsx` incorporating engineering student attributes (department, skills, points, attendance badges, certificates).
5. **Fix Broken Admin Links & Typos**:
   - Fix or stub `/admin/events/[id]/edit`.
   - Add direct links to QR display and Certificate management in the Admin Events table.
   - Fix Hebrew typo in `admin/page.tsx:78`.
6. **RTL / LTR & i18n Overhaul**:
   - Populate `messages/ar.json` and `messages/en.json`.
   - Migrate physical Tailwind classes to logical (`me-*`, `ms-*`, `start-*`, `end-*`).
   - Import Google Fonts (`Cairo` and `Inter`) in root layout.

---

## 8. Conclusion

The IEEE Qassim Engineering Community Platform possesses a solid App Router and Firebase foundation, but suffers from critical integration gaps:
- A broken build configuration (`tsconfig.json`),
- Security rules that silently break the public leaderboard and event capacity counters,
- A missing `/profile` page,
- An isolated navigation bar that leaves inner pages orphaned, and
- Almost completely hardcoded Arabic strings that disable English localization.

Addressing these specific findings in Milestone 3 will elevate the platform to a cohesive, production-grade engineering community hub.
