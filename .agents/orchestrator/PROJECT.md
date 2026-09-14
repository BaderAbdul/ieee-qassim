# Project: IEEE Qassim Engineering Community Platform Polish

## Architecture
- Framework: Next.js 16.3.5 (App Router, Turbopack, React 19.2.8, see AGENTS.md for Next.js breaking changes rules)
- Language: TypeScript / React / Tailwind CSS
- Backend & Storage: Firebase (Auth, Cloud Firestore, Cloud Storage, Cloud Functions)
- Internationalization: Next-intl / Custom RTL-LTR support (Arabic / English)
- Core Domains:
  - Event Discovery (`/events`, `/events/[id]`)
  - Event Registration & Attendance Check-in (`/check-in/[eventId]`)
  - Gamification / Points & Activity History (`/my-activity`, `/leaderboard`)
  - Engineering Profile & Portfolio (`/profile` - newly created)
  - Certificate Issuance & Verification (`/admin/events/[id]/certificates`, signed URLs)

## Milestones
| # | Name | Scope | Dependencies | Status | Output / Findings |
|---|------|-------|-------------|--------|-------------------|
| 1 | Baseline Audit & Discovery | Full codebase analysis, build/lint check, schema audit | none | DONE | Identified build break in tsconfig, missing /profile, isolated Navbar, firestore.rules conflicts, font crash, zero tests |
| 2 | E2E Testing Track | Independent requirement-driven test suite & runner (Tiers 1-4) | M1 | DONE | TEST_INFRA.md and TEST_READY.md published; 93/93 tests passing across Tiers 1-4 |
| 3 | UI Polish & UX Refinement (R1) | RTL/LTR, responsive UI, loading/empty/error states for Events, Registration, Activity, Profile | M1 | DONE | Shared Navbar & Footer in layout, full ar/en bilingual dictionaries, 30KB /profile page, Cairo & Inter fonts, logical properties |
| 4 | Architecture Integrity & Bug Fixes (R2) | Fix tsconfig/eslint, firestore.rules privilege escalation & leaderboard, capacity decrement, attendance | M1 | DONE | Root build passing (0 errors), ESLint passing (0 errors), 93/93 E2E tests passing, firestore.rules secured |
| 5 | End-to-End Core Journey Integration (R3) | Complete Discover -> Register -> Attend -> Earn Points -> Activity -> Certificate flow | M2, M3, M4 | DONE | 7 lifecycle phases verified, 42/42 headless Chrome checks passed (RTL, LTR, Mobile, Desktop) |
| 6 | Cloud Functions Audit & Documentation (R4) | Detailed documentation of functions strictly requiring deployed Cloud Functions | M5 | DONE | Published CLOUD_FUNCTIONS_REPORT.md (231 lines, 18.4KB) covering all 13 backend functions |
| 7 | Adversarial Hardening & Final Gate | Challenger coverage hardening (Tier 5), Forensic Audit verification | M5, M6 | IN_PROGRESS | Dispatched 2 Reviewers, 2 Challengers, and Forensic Auditor |

## Interface Contracts
### Auth & Profile
- `users/{userId}`: contains user profile, total points, badges, attendance counts, engineering role/department.
- `firestore.rules`: secured create rule enforcing role 'student' and 0 points. Authenticated read allowed for public profile fields (`displayName`, `totalPoints`, `badges`) for leaderboard.

### Event & Registration
- `events/{eventId}`: event metadata, capacity, `registeredCount`, points reward, dates, status, check-in code / QR token.
- `registrations/{regId}`: `eventId`, `userId`, `status` ('registered' | 'attended' | 'cancelled'), `registeredAt`.
- Cancellation transaction decrements `events/{eventId}.registeredCount` atomically.

### Attendance & Points
- Attendance check-in validates attendee registration and check-in token. Wrapped in `<Suspense>`.
- Idempotent attendance processing preventing double check-in and double points reward.

### Certificate
- Certificate generation with safe multi-path font resolution and fallback typography.

## Code Layout
- `src/app/[locale]`: App Router locale pages (`events`, `my-activity`, `leaderboard`, `profile`, `check-in`, `admin`)
- `src/components`: UI components, shared layout (`Navbar`, `Footer`), forms
- `src/lib`: Firebase client config, services, types
- `functions`: Firebase Cloud Functions backend logic
- `firestore.rules`: Security rules for Firestore
- `messages/`: Localization dictionaries (`ar.json`, `en.json`)
- `tests/`: Zero-dependency E2E test suite (Tiers 1-4, 93 tests)
- `CLOUD_FUNCTIONS_REPORT.md`: Definitive Cloud Functions architecture specification
