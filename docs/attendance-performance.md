# Attendance and required feedback

Attendance commits immediately for both organizer scans and the shared event QR. Each signed-in student submits a separate request; there is no global queue or wait for another student's rating. The shared QR remains valid for multiple users until expiry/rotation. Manual attendance creates the same required-feedback task and organizers cannot submit a rating for a student through check-in.

Pending feedback is a durable server record in `pending_checkins`. The global modal remains until feedback saves, including on subsequent visits. Native modal dialogs occupy the browser top layer above the navbar, trap focus, reject Escape dismissal and make background navigation inert. A signed-in student cannot bypass the gate by reloading or navigating directly; the gate waits for server verification and fails closed on query errors. Student platform activities are also rejected server-side while feedback is pending, with attendance, rating, profile completion and internal public-profile synchronization exempt; organizer scanning is exempt. It starts with five stars selected; valid saved drafts and previous ratings are preserved. Feedback drafts are kept locally per account/event and failures retain the form. Browsers cannot force people who leave the site to return; the obligation remains pending when they return.

Attendance, registration, points, counters and the feedback task commit atomically. Deterministic attendance/point IDs make retries safe. Feedback only changes its own document and task state. The HTTP client retries transient attendance/feedback failures once with jitter, never retries permission/validation/rate-limit failures, and never claims a server save while offline.

The QR rating form is server-rendered with five stars instead of a full-page loading spinner. Account restoration, event questions and attendance confirmation run behind it. Students can adjust their rating immediately; saving waits for their own attendance and the current event questions, not anyone else's rating. QR check-in no longer performs redundant registration/previous-feedback reads. In-memory event data is reused when available, authentication's artificial 100ms delay is removed, and profile updates no longer trigger redundant projection requests on every points change.

## Contention and totals

Attendance writes one of 64 deterministic counter shards under `events/{eventId}/attendance_shards`; it never writes the shared event document. Existing `attendanceCount` is the migration baseline. All counter displays add the shard sum to that baseline, including negative deltas for cancellation of legacy attendance. Do not manually overwrite the baseline or reset shards independently.

The badge-history range query runs outside the critical transaction. Its advisory badge calculation may catch up on the next attendance if one user attends multiple different events simultaneously; attendance and points remain transactional. Queries and document reads within the critical transaction run concurrently. Notifications are queued in the transaction, not delivered during check-in. Re-attendance after cancellation gets a new notification identity.

Only organizer screens and completed public events subscribe to shard changes. Admin lists/overview use sum aggregation. Each student listens to at most one of their own pending feedback tasks, rather than all attendees. Camera scanning stays open, pauses during confirmation, and suppresses repeated detection of the same QR.

The admin event list loads a bounded page of 25 events and their aggregated counters through the authenticated `getAdminEvents` API. The server checks the organizer role before using the Admin SDK; browser permission to read attendance shards is not required for this list. Dates are returned as ISO strings and pagination uses document IDs. Public live totals and the required-feedback listener still need the deployed Firestore rules and indexes below.

`EventCard` is a client entry point because it calls the live attendance hook. Verify the landing page with populated events after builds; an empty event collection does not exercise this server/client boundary. The Firebase regression test named `Admin event list` explicitly denies browser shard reads and checks the authenticated list, totals, date serialization, pagination, and authorization.

## Deployment

1. Deploy `firestore.rules` and `firestore.indexes.json` to the configured Firebase project, and wait for the new `pending_checkins(userId, status)` index to be ready.
2. Deploy the web app with its existing Firebase credentials. If legacy Cloud Functions are still used, deploy their updated attendance implementation too; do not leave old code incrementing the event baseline alongside the new version.
3. Open the event's registrations screen and run its existing attendance sync to restore required feedback for previously attended students whose prompt was lost. Re-scanning an already attended student also restores a missing obligation without awarding points again.
4. Verify both scan directions, a manual scan, expired tokens, and a dropped connection against staging. Align the app's server region with the Firestore database region to reduce round trips. Check the hosting concurrency and Firebase quotas on the actual deployed plans before the event.

## Validation

The focused Firebase emulator tests cover token rotation, duplicate scans, atomic points, independent required feedback, cancellation/re-attendance, security rules, and 300 concurrent students followed by 300 ratings and duplicate retries. The original two-stage 300-student scenario completed in about 7.4 seconds locally after removing transaction range-query locks. An overlapping scenario, where each student rates immediately after their own attendance commits while others are still checking in, completed in about 8.5 seconds; this is correctness/concurrency evidence, not a production latency guarantee or an HTTP hosting load test.

TypeScript and the production build pass with placeholder public Firebase configuration. Retry/response unit tests pass. The broader existing emulator suite also exposed unrelated failures in Arabic PDF rendering on Windows and an event-content-save test expecting Draft despite the existing state override; these were left outside this attendance change.

Firebase references: https://firebase.google.com/docs/firestore/solutions/counters and https://firebase.google.com/docs/firestore/transaction-data-contention.


Follow-up browser verification used the local demo project and confirmed: five selected stars, no navbar overlap at desktop and 390x700, Escape dismissal prevented with native event handlers, pending feedback restored after direct navigation/reload with the draft intact, and background navigation unlocked only after server-confirmed submission. A route loading boundary streams a five-star rating shell while route code loads. The required check-in and feedback submission paths remain exempt from the student activity gate. Preview: `required-feedback-preview.jpg`.
