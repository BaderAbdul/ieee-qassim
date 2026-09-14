# Execution Plan: IEEE Qassim Engineering Community Platform

## Overall Strategy
Following the Project Pattern with rigorous dispatch-only orchestration:
- Baseline Audit & Codebase Exploration using 3 parallel Explorers to deeply analyze the frontend, backend/Firebase architecture, and existing test setup.
- E2E Testing Track establishment for opaque-box test runner covering Tiers 1-4.
- UI/UX Polish (R1) covering Arabic RTL/English LTR, mobile responsiveness, empty/loading/error states.
- Architectural Bug Fixes (R2) resolving attendance check-in, points awarding, profile synchronization, and certificate issuance while strictly respecting Firebase security rules.
- Core Journey E2E validation (R3) ensuring a seamless end-to-end user experience.
- Cloud Functions specification (R4) documenting all server-side dependencies.
- Dual-tier verification: Reviewers, Challengers, and Forensic Auditor gating.

## Phase 1: Exploration & Baseline Audit
- Dispatch Explorer 1: Frontend UI/UX, Routes, RTL/LTR layout, Tailwind configuration, components for Events, Registration, Activity, Profile.
- Dispatch Explorer 2: Architecture, Firebase / Firestore schemas, `firestore.rules`, `storage.rules`, existing Cloud Functions, attendance & points logic, certificates.
- Dispatch Explorer 3: Build & Lint status, dependencies, existing tests, Next.js version & compatibility checks (AGENTS.md compliance).

## Phase 2: Implementation & E2E Testing Track (Completed)
- Milestone 1: Baseline Audit & Discovery (Explorers 1, 2, 3) [DONE]
- Milestone 2: E2E Testing Track (Worker E2E: TEST_INFRA.md, TEST_READY.md, 93/93 tests passing) [DONE]
- Milestone 3: R1 UI/UX Polish & Localization (Worker M3 Gen 2: shared Navbar & Footer, i18n dictionaries, 30KB /profile page, Cairo & Inter fonts, logical CSS properties) [DONE]
- Milestone 4: R2 Architectural Integrity & Bug Fixes (Worker M4 Gen 2: tsconfig, eslint, firestore.rules, capacity decrement, attendance & points verified; npm run build: 0 errors, npm run lint: 0 errors, npm test: 93/93 passing) [DONE]

## Phase 3: Core Journey Integration & Cloud Functions (Active)
- Step 5.1: Monitor Worker M5/M6 (`3ddbbcb3-f97b-46ed-85b6-f91e9d02f862`) executing:
  - End-to-End Core Journey verification (Event Discovery -> Registration -> Check-in -> Points -> Profile -> Certificate).
  - Headless browser inspection for Arabic RTL (`dir="rtl"`) and English LTR (`dir="ltr"`), mobile responsiveness, and state handling.
  - Authoring `CLOUD_FUNCTIONS_REPORT.md` detailing server-side Cloud Functions vs client/Firestore transactions.
  - Running verification commands (`npm run build`, `npm run lint`, `npm test`).
- Step 5.2: Collect Worker M5/M6 report and artifacts. Verify compliance.

## Phase 4: Final Verification, Adversarial Hardening & Forensic Audit (Milestone 7)
- Step 7.1: Dispatch Reviewer to independently verify all milestones, UI/UX, architecture, and code layout compliance.
- Step 7.2: Dispatch Challenger to stress-test platform journeys, edge cases, and test suites.
- Step 7.3: Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify zero integrity violations and ensure authentic implementations.
- Step 7.4: Evaluate gating criteria.
- Step 7.5: Synthesize final report and send victory claim to parent Sentinel.

