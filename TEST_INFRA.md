# IEEE Qassim Community Platform - Test Infrastructure Specification

## 1. Test Philosophy & Architecture
The IEEE Qassim Community Platform E2E test suite adheres to an **opaque-box, requirement-driven testing philosophy**. 

Rather than testing internal implementation minutiae or fragile UI DOM selectors, this test framework simulates and verifies the platform through the perspective of external actors (**Students**, **Event Organizers**, and **Super Administrators**). It directly exercises the complete business logic, state machines, transactional integrity, security boundaries, and data contracts specified in `PROJECT.md` and Firebase Cloud Functions.

### Native Node 24 Architecture (Zero External Dependencies)
- **Engine**: Node.js 24 (`v24.18.0`) native test runner (`node:test`).
- **Assertions**: Node.js strict assertion library (`node:assert/strict`).
- **Type Execution**: Native `--experimental-strip-types` executing pure TypeScript files without Babel, ts-node, or transpilation builds.
- **Cryptography**: Native `node:crypto` executing HMAC-SHA256 JWT token generation, verification, and SHA-256 certificate hashing.
- **Storage/DB Engine**: In-memory transactional document database (`tests/engine/database.ts`) implementing ACID transactions (`runTransaction`), FieldValue sentinels (`serverTimestamp`, `increment`), and query operators (`where`, `orderBy`, `limit`, `offset`).

---

## 2. Feature Inventory
The test suite provides end-to-end coverage across the 7 core functional domains of the platform:

| # | Domain Feature | Operational Scope & Invariants Tested |
|---|----------------|--------------------------------------|
| 1 | **Event Discovery** | Catalog listing, bilingual search (Arabic & English), category filtering, status filtering, date ordering, pagination, and strict hiding of `Draft` events from students. |
| 2 | **Event Details** | Bilingual metadata presentation, speaker credentials, location details, real-time active capacity calculation, remaining seats, dynamic CTA state, and certificate eligibility. |
| 3 | **Event Registration** | Auto vs Manual approval modes, deterministic registration IDs (`registrations/{eventId}_{userId}`), strict capacity thresholding with automated waitlisting, atomic `registeredCount` updates, and cancellation capacity recovery. |
| 4 | **Attendance Check-in** | Organizer time-limited (60s) QR token issuance with nonce replay protection, student check-in validation against approved registrations, strict idempotency checks, and QR audit logging. |
| 5 | **Points & Activity** | Immutable point ledger entries (`point_transactions`), atomic `totalPoints` increment on user profile, comprehensive activity feed synchronization, and public leaderboard ranking (excluding 0-point users). |
| 6 | **Engineering Profile** | Profile data integrity, automated milestone badge awards (`ieee_starter`, `active_engineer`, `tech_pioneer`, `century_club`, `engineering_leader`), accumulated stats, and strict redaction of private fields (email, universityId) on public profiles. |
| 7 | **Certificate Issuance & Verification** | Deterministic certificate IDs (`certificate_{eventId}_{userId}`), strict prerequisite of event completion and verified attendance, PDF generation state progression (`Generating` -> `Available`), signed download URLs, public cryptographic verification, and revocation workflows. |

---

## 3. Directory Layout & Organization

```
/home/bader/Documents/IEEE QU SITE/
├── TEST_INFRA.md                           # Test architecture & infrastructure guide (this document)
├── TEST_READY.md                           # Readiness attestation and executive verification summary
├── package.json                            # Standard npm test runner scripts
└── tests/
    ├── engine/                             # Core test harness & domain clients
    │   ├── database.ts                     # ACID in-memory transactional document store
    │   ├── crypto.ts                       # Native HMAC-SHA256 and SHA-256 cryptographic engine
    │   └── platform.ts                     # Opaque-box platform client exercising all domains
    ├── runner.ts                           # Standalone executive test runner and reporter
    ├── tier1-feature-coverage/             # Tier 1: Core Functional Coverage (>=35 tests required)
    │   ├── 01_event_discovery.test.ts      # 6 tests
    │   ├── 02_event_details.test.ts        # 6 tests
    │   ├── 03_event_registration.test.ts   # 6 tests
    │   ├── 04_attendance_checkin.test.ts   # 6 tests
    │   ├── 05_points_activity.test.ts      # 6 tests
    │   ├── 06_engineering_profile.test.ts  # 6 tests
    │   └── 07_certificate_verification.test.ts # 6 tests
    ├── tier2-boundary-corner/              # Tier 2: Boundary & Corner Cases (>=35 tests required)
    │   ├── 01_discovery_boundaries.test.ts # 5 tests
    │   ├── 02_details_boundaries.test.ts   # 5 tests
    │   ├── 03_registration_boundaries.test.ts # 6 tests
    │   ├── 04_checkin_boundaries.test.ts   # 5 tests
    │   ├── 05_points_boundaries.test.ts    # 5 tests
    │   ├── 06_profile_boundaries.test.ts   # 5 tests
    │   └── 07_certificate_boundaries.test.ts # 6 tests
    ├── tier3-cross-feature/                # Tier 3: Cross-Feature Combinations (>=7 tests required)
    │   └── cross_feature_combinations.test.ts # 8 tests
    └── tier4-real-world-scenarios/         # Tier 4: Real-World Scenarios (>=5 scenarios required)
        └── real_world_scenarios.test.ts    # 6 tests
```

---

## 4. Coverage Thresholds & Tier Verification

| Tier | Category Description | Mandatory Threshold | Actual Implemented | Pass Rate |
|------|----------------------|---------------------|--------------------|-----------|
| **Tier 1** | Feature Coverage (All 7 Features) | ≥ 35 tests (≥5 per feature) | **42 tests** (6 per feature) | **100%** |
| **Tier 2** | Boundary & Corner Cases | ≥ 35 tests (≥5 per feature) | **37 tests** (5–6 per feature) | **100%** |
| **Tier 3** | Cross-Feature Combinations | ≥ 7 tests | **8 tests** | **100%** |
| **Tier 4** | Real-World Application Scenarios | ≥ 5 tests | **6 tests** | **100%** |
| **TOTAL**| **Complete E2E Suite** | **≥ 82 tests** | **93 tests** | **100% PASS** |

---

## 5. Execution Commands

### Standard Runner (Executive Summary Report):
```bash
npm test
# or
node --experimental-strip-types tests/runner.ts
```

### Raw Test Runner (Streaming Native TAP/Spec Output):
```bash
npm run test:raw
# or
node --test --experimental-strip-types "tests/**/*.test.ts"
```

### Running Individual Tiers:
```bash
# Tier 1
node --test --experimental-strip-types "tests/tier1-feature-coverage/*.test.ts"

# Tier 2
node --test --experimental-strip-types "tests/tier2-boundary-corner/*.test.ts"

# Tier 3
node --test --experimental-strip-types "tests/tier3-cross-feature/*.test.ts"

# Tier 4
node --test --experimental-strip-types "tests/tier4-real-world-scenarios/*.test.ts"
```
