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

## 2026-09-16T21:16:07Z

Prepare the IEEE Qassim platform (Next.js/Firebase) for a production launch to handle 300+ students. The team will secure Firestore rules, optimize SSR and query performance, test the complete user journey, and polish the UX.

Working directory: `/home/bader/Documents/IEEE QU SITE`
Integrity mode: benchmark

## Requirements

### R1. Security & Data Integrity
Audit and rewrite `firestore.rules` to explicitly deny unauthorized writes and secure admin routes. Enforce strict type checking and ownership rules for user data and events.

### R2. Performance & Scalability
Review all Server Components and database queries. Ensure that queries for events and users (especially in the admin dashboard and home page) do not trigger full collection scans (O(N) reads) and can handle 300+ concurrent users efficiently.

### R3. End-to-End User Journey QA
Validate the entire lifecycle: Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation. Identify and fix any bugs that prevent this flow from completing.

### R4. UX and Vibe Polish
Add robust fallback loading states (e.g., skeletons) and Error Boundaries for all major data-fetching components to ensure a premium mobile experience.

## Acceptance Criteria

### Security
- [ ] A script or agent-as-judge confirms that `firestore.rules` blocks writes to the `users` collection by anyone other than the owner or an admin.
- [ ] Admin routes (`/admin/*`) are verified to redirect or block non-admin users effectively.

### Performance
- [ ] A verification script or QA agent verifies that fetching the homepage and the registrations dashboard uses `limit()` or pagination, confirming O(1) or bounded reads.

### QA Journey
- [ ] An automated script successfully simulates creating an event, registering a mock user, updating status to `attended`, and generating a certificate record in Firestore without runtime errors.

### UX
- [ ] A QA agent confirms the presence of React `<Suspense>` boundaries or `loading.tsx` files for dynamic routes.
