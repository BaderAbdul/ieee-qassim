# Task for Worker M5/M6: End-to-End Core Journey Verification & Cloud Functions Report

## Identity
- Role: Worker (teamwork_preview_worker)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_m5_m6

## Objective
Verify the end-to-end student journey, conduct browser inspection for RTL/LTR and responsiveness, and author the definitive Cloud Functions Identification Report (Milestone 5 & Milestone 6):

1. **Verify End-to-End Core Journey (R3)**:
   - Verify that the complete student journey functions cohesively:
     1. Event Discovery (`/events`, catalog filtering by category/status, search, ordering).
     2. Event Details (`/events/[id]`, metadata, speaker info, location, real-time capacity).
     3. Event Registration (registration submission, capacity locking, cancellation transaction with atomic capacity decrement).
     4. Attendance Check-in (`/check-in/[eventId]`, QR code token validation, idempotent check-in).
     5. Points & Activity History (`/my-activity`, `/leaderboard`, activity feed synchronization, points incrementing).
     6. Engineering Profile (`/profile`, student info, department, college, stats, badges progression, attended events list, verified certificates showcase).
     7. Certificate Issuance & Verification (certificate generation trigger, verification status, download URL).
   - Ensure existing Firebase, Auth, Firestore, certificate, email, and security architecture are strictly retained without duplicate backend/database architectures.

2. **UX & Polish Verification via Browser Inspection**:
   - Verify that Arabic RTL (`dir="rtl"`) and English LTR (`dir="ltr"`) render correctly without layout breakage using headless Chrome (`/home/bader/.config/Antigravity/bin/google-chrome`) or Puppeteer script (`./functions/node_modules/puppeteer-core`).
   - Verify mobile responsiveness on mobile viewports (<640px) vs desktop.
   - Verify state handling: loading skeletons, empty states (no events, no activity, no certificates), and error banners.

3. **Author Cloud Functions Identification Report (R4)**:
   - Create `/home/bader/Documents/IEEE QU SITE/CLOUD_FUNCTIONS_REPORT.md` documenting:
     - Executive summary of the distributed architecture.
     - Feature-by-feature breakdown of capabilities strictly requiring deployed Cloud Functions:
       - `registerForEvent`: Atomic server-side capacity check and registration record creation.
       - `processCheckIn`: Dynamic QR JWT token validation and idempotent attendance logging.
       - `issueCertificates`: Event completion trigger, attendance filtering, and certificate document creation.
       - `getCertificateDownloadUrl`: Signed URL generation from Google Cloud Storage with expiry.
       - `generateCertificate`: Headless Puppeteer HTML-to-PDF rendering with high-resolution vector canvas.
       - `authBlocking`: Identity Platform blocking functions for domain/student ID validation.
       - `scheduledEventReminders`: Cloud Scheduler cron for automated email reminders via Resend.
       - `onEventStatusChanged`: Firestore triggers for automated notifications.
     - Document client-side capabilities vs backend capabilities.
     - Provide deployment guide, environment variables, and required secrets.

4. **Run Verification Commands**:
   - Run `npm run build` (verify exit code 0).
   - Run `npm run lint` (verify exit code 0).
   - Run `npm test` (verify all 93 tests pass across all 4 tiers).

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Next.js AGENTS.md Rule
Read `AGENTS.md` and check `node_modules/next/dist/docs/` before making changes.

## Output Requirements
Write your detailed report to `/home/bader/Documents/IEEE QU SITE/.agents/worker_m5_m6/report.md` and 5-component handoff to `/home/bader/Documents/IEEE QU SITE/.agents/worker_m5_m6/handoff.md`.
