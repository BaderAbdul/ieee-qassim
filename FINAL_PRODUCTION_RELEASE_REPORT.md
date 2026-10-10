# IEEE Qassim — production release report
Date: 10 October 2026 (Asia/Riyadh)

**Historical checkpoint:** this report describes the earlier Firebase Functions implementation. The subsequent Spark/Vercel/Cloudinary migration and its verification are documented in SPARK_RELEASE_REPORT.md. It is not yet a verified live deployment.

## Release classification: NOT READY

The local release candidate now builds and passes its verification gates. Production is not ready because the read-only Firebase check returned **zero deployed Cloud Functions in ieeeqassim**. The secured frontend depends on those functions. New rules, public profile preparation, and indexes must be deployed together before students use this release.

The agent did not change production data, security rules, functions, or the hosted website. Subsequently, the owner reported publishing the new Firestore rules manually and adding Cloudinary server configuration in Vercel. These are user-reported changes, not independently verified deployment evidence.

## Spark decision and repository checkpoint

The owner has chosen to retain Firebase Spark. The public website response headers identify Vercel hosting at www.ieeequ.online. Existing event cover uploads already use Cloudinary. The backend migration to authenticated Vercel endpoints and the migration of avatars/private generated certificates to Cloudinary remain unimplemented. External HTTPS certificate links must remain supported. The current Firebase Functions-based candidate is not a completed Spark-compatible release, and the published restrictive rules alone can block student operations.

At the owner's request, this work is being saved to a separate codex branch as an engineering checkpoint, not merged into main. Previous verification evidence below applies to the local Firebase Functions architecture, not to an implemented Vercel backend.

## Changes delivered

- Registration, cancellation, organizer approval/rejection, and FIFO cancellation promotion run under a backend capacity transaction. Pending registrations reserve seats; waitlisted registrations do not.
- Student and organizer attendance use one backend service. Client fallbacks and direct client point awards were removed.
- Backend-generated check-in tokens use 256 bits of randomness, live in private event_secrets documents, and expire after 15 minutes. Legacy public event tokens are ignored.
- Attendance writes one deterministic attendance log and ledger entry. The points trigger updates totals and its aggregation marker atomically, preventing duplicate delivery from crediting points twice. Deductions floor at zero; attendance badges also work for zero-point events.
- Student documents are private. public_profiles is a backend-maintained projection for cards, structure, rankings, and the leaderboard. It excludes email and university ID, including unapproved nested fields.
- Firestore rules block client writes to registrations, attendance, points, feedback, tokens, and certificates. Owners can update a profile whitelist; only super admins can change roles. Restricted accounts cannot perform protected operations.
- Avatar uploads allow only owner-written JPEG/PNG/WebP images up to 5 MB. Certificates remain inaccessible through direct client Storage access.
- Certificate issuance requires a completed certificate-enabled event and an attendance record. It deduplicates recipients, preserves revocation, uses Arabic names, and supports authorized external HTTPS certificates.
- The real PDF worker embeds local Arabic fonts, escapes inserted text, waits for fonts, uploads PDFs, and caps Chromium concurrency. Downloads recheck ownership and current certificate status.
- Email initialization no longer prevents deployment discovery when secrets are absent. The worker uses provider idempotency keys; stale processing jobs can be recovered. Template text is escaped and certificate links point to ieeequ.org.
- Member and registration desks use 50-record cursor pages. The attendance loading skeleton matches the current poster layout. Data failures activate error recovery instead of showing false empty states.
- Auth subscriptions and delayed initialization clean up correctly; popup cancellation does not force redirect login.
- Next.js updated to 16.3.8; backend Admin/Functions packages updated to 14.5/7.4 with modular Admin APIs and explicit v1 imports. Functions target Node 22. Known affected grpc, sharp, source-map, and brace-expansion dependencies were patched.
- Test runner now expands file paths, uses a stable reporter, counts actual assertions, enforces thresholds, and includes challenger tests. Stale route and client-write expectations were updated.

## Verification evidence

| Check | Result | Meaning |
|---|---|---|
| Production Next.js build | PASS, Next.js 16.3.8 | All 25 localized page routes compile; one inherited metadataBase warning remains |
| TypeScript, frontend | PASS | Run after generation of build route types |
| ESLint | PASS, no errors or warnings | Current source passes configured rules |
| Cloud Functions TypeScript build | PASS | Compiled output updated |
| Function module discovery without mail secrets | PASS | Functions exports load locally |
| Regression suite | 144 / 144 PASS | Domain simulations and source-contract checks; not proof of deployment |
| Real Firebase emulator suite | 18 / 18 PASS | Actual Firestore/Storage rules plus compiled backend handlers against demo-ieee-qu |
| 300-student registration exercise | PASS | Five concurrent callers; 100 approved, 200 waitlisted; FIFO promotion preserves count |
| Arabic certificate rendering/upload | PASS | Actual Chromium worker produced PDF bytes in emulated Storage |
| Email worker | PASS with emulator delivery adapter | Real queue/trigger deduplication; no live email was sent |
| Backend dependency audit | 0 vulnerabilities | Fresh audit after updates |
| Frontend dependency audit | Fresh check unavailable | Registry repeatedly reset TLS connections; earlier advisories drove the installed patches. Development-tool advisories remain from the successful full audit |
| Local Arabic and English route HTTP responses | 200 | Production server responds on /ar and /en |
| Final mobile/English visual review | Pending | Browser preview could not reach the local production server, despite its HTTP response. Initial Arabic page was inspected, but no final visual approval or CLS measurement is claimed |

The build/configuration failure reported during discovery came from restricted subprocess execution. Running the build with normal process access passed; no type-check bypass was introduced.

The emulator calls compiled handler bodies in-process and tests real database transactions/security rules. It does not test Firebase's hosted callable authentication transport, cloud retries, billing, or live provider delivery. The 300-student exercise is not a claim that 300 requests arriving simultaneously have been load-tested.

## Student journey matrix

| Stage / route | Local implementation | Verification / release condition |
|---|---|---|
| Google login, all domains | Firebase Auth; no domain blocking functions exported | Profile creation rules tested; actual Google popup/redirect remains a pilot check |
| /ar or /en | Bilingual home, bounded event reads | Build and Arabic HTTP check pass |
| /complete-profile | Owner profile writes; backend ID availability check | ID check does not establish a globally unique identity constraint |
| /events and /events/:id | Catalog/details, protected backend registration and cancellation | Auto/manual/full/zero/unlimited capacity, re-registration and FIFO tested |
| /events/:id/checkin | Backend token/approval/event-state checks | Forged/expired links, waitlist denial, duplicate scans tested |
| /profile | Registrations, points, certificates, card customization | Backend ledger and protected downloads tested |
| /leaderboard, /pass/:id, /structure | Safe public projection | Projection/rules tested; existing users require preparation |
| /privacy and /terms | Existing bilingual policies | Included in build; operational data practices need owner review |

## Organizer journey matrix

| Operation / route | Enforcement and result |
|---|---|
| /admin | Client access guard plus backend/rule role enforcement |
| /admin/events/create and /edit | Organizer event writes; counters and token fields protected; capacity cannot shrink below reservations |
| /admin/events/:id/registrations | Backend approval/rejection/cancellation and attendance; paged data |
| /admin/check-in and /checkin-desk | Backend token generation; authenticated organizer scans |
| /admin/events/:id/certificates | Backend issuance, external HTTPS import, retry/revoke and owner-authorized downloads |
| /admin/users | Super-admin role/restriction changes; backend manual point ledger |
| /admin/events/:id/feedback | Read-only organizer analytics |
| /admin/ideas and /admin/structure | Existing management surfaces; private contacts excluded from new public submissions |

Opening a larger capacity with an existing waitlist still requires organizer approval of existing candidates; automatic promotion is implemented for released cancellation/rejection seats. No automatic capacity-expansion workflow was added.

## Production verification

Read-only checks on 10 October 2026:
- functions:list --project ieeeqassim --json returned success with result [].
- firestore:indexes --project ieeeqassim --json returned the existing deployed indexes, including registration eventId/status/timestamp FIFO support.
- New certificate userId/issueDate, attendance userId/timestamp, and mail status/updatedAt indexes exist locally and require deployment.
- Current deployed Firestore and Storage rules were not independently fetched; local changes must not be represented as deployed.
- Local .env.local contains the public Firebase identifiers and email configuration names. Secret values were not printed or committed. Server Admin credentials are absent from that local file; the public homepage falls back to public Firebase reads without initializing a dummy Admin project.
- Production secrets, verified email sender, IAM signing permissions, Node runtime, Auth authorized domains, backup settings, and hosted frontend revision were not verified.

## Required release actions

1. Review this diff and reserve a maintenance window. Do not publish only the frontend: old browser workflows will be blocked by the new rules.
2. Verify billing, default us-central1 function region, Google sign-in/authorized domains, project IAM, and the certificate Storage bucket.
3. Back up Firestore and relevant Storage objects. Audit historical attendance and point records: old rules allowed client-authored records, so their existence is not evidence of legitimate attendance.
4. Run the read-only preparation script with administrative credentials:
   node functions/scripts/prepareRelease.cjs --project ieeeqassim
   Review the counts, then approve its --apply mode. It builds safe public projections, reconciles event counters, marks existing ledger entries as a pre-release aggregation baseline, and removes legacy public tokens and idea emails. It deliberately preserves current point totals; corrections need an audited ledger adjustment. The script was prepared, not executed against production.
5. Configure RESEND_API_KEY in Firebase Secret Manager and SENDER_EMAIL as the verified sender in the Functions environment. Configure private Firebase Admin credentials for the hosted Next.js runtime if its privileged read path is used. JWT_SECRET is no longer required for this token workflow.
6. During maintenance, deploy Firestore/Storage rules and indexes, apply the reviewed preparation, deploy functions, verify function discovery, then publish the matching frontend. The exact commands are in CLOUD_FUNCTIONS_REPORT.md.
7. Test one real event with a small group: external-domain login, profile completion, manual/automatic registration, waitlist promotion, rotating QR, repeated scan, points, event completion, PDF download, and live email. Verify a revoked certificate is refused. Existing signed URLs can last for 15 minutes; deletion invalidates stored PDFs, while external URLs are controlled by their provider.
8. Complete final Arabic/English phone and keyboard/screen-reader checks, and repeat the frontend production audit when the registry is available.
9. Establish alerts for failed certificates, stale mail, callable errors, and unusual ledger activity; configure managed backups and a recovery owner. These operational settings were not created.
10. Expand from the pilot only after those checks pass.

## Rollback

Keep a database backup and the previous frontend/release revision. A frontend rollback alone is incompatible with backend-only rules. Coordinate rules, functions, and frontend revisions; do not restore permissive student points/attendance writes as a quick workaround.

## References

Firebase's documented transaction and delivery behavior informed these changes:
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/functions/firestore-events
- https://firebase.google.com/docs/functions/manage-functions

This report supersedes historical blanket readiness attestations.
