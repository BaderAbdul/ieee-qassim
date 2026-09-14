# Task for Worker M3: UI Polish & UX Refinement (R1)

## Identity
- Role: Worker (teamwork_preview_worker)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_m3

## Objective
Transform the user experience of the IEEE Qassim Engineering Community Platform into a modern, polished, responsive engineering technology platform supporting both Arabic (RTL) and English (LTR):

1. **Global Shared Navigation & Footer**:
   - In `src/app/[locale]/layout.tsx`, integrate `<Navbar />` and `<Footer />` so all pages (`/`, `/events`, `/events/[id]`, `/my-activity`, `/leaderboard`, `/profile`) have persistent navigation, user session status, and language toggle.
   - Remove the redundant local Navbar and Footer from `src/app/[locale]/page.tsx`.
   - Ensure the language switcher correctly switches between `ar` and `en` while preserving the current route.

2. **Build the Engineering Profile Page (`src/app/[locale]/profile/page.tsx`)**:
   - Create a comprehensive, beautiful Engineering Profile page showing:
     - Student Header: Full Name, Engineering Department (e.g. Electrical, Computer, Mechanical, Civil), College of Engineering - Qassim University, Academic Year.
     - Gamification Summary: Total Points, Community Rank, Events Attended count.
     - Earned Badges showcase (e.g. "IEEE Starter", "Active Engineer", "Tech Pioneer", "Century Club") with visual badges.
     - Activity & Attendance Ledger: Chronological list of attended events with dates and points earned.
     - Verified Certificates section: List of issued certificates with verification status and download / view action.
   - Include loading skeleton state, empty state for new students, and error handling.
   - Fully responsive on mobile, tablet, and desktop.
   - Seamless Arabic RTL and English LTR rendering.

3. **Complete Bilingual Support (`messages/ar.json` & `messages/en.json`)**:
   - Fill in comprehensive translations in both Arabic and English covering:
     - Navbar: Home, Events, My Activity, Leaderboard, Profile, Admin, Sign In, Sign Out, Language.
     - Events Catalog: Search placeholder, category filters (All, Workshop, Seminar, Hackathon, Other), status badges, empty results.
     - Event Details: Date, Time, Location, Speaker, Duration, Capacity, Gains, Register CTA, Cancel Registration, Check-in CTA.
     - My Activity & Profile: Points, Badges, Attended, Certificates, Empty states.
     - Common: Loading, Error, Retry, Save, Cancel, Success.
   - Replace hardcoded Arabic text in `src/app/[locale]/events/[id]/page.tsx`, `src/components/ui/EventCard.tsx`, `src/app/[locale]/my-activity/page.tsx`, and `src/app/[locale]/check-in/[eventId]/page.tsx` with `useTranslations()`.

4. **RTL / LTR & Typography Polish**:
   - Import `Cairo` and `Inter` via `next/font/google` in `layout.tsx` and apply proper font variables / classes.
   - Convert physical CSS positioning (`rtl:ml-2 ltr:mr-2`, `text-right`, `left-`, `right-`) to Tailwind logical properties (`me-2`, `ms-2`, `text-start`, `text-end`, `start-`, `end-`).
   - Fix stray Hebrew word (`באמצעות`) in `src/app/[locale]/admin/page.tsx:78`.

5. **State Handling & Responsiveness**:
   - Verify loading skeletons, empty states (no events, no activity, no certificates), and error banners across all pages.
   - Test responsive layout on mobile viewport (<640px), tablet (768px), and desktop (1024px+).

6. **Strict Omission of Teams, Projects, Challenges**:
   - Do NOT add Teams, Projects, or Challenges pages or forms.
   - Ensure navigation items and CTAs only link to valid existing routes.
   - Fix broken admin route: `admin/events/page.tsx` link to `/admin/events/${event.id}/edit` should link to a valid view or modal if edit doesn't exist.

7. **Verification**:
   - Run `npm run build` to confirm build succeeds without errors.
   - Run `npm run lint` to confirm linting passes cleanly.
   - Run `npm test` to confirm all 93 E2E tests continue to pass 100%.

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Next.js AGENTS.md Rule
Read `AGENTS.md` and check `node_modules/next/dist/docs/` before making changes.

## Output Requirements
Document all changes and verification outputs in `/home/bader/Documents/IEEE QU SITE/.agents/worker_m3/changes.md` and `/home/bader/Documents/IEEE QU SITE/.agents/worker_m3/handoff.md`.
