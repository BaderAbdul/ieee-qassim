# Comprehensive Audit: Build, Lint, Next.js 16 Compliance & E2E Test Strategy

- **Auditor**: Explorer 3 (Milestone 1: Baseline Audit & Discovery)
- **Target Working Directory**: `/home/bader/Documents/IEEE QU SITE/.agents/explorer_m1_3`
- **Audit Date**: 2026-09-14
- **Node Runtime**: v24.18.0
- **Framework**: Next.js 16.3.5 (Turbopack default) / React 19.2.8 / TypeScript 5

---

## Executive Summary

1. **Build Health (`npm run build`)**: **FAILS** with `Failed to type check` (85 TypeScript errors).
   - **Root Cause**: The root `tsconfig.json` contains `"include": ["**/*.ts"]` and only excludes `node_modules`. Consequently, Next.js attempts to compile `functions/src/**/*.ts` during production build. `functions/` is an independent Firebase Cloud Functions subproject expecting `firebase-admin` v12 and `firebase-functions`, which are missing or mismatched against root `package.json` (`firebase-admin` v14).
   - **Key Finding**: The frontend application code under `src/` is **100% type-sound** (0 TypeScript errors) when verified independently (`TSC_AUDIT_SUCCESS`). Excluding `functions` from the root `tsconfig.json` immediately restores TypeScript typecheck integrity for the Next.js app.
2. **Lint Health (`npm run lint`)**: **FAILS** with 172 problems (149 errors, 23 warnings).
   - **101 errors** are caused by `functions/lib/**/*.js` (precompiled CommonJS files) being scanned by `@typescript-eslint/no-require-imports` because `functions/` is missing from `globalIgnores` in `eslint.config.mjs`.
   - **38 errors & 15 warnings** exist in `src/`, primarily 30 `@typescript-eslint/no-explicit-any` instances, 3 React 19 `react-hooks/set-state-in-effect` violations, and 5 `@next/next/no-img-element` warnings.
3. **Next.js 16 & AGENTS.md Compliance**:
   - The project uses Next.js 16.3.5 with Turbopack and React 19.2.8.
   - Compliance with Next.js 16 breaking changes is mostly strong: `src/proxy.ts` is implemented replacing deprecated `middleware.ts`; dynamic route components correctly handle async `params` using React 19's `use(params)` or `await params`.
   - **Compliance Deficiencies**:
     - `src/app/[locale]/check-in/[eventId]/page.tsx` uses `useSearchParams()` without a `<Suspense>` wrapper (causes SSR bailouts / deopt).
     - Images use raw HTML `<img>` tags without `next/image` optimization and without `images.remotePatterns` configuration in `next.config.ts`.
4. **Test Infrastructure & Zero-Dependency E2E Runner**:
   - There are currently **zero tests** in the repository.
   - External dependency installation is blocked by the environment's CODE_ONLY sandbox (`403 Forbidden` on npm registry).
   - **Breakthrough**: Node 24 (`v24.18.0`) natively supports `node:test` + `node:assert/strict` with direct TypeScript execution (`--experimental-strip-types`), executing test suites in under 3ms with zero external dependencies.
   - Local Headless Chrome (`/home/bader/.config/Antigravity/bin/google-chrome`) and `puppeteer-core` (`./functions/node_modules/puppeteer-core`) were successfully verified for headless browser automation.
   - A self-contained test runner architecture has been designed to spawn Next.js on an ephemeral port, execute Tiers 1-4 tests within the same sandbox process tree, and cleanly terminate.

---

## 1. Build Health Audit

### 1.1 Baseline Execution
- **Command**: `npm run build` (`next build`)
- **Result**: FAILED (Exit code 1)
- **Output**:
  ```text
  Failed to type check.
  functions/src/getCertificateDownloadUrl.ts(6,78): error TS7006: Parameter 'context' implicitly has an 'any' type.
  functions/src/getCertificateDownloadUrl.ts(14,20): error TS2339: Property 'firestore' does not exist on type...
  functions/src/issueCertificates.ts(2,28): error TS2307: Cannot find module 'firebase-functions'...
  ...
  Found 85 errors in 21 files.
  ```

### 1.2 Root Cause Analysis
- In `tsconfig.json`:
  ```json
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
  ```
- Because `"exclude"` only lists `["node_modules"]`, glob `"**/*.ts"` expands into `functions/src/**/*.ts`.
- `functions/` is a separate Firebase Cloud Functions subproject with its own `functions/tsconfig.json` (`module: "commonjs"`, `outDir: "lib"`).
- In root `package.json`, `firebase-admin` is `^14.4.0` (which uses modern modular SDK exports like `getFirestore()`, not legacy `admin.firestore()`), and `firebase-functions` is not installed at the root level.
- Furthermore, `functions/node_modules` does not have `firebase-functions` installed.

### 1.3 Verification of Frontend Isolation
An audit tsconfig (`.agents/explorer_m1_3/tsconfig.audit.json`) was executed targeting only `src/` and excluding `functions/`:
```bash
npx tsc --project .agents/explorer_m1_3/tsconfig.audit.json --noEmit
```
- **Result**: `TSC_AUDIT_SUCCESS` (0 errors).
- **Verification**: `src/` (the entire Next.js frontend code) is 100% type-valid against TypeScript 5 strict checks.

### 1.4 Recommended Fix for Milestone 4 (Implementer)
Update root `tsconfig.json` line 33:
```json
"exclude": ["node_modules", "functions"]
```
This isolates the Next.js compilation from the separate Cloud Functions subproject.

---

## 2. Lint Health Audit

### 2.1 Baseline Execution
- **Command**: `npm run lint` (`eslint`)
- **Result**: FAILED with **172 problems (149 errors, 23 warnings)**.

### 2.2 Error Breakdown by Rule
| Rule | Errors | Warnings | Affected Scope | Root Cause |
|---|---|---|---|---|
| `@typescript-eslint/no-require-imports` | 101 | 0 | `functions/lib/**/*.js` | Compiled CommonJS files in `functions/lib` scanned by ESLint |
| `@typescript-eslint/no-explicit-any` | 38 | 0 | `src/` (30), `functions/src/` (8) | Explicit `any` type annotations in page & component code |
| `@typescript-eslint/no-unused-vars` | 0 | 16 | `src/` (14), `functions/src/` (2) | Unused imports and variables |
| `react-hooks/set-state-in-effect` | 5 | 0 | `src/` (3), `functions/` (2) | Calling `setState` synchronously within `useEffect` body (React 19 rule) |
| `react/no-unescaped-entities` | 4 | 0 | `src/` | Unescaped quotes/apostrophes in Arabic/English JSX |
| `@next/next/no-img-element` | 0 | 5 | `src/` | HTML `<img>` used instead of Next.js `<Image />` |
| `react-hooks/exhaustive-deps` | 0 | 2 | `src/` | Missing dependencies in `useEffect` arrays |
| `prefer-const` | 1 | 0 | `src/` | `let` used where variable is not reassigned |

### 2.3 Files Affected in Frontend (`src/`)
| File Path | Errors | Warnings | Primary Violations |
|---|---|---|---|
| `src/app/[locale]/my-activity/page.tsx` | 8 | 1 | `any` (5), `set-state-in-effect` (1), `no-img-element` (1) |
| `src/app/[locale]/admin/events/[id]/certificates/page.tsx` | 6 | 1 | `any` (6), `unused-vars` (1) |
| `src/app/[locale]/admin/users/page.tsx` | 4 | 0 | `any` (3), `set-state-in-effect` (1) |
| `src/app/[locale]/admin/events/page.tsx` | 4 | 3 | `any` (3), `set-state-in-effect` (1), `unused-vars` (3) |
| `src/app/[locale]/admin/check-in/page.tsx` | 3 | 1 | `any` (3), `unused-vars` (1) |
| `src/app/[locale]/admin/events/[id]/qr/page.tsx` | 3 | 1 | `any` (3), `unused-vars` (1) |
| `src/app/[locale]/events/[id]/page.tsx` | 3 | 2 | `any` (3), `no-img-element` (1), `unused-vars` (1) |
| `src/app/[locale]/admin/events/[id]/registrations/page.tsx` | 2 | 1 | `any` (2), `unused-vars` (1) |
| `src/app/[locale]/check-in/[eventId]/page.tsx` | 2 | 0 | `any` (2) |
| `src/app/[locale]/layout.tsx` | 1 | 0 | `any` (1: `locale as any`) |
| `src/components/ui/EventCard.tsx` | 1 | 1 | `any` (1), `no-img-element` (1) |
| `src/i18n/request.ts` | 1 | 0 | `any` (1) |
| `src/app/[locale]/admin/layout.tsx` | 0 | 2 | `unused-vars` (2) |
| `src/app/[locale]/leaderboard/page.tsx` | 0 | 1 | `no-img-element` (1) |
| `src/app/[locale]/page.tsx` | 0 | 1 | `no-img-element` (1) |

### 2.4 Recommended Fix for `eslint.config.mjs`
In `eslint.config.mjs`:
```javascript
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "functions/**",
  ]),
```
Adding `"functions/**"` immediately eliminates **101 lint errors**. The remaining 38 errors in `src/` can be addressed by replacing `any` with proper domain types from `src/lib/types.ts` and refactoring `useEffect` setState patterns.

---

## 3. Next.js 16 Configuration & AGENTS.md Compliance

### 3.1 Version Matrix
- **Next.js**: `16.3.5`
- **React**: `19.2.8`
- **React DOM**: `19.2.8`
- **Tailwind CSS**: `^4.0.0` with `@tailwindcss/postcss: ^4`
- **next-intl**: `^4.14.4`

### 3.2 AGENTS.md & Next.js 16 Upgrading Guide Audit
Verified against `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`:

1. **Turbopack by Default**:
   - In Next.js 16, Turbopack is the default bundler for development and production.
   - `package.json` scripts (`"dev": "next dev"`, `"build": "next build"`) correctly omit legacy `--turbo` flags.
2. **`middleware` renamed to `proxy`**:
   - Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`.
   - The project is fully compliant: `src/proxy.ts` is in place, handling internationalized path matching (`['/', '/(ar|en)/:path*']`).
3. **Async Request APIs**:
   - Next.js 16 completely removed synchronous access to `params`, `searchParams`, `cookies()`, and `headers()`.
   - Dynamic page routes in `src/app/[locale]/...` are fully compliant:
     - `src/app/[locale]/layout.tsx`: `params: Promise<{locale: string}>` awaited with `await params`.
     - `src/app/[locale]/events/[id]/page.tsx`: unwrapped with React 19's `use(params)`.
     - `src/app/[locale]/check-in/[eventId]/page.tsx`: unwrapped with `use(params)`.
     - `src/app/[locale]/admin/events/[id]/qr/page.tsx`: unwrapped with `use(params)`.
     - `src/app/[locale]/admin/events/[id]/registrations/page.tsx`: unwrapped with `use(params)`.
4. **Suspense Boundary Requirement for `useSearchParams`**:
   - In `src/app/[locale]/check-in/[eventId]/page.tsx`: `useSearchParams()` is called directly without a `<Suspense>` wrapper.
   - **Requirement**: Wrap the check-in component in `<Suspense fallback={<LoadingSpinner />}>` to avoid SSR deopt.
5. **Image Optimization (`next/image`)**:
   - `next/image` is omitted in favor of standard `<img>` tags across 5 components.
   - To adhere to Next.js best practices and improve Largest Contentful Paint (LCP), migrate to `<Image />` and configure `images.remotePatterns` in `next.config.ts` for Firebase Storage and Google Auth avatar URLs (`lh3.googleusercontent.com`, `firebasestorage.googleapis.com`).

---

## 4. Test Infrastructure Audit & E2E Testing Strategy

### 4.1 Current State of Tests
- Total test files in repository: **0**.
- Test runner in `package.json`: **None**.
- Network environment: **CODE_ONLY sandbox mode** (npm registry unreachable, external packages cannot be installed).

### 4.2 Available Capabilities & Runner Selection
| Testing Tool | Feasibility | Rationale / Verification |
|---|---|---|
| **Jest / Vitest** | ❌ Blocked | Not installed; npm install returns 403; Jest has ESM incompatibilities with Next 16 / React 19 |
| **Playwright / Cypress** | ❌ Blocked | Heavy browser downloads blocked by network sandbox; not installed |
| **Node.js Native Test Runner (`node:test`)** | ✅ **Recommended** | **Node v24.18.0 built-in**. Supports `node:test`, `node:assert/strict`, subtests, describe/it, hooks, and native TypeScript type stripping (`node --test --experimental-strip-types`). Verified working in **2.27ms**. |
| **Headless Chrome + Puppeteer-Core** | ✅ **Verified** | `puppeteer-core` is available in `./functions/node_modules/puppeteer-core`. System Google Chrome is installed at `/home/bader/.config/Antigravity/bin/google-chrome` (Chrome 150). Successfully launched and controlled via Node.js script. |

### 4.3 Sandbox Networking Architecture for E2E Testing
- **Key Discovery**: Individual tool executions operate in distinct sandbox network namespaces. A background `next dev` process cannot be accessed by a separate tool call's `fetch()`.
- **Architectural Solution**: The E2E test runner must be **self-contained within a single process tree**:
  1. Test runner script starts.
  2. Spawns `next dev -p <port>` (or `next start`) as a child process.
  3. Polls `http://127.0.0.1:<port>/` until HTTP 200 is returned (verified startup in ~585ms).
  4. Runs all test suites (HTTP contract tests and/or Puppeteer browser tests) within that shared loopback namespace.
  5. Cleanly kills the child process (`SIGTERM`) in a `finally` block before exiting.

---

## 5. E2E Test Suite Design: Tiers 1–4

The E2E Test Track (Milestone 2) will implement test suites covering the core student journey defined in `PROJECT.md`:
$$\text{Discover} \longrightarrow \text{Register} \longrightarrow \text{Attend / Check-in} \longrightarrow \text{Earn Points} \longrightarrow \text{Activity History} \longrightarrow \text{Certificate Issuance}$$

```
========================================================================================
                      E2E TEST RUNNER ARCHITECTURE (Node 24 native)
========================================================================================
 [ Runner: scripts/test-runner.ts ]
    │
    ├── 1. Spawn Next.js Dev/Start Process (Child Process, port 3099)
    │      └── Wait for HTTP ready probe (GET / -> 200)
    │
    ├── 2. Execute Test Suites via node:test (--experimental-strip-types)
    │      ├── Tier 1: Feature Tests (Happy Path Journey)
    │      ├── Tier 2: Boundary & Edge Tests (Limits, Expirations, Idempotency)
    │      ├── Tier 3: Combinatorial Tests (Concurrency, Roles, Modes)
    │      └── Tier 4: Real-World Scenarios (Multi-role Complete Lifecycles)
    │
    └── 3. Teardown: SIGTERM to child process, emit TAP / Summary Report, exit(code)
========================================================================================
```

### Tier 1: Feature Tests (Happy Path)
- **FT-01: Internationalized Routing & Page Resolution**:
  - Request `/` -> redirects or renders localized content with `dir="rtl"` / `lang="ar"`.
  - Request `/ar/events` and `/en/events` -> verifies page status 200 and language direction.
- **FT-02: Event Discovery**:
  - Fetch `/ar/events` and `/ar/events/[id]` for a published event -> returns valid HTML with event title, speaker, date, gains, and capacity.
- **FT-03: Event Registration**:
  - Submits registration for an open event (`registerForEvent`) -> status becomes `approved`, `registeredCount` increments by 1.
- **FT-04: QR Token Check-In & Attendance**:
  - Accesses `/check-in/[eventId]?token=<valid_token>` with registered student -> status returns `success`, creates attendance record.
- **FT-05: Points Accrual & Ledger**:
  - Verifies that verified attendance awards event points to `users/{uid}.totalPoints` and writes immutable transaction to `point_transactions`.
- **FT-06: Activity & Leaderboard Reflection**:
  - Fetch `/ar/my-activity` -> displays the newly completed event and earned points.
  - Fetch `/ar/leaderboard` -> verifies user ranking updates according to total points.
- **FT-07: Certificate Generation**:
  - Upon attendance verification, `certificates/{certificateId}` is generated with deterministic ID `certificate_{eventId}_{userId}` and status `Available`.

### Tier 2: Boundary & Edge Scenarios
- **BT-01: Capacity Limits & Waitlisting**:
  - An event with `capacity = 1` receives a 2nd registration.
  - Verify registration status is set to `waitlisted` (or registration rejected if waitlist disabled).
  - Verify `registeredCount` does not exceed allowed capacity.
- **BT-02: State Transitions & Registration Windows**:
  - Attempting to register for an event in state `Draft`, `Registration Closed`, or `Completed` returns `FAILED_PRECONDITION` error.
- **BT-03: Duplicate Registration Prevention**:
  - A student already registered attempts to register again -> returns `already registered` error without incrementing count.
- **BT-04: Invalid / Expired Check-In Tokens**:
  - Accessing `/check-in/[eventId]?token=invalid_token` displays `invalid_token` UI state.
  - Token signed with expired timestamp is rejected.
- **BT-05: Check-In Idempotency**:
  - Scanning the same check-in QR code twice returns `already_checked_in` without double-crediting points or duplicating attendance logs.
- **BT-06: Cancellation Boundary**:
  - Student cancels registration -> status set to `cancelled`, `registeredCount` decrements. Cancelled student attempting to check in is rejected (`not_registered`).

### Tier 3: Combinatorial Scenarios
- **CT-01: Concurrent Registration Race Conditions**:
  - 10 simultaneous registration calls for an event with only 2 remaining seats.
  - Exactly 2 get `approved`, 8 get `waitlisted`, `registeredCount` equals exactly total registrations with no phantom reads.
- **CT-02: Registration Modes (Auto vs. Manual)**:
  - Event with `registrationMode = "Manual"` creates registration in `pending` state; points/check-in disallowed until organizer approves.
- **CT-03: Admin Manual Attendance Override**:
  - Organizer uses `/admin/check-in` or `manualAttendanceOverride` to check in an unregistered walk-in student -> creates registration and attendance record safely.
- **CT-04: Certificate Revocation & Re-issuance**:
  - Admin revokes certificate -> status changes to `Revoked`, download is disabled.
  - Admin issues retry -> re-enters `Generating` -> `Available`.

### Tier 4: Real-World Scenarios
- **RT-01: Complete Multi-Actor Event Lifecycle**:
  1. *Organizer* creates new event "Next.js 16 Masterclass" (`/admin/events/create`).
  2. *Organizer* publishes event with capacity 30, points 50, hasCertificate true.
  3. *Student 1 & Student 2* discover the event on `/events` and register.
  4. *Organizer* launches check-in desk (`/admin/events/[id]/qr`), generating dynamic rotating QR token.
  5. *Student 1* checks in using the QR token; *Student 2* is checked in manually via admin override.
  6. *System* verifies both students receive 50 points in `point_transactions` and `my-activity`.
  7. *Organizer* issues certificates (`/admin/events/[id]/certificates`).
  8. *Student 1* downloads valid PDF certificate.
  9. *Admin* reviews audit logs to confirm complete traceability.

---

## 6. Actionable Implementation Plan (Milestones 2 & 4)

1. **Fix `tsconfig.json`** (Milestone 4):
   - Add `"functions"` to `"exclude"`. Unblocks `npm run build`.
2. **Fix `eslint.config.mjs`** (Milestone 4):
   - Add `"functions/**"` to `globalIgnores`. Eliminates 101 `@typescript-eslint/no-require-imports` errors.
   - Refactor 3 `useEffect` `setState` calls to eliminate `react-hooks/set-state-in-effect`.
   - Add proper type annotations in place of `any`.
3. **Wrap `useSearchParams` in `<Suspense>`** in `src/app/[locale]/check-in/[eventId]/page.tsx` (Milestone 3/4).
4. **Implement Native Test Runner** (Milestone 2):
   - Create `tests/runner.ts` utilizing `node:test` and native `--experimental-strip-types`.
   - Add `"test": "node --test --experimental-strip-types tests/**/*.test.ts"` to `package.json`.
   - Implement Tiers 1–4 tests in `tests/e2e/`.
