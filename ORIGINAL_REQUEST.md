# Original User Request

## 2026-09-14T07:17:11Z

# Teamwork Project Prompt

Transform the existing IEEE Qassim Engineering Community Platform into a polished, production-ready product focusing on event discovery, registration, attendance, points, and engineering profile. Skip adding Teams, Projects, and Challenges. Maintain the existing Firebase and security architecture.

Working directory: /home/bader/Documents/IEEE QU SITE
Integrity mode: benchmark

## Requirements

### R1. UI Polish & UX Improvements
Fix obvious UX issues, responsive design flaws, RTL/LTR correctness, spacing, and state handling (loading, empty, error states) across the Discover Events, Event Details, Registration, My Activity, and Engineering Profile flows. The final result should feel like a real modern engineering technology platform.

### R2. Architectural Integrity & Bug Fixes
Audit the current implementation and fix broken or incomplete logic. Retain the existing Firebase, authentication, Firestore, certificate, email, and security architecture without duplicating systems.

### R3. End-to-End Core Journey
Ensure the core student journey (Discover → Register → Attend → Earn Points → Build Activity → Receive Certificate) is fully functional and production-ready within the currently deployable architecture.

### R4. Cloud Functions Identification
Clearly identify and document any features, workflows, or UI states that strictly require deployed Firebase Cloud Functions.

## Acceptance Criteria

### Core Functionality Verification (Agent-as-Judge)
- [ ] The complete student journey from event discovery to certificate issuance functions correctly.
- [ ] No new duplicate backend/database architectures are introduced.
- [ ] Existing Firebase security rules and workflows remain intact and operational.
- [ ] A final report clearly lists which features require deployed Firebase Cloud Functions.

### UX & Polish Verification (Browser Inspection)
- [ ] UI correctly supports Arabic RTL and English LTR without layout breakage.
- [ ] Pages are fully mobile-responsive.
- [ ] Loading, error, and empty states are clearly communicated to the user.

## Follow-up — 2026-09-14T07:54:49Z

The server was restarted, so your background tasks and workers may have been interrupted. Please revive your processes, resume work on Milestone 3 (UI/UX polish & RTL/LTR refinement), and complete any remaining tasks for the teamwork project. Continue working until you are ready to claim victory and produce the final reports.

## Follow-up — 2026-09-14T09:01:36Z

The server was restarted again, which paused your background processes. Please revive the Orchestrator, resume Milestone 7 (Final Verification, Challenger Hardening & Forensic Audit), and proceed to trigger the independent Victory Auditor once you claim victory.
