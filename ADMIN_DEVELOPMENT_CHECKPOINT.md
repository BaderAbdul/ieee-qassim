# Admin and student operations — development checkpoint

Date: 2026-10-10. Status: implemented locally and tested; NOT deployed to production.

This checkpoint preserves Firebase Spark, the existing Vercel backend, Cloudinary media, Arabic/English, and the authentication startup/PDF import repairs. No production account, registration, points balance, certificate, environment setting or Firebase rule was changed during this implementation. The pre-existing edit in SPARK_RELEASE_REPORT.md was preserved.

## Implemented

- Admin command center: database counts, pending approvals, certificate/mail attention queues, active-event links and explicit load failures. Marketing settings moved into Site content.
- Shared event workspace: summary/report, content editor, registration desk, check-in, certificates and feedback.
- Database-backed member search: name/email prefix, exact student ID/account ID, bounded results and pagination. Structure member lookup uses the same search rather than the first 50 users.
- Explicit waitlisting rather than accidental rejection, chronological registration pagination, complete CSV export, safe quotation/formula handling and partial bulk results with failed-only retries.
- Stable operation IDs for manual points; duplicate requests return the original result. Excess deductions are rejected. Ledger entries store before/after balances.
- Profile completion/identity editing through a transactionally claimed university ID; Arabic/Persian digits supported. Public profile projections remain separate from email/student IDs.
- Admin changes validated and audited on the server: event creation/content/pinning/state, member role/restriction/archive, attendance/token rotation, manual points, certificates and homepage/structure edits.
- Event creation always starts as a draft with zero counters. Content editing never writes registration/attendance counts; stale editor submissions are rejected. Capacity cannot fall below reserved seats.
- Safe state transitions and publication readiness validation. Finishing/archiving invalidates the self-check-in secret.
- Account archive retains prior records and blocks platform use rather than deleting the profile and allowing recreation. Last active super admin is protected. Firebase Auth accounts are NOT permanently deleted.
- Structure saves confirm actual persistence and reject stale concurrent saves. Homepage edits no longer overwrite structure from an old form snapshot.
- QR expiry/countdown, recent manual check-ins, duplicate-scan guarding and keyboard focus recovery.
- Certificate batch results distinguish individual failures. CSV link import has preview/validation, revoked certificates are not offered for reissue, and large requests are split. Rendering refreshes a single certificate rather than reloading every attendee on every completion. Changed eligibility becomes an actionable Failed state.
- Mail scheduling queries select due tasks rather than letting deferred jobs hide ready work. Older uncertain deliveries are not resent automatically.
- Student status display handles rejection/cancellation explicitly. Tokenless check-in links show instructions. Feedback editing is a separate authenticated operation and never awards points again. Ratings require an actual choice rather than defaulting to 5.
- Safe return to the intended event after onboarding; live certificate-status updates and user-clicked download links rather than potentially blocked async popups.
- Riyadh display and editor timezone consistency, zero-attendance display correction, translated event labels, responsive event filters/pagination, shared competition ranks, and accurate lifetime leaderboard wording.
- Help/contact page, technical privacy clarification, skip link, accessible navigation labels, reduced-motion/focus styling, mobile admin menu, event sharing metadata, public sitemap and crawler exclusions for private journeys.
- Explicit local demo testing is guarded by demo-* project IDs and local emulator hosts. /dev-signin is unavailable in production. scripts/seed-demo.mjs refuses non-local emulator hosts.

## Verified

| Check | Result | Scope |
| --- | --- | --- |
| ESLint | PASS | Current source, including multiple TSX changes |
| TypeScript | PASS | Production build typecheck and local checks |
| npm test | 159 / 159 | Mixed simulation, regression, static-contract and runtime checks; not 159 real-browser tests |
| npm run test:spark:build | 27 / 27 | Actual built Next handlers with real local Auth/Firestore emulators under strict CommonJS |
| Actual Firestore rule checks | PASS | Identity/role/points/event/homepage bypass attempts denied; safe owner photo edits allowed |
| Arabic PDF | PASS | Real PDF bytes produced; Cloudinary transport mocked |
| npm run test:bundle | PASS | Only traced deployment files copied to a disposable folder; both API bundles start and return structured 401 |
| Production build | PASS | An inherited global image metadataBase warning remains; locale metadata uses the canonical .online fallback |

The integration checks cover FIFO/capacity, waitlist actions, restricted waitlist candidates, duplicate attendance, concurrent point awards, concurrent student-ID claims, feedback editing, certificate partial failures/revocation/eligibility, member search beyond 50, last-admin protection, stale content saves and audited server edits.

The browser reached the local demo sign-in and authenticated admin frame. It exposed a loopback-origin discrepancy, which was fixed only for explicitly enabled development/demo environments. Local server mail API requests then returned 200. The embedded browser later crashed and its error page was blocked by Browser Use policy. Full visual/mobile/camera verification was NOT completed, no protection was bypassed, and no screenshot is represented as a successful final visual review.

## Release gates — do not skip

1. Review this diff and create a release checkpoint. Keep the CommonJS authentication override and native PDF imports.
2. Add the new Firestore indexes from firestore.indexes.json and wait until ready: events/state/date ASC; notification_jobs/status/nextAttemptAt ASC; notification_jobs/status/leaseExpiresAt ASC. Index addition is additive; do not include Functions deployment.
3. Test the complete admin/student flow on an isolated preview/demo: fresh student, existing student, organizer and super admin; Arabic/English; phone/desktop; camera and fallback input. Cloudinary/PDF/link delivery and the configured mail provider still need a real-service pilot.
4. Release the compatible application BEFORE the stricter Firestore rules. The previous app writes identity/events/homepage directly, so publishing the new rules ahead of the application would break those old forms.
5. Publish only the reviewed Firestore rules after the compatible app is live; cached old forms may require a refresh. Do not publish the historical Functions implementation, switch to Blaze, copy production secrets into previews or run production data preparation automatically.
6. Verify production with a small authorized pilot and a documented, compatible rollback. Do not revert to public user data or self-awarded points rules. Do not reset existing production totals or counters.

## Still open — not claimed complete

- Complete visual/mobile/keyboard/camera and real-provider testing; validate actual production indexes and configuration.
- Per-event/task-specific staff permissions. The existing student/event_organizer/super_admin roles remain; organizers still have their existing broad event access.
- Unattended email/certificate workers and automatic reminders. Current processing still requires relevant admin pages to remain open; no new paid service was provisioned.
- Tested production backups/restoration, independent alerts, historical projection/counter reconciliation and retention policy. No production preparation script was applied.
- Member-wide activity/detail view, formal correction-ticket workflow, public-profile visibility controls, semester-specific rankings and reusable event templates.
- Additional server-side search/filtering for full event/idea archives. Loaded-event filters are explicitly labeled as such.
- Legal/club-owner review of the privacy wording, retention/deletion process and certificate cancellation policy before publication.

## Local demo

Start Auth/Firestore emulators with project demo-ieee-qu. Run scripts/seed-demo.mjs with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099. Start development with NEXT_PUBLIC_FIREBASE_EMULATORS=true, NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ieee-qu, fake public Firebase configuration and the same emulator hosts. Open /ar/dev-signin. Do not enable these flags on Vercel or use real account data as fixtures.

Local servers/emulators used for this checkpoint were stopped cleanly. Production is unchanged.
