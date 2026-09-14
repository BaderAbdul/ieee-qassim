# Task for Worker E2E: E2E Testing Track Infrastructure & Test Suites

## Identity
- Role: Worker (teamwork_preview_worker)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_e2e

## Objective
Design and implement the comprehensive, requirement-driven, opaque-box E2E test suite for the IEEE Qassim Engineering Community Platform without adding external dependencies (using Node 24 native `node:test` + `node:assert/strict` + `--experimental-strip-types`).

1. **`TEST_INFRA.md`**:
   - Create `TEST_INFRA.md` at the project root documenting:
     - Test philosophy: Opaque-box, requirement-driven student journey.
     - Feature inventory: Discovery, Event Details, Registration, Attendance Check-in, Points/Gamification, Activity History, Engineering Profile, Certificate Verification.
     - Test directory layout and runner invocation.
     - Coverage thresholds (Tiers 1-4).

2. **Test Suites Implementation**:
   Implement executable test suites under `tests/` or `test/`:
   - **Tier 1: Feature Coverage (≥5 tests per feature, ≥35 tests total)**:
     - Event Discovery (catalog listing, search, filtering by type/date, pagination/sorting)
     - Event Details (metadata, speaker info, location, capacity display)
     - Event Registration (submission, capacity limit validation, confirmation)
     - Attendance Check-in (code/token verification, check-in recording)
     - Points & Activity (points balance increment, transaction logging)
     - Engineering Profile (profile display, skills, badges, stats)
     - Certificate Issuance & Verification (issuance criteria, certificate access/verification)
   - **Tier 2: Boundary & Corner Cases (≥5 tests per feature, ≥35 tests total)**:
     - Zero capacity, full capacity rejection, negative capacity prevention
     - Duplicate registration prevention, cancellation capacity recovery
     - Duplicate check-in rejection (idempotency), expired or invalid check-in token
     - Edge-case usernames, special characters, unicode, Arabic characters
     - Boundary points tallying (0 points, massive points, overflow protection)
   - **Tier 3: Cross-Feature Combinations (≥7 tests)**:
     - Registration + Cancellation + Capacity restoration
     - Registration + Attendance + Points increment + Activity log sync
     - Attendance + Certificate issuance + Verification URL access
     - Attendance count reaching badge threshold -> Profile badge award
   - **Tier 4: Real-World Scenarios (≥5 realistic complete lifecycle scenarios)**:
     - Scenario 1: New engineering student joins, browses upcoming workshop, registers, attends via check-in code, receives 50 points, views activity feed, and downloads certificate.
     - Scenario 2: Student registers for high-demand seminar, event reaches capacity, another student cancels, waitlisted/subsequent student successfully registers.
     - Scenario 3: Student completes multiple events across semesters, accumulates attendance milestones, and inspects updated engineering profile portfolio.
     - Scenario 4: Organizer checks in attendees, confirms attendee ledger, verifies certificate generation hash against issued list.
     - Scenario 5: Offline/resilient student access: student reviews past certificates and activity history with cached or direct lookup.

3. **Standalone Test Runner**:
   - Create a test runner script (e.g. `npm test` or `node --test --experimental-strip-types tests/**/*.test.ts`) that executes all tiers cleanly, prints a structured test report with passing counts, and exits with code 0.
   - Add `"test": "node --test --experimental-strip-types tests/**/*.test.ts"` or similar to `package.json` scripts if appropriate.

4. **`TEST_READY.md`**:
   - Create `TEST_READY.md` at project root with exact runner command, test counts per tier, and pass/fail summary.

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Document all test suites, runner invocation, and results in `/home/bader/Documents/IEEE QU SITE/.agents/worker_e2e/report.md` and `/home/bader/Documents/IEEE QU SITE/.agents/worker_e2e/handoff.md`.
