# Spark / Vercel / Cloudinary migration

10 October 2026, Asia/Riyadh. Local core migration; not a verified production release.

## Production startup incident — repaired; real-user pilot pending

Repair bda7ffb was first tested on Vercel Preview dpl_7hxyNw9gJSCWumN7UX9x8B8z3sgM: both API routes returned expected GET 405 responses instead of empty 500s. It was then released to Production dpl_48BUZwu3aVMrntEvn3SPLudpw9oh (READY). Live POST checks on www.ieeequ.online returned structured 401 responses for missing authentication on syncPublicProfile/media and an invalid diagnostic token on registerForEvent. The invalid-token check confirms authentication initialization reaches token verification with Production configuration. No real registration, attendance, points or media writes were made by these probes.

The repaired candidate passed 148 regressions and all 14 emulator tests using the actual built Next.js route handlers under strict CommonJS loading, including PDF rendering. Isolated traced bundles also started under that mode. This confirms the startup failure is resolved; it does not replace a real-user Google sign-in/registration/attendance and live Cloudinary pilot. A scoped post-deploy error/fatal log query returned no matching records during the short observation window, not a permanent all-clear.

### Root cause and repair candidate

After Vercel project access became available, runtime error clusters identified ERR_REQUIRE_ESM: jwks-rsa 4.1.0 required the ESM-only jose 6 package during Firebase Admin authentication initialization. This reproduced locally when Node's experimental require(ESM) support was disabled. A scoped firebase-admin → jwks-rsa 3.2.0 override restores CommonJS-compatible loading without changing other jose consumers. A regression test also resolves a generated RSA public signing key using the exact library Firebase Admin resolves.

The certificate renderer now preserves native import() for its ESM-only Chromium/Puppeteer dependencies instead of Webpack converting them to require(). The candidate adds verification of the actual built Next.js API handlers, not only TypeScript-transpiled test copies, under the strict module-loading mode used to reproduce the Vercel failure. Existing empty-response handling, bounded requests and live leaderboard updates are included. This section records a repair candidate; deployment and live checks must still be recorded separately.

Fresh production dependency audit completed and reports three unrelated advisories (basic-ftp high; gaxios/uuid moderate), with none against the selected jose/JWKS compatibility chain. Do not claim an all-clear dependency audit. The incident fix does not silently force unrelated major upgrades.

At the owner's request, d5f9dfa was pushed to main and Vercel reported the Production deployment complete. Subsequent live checks found /ar and /en returning 200, but both /api/media and /api/platform/syncPublicProfile returning empty HTTP 500 responses, including unauthenticated GET/POST requests. Therefore registration, attendance, points and projection synchronization cannot be declared operational. The original JSON parsing alert was a client-side symptom of that empty upstream response, not evidence of incorrect points or missing attendance eligibility.

Current local-only safeguards handle empty/HTML responses explicitly, bound request waiting and make the leaderboard subscribe to safe public-profile changes. They have not been deployed. An isolated test copying only Next.js-traced files successfully initialized both built API route modules and returned structured 401 responses for unauthenticated requests. That rules out a simple missing-file failure in the local trace copy; it does not identify the cloud runtime failure. Vercel runtime logs/access remain required before another production change. No database migration or points rewrite was run as incident recovery.

## Implemented

- Browser operations use same-origin POST /api/platform/{action}, not Firebase callable transport. Every operation verifies a Firebase ID token and current account restriction; organizer operations use the Firestore role. Revoked tokens, invalid origins, oversized JSON and invalid operations are rejected. Per-account Firestore rate limits bound requests; Vercel platform protection is still needed for unauthenticated traffic.
- Registration/cancellation/approval and FIFO promotion preserve backend transactions and capacity semantics.
- Attendance, immutable points entry, total/badges and safe public projection commit together. No Spark-unavailable Firestore trigger is required. Manual adjustments also update totals and projections atomically.
- User role/restriction/deletion management updates the public projection in the same transaction. Own profile snapshots request a projection refresh; failed refreshes can be retried on next profile change/sign-in. Existing public profiles still need initial preparation.
- Avatar and event cover uploads go through authenticated Vercel /api/media, with organizer authorization for covers, 3 MB limit, JPEG/PNG/WebP header checks and server-side Cloudinary signatures. No new unsigned upload preset is required.
- Generated Arabic PDFs are uploaded as authenticated Cloudinary assets, not Firebase Storage. Credentials never go to the browser. Certificate downloads recheck current status and ownership before issuing a five-minute private download URL.
- External HTTPS certificate links remain assignable individually and via the existing CSV interface. Assignment requires completed enabled event and verified attendance. External links inherit privacy controls from their host.
- Generation jobs use expiring leases and compare lease/status before publishing, preserving revocation during rendering. The organizer certificates page drains jobs sequentially while open. Failed jobs can be retried. Closing the page pauses new work; reopening resumes it. A terminated request's lease takes up to five minutes to expire.
- Historical Firebase Functions and Storage code is retained, but the current frontend core flows no longer depend on deploying them.
- Registration status changes, FIFO promotions, attendance, certificate availability and revocation now create notification_jobs within the same database transaction as the business change. Authoritative private profile email is used, including promotions; cached historical registration email is not trusted. These jobs are separate from legacy mail, so old pending messages are never silently replayed.
- An opt-in Resend worker drains up to three due notifications each minute while the organizer dashboard is open. Jobs use leases, bounded retries and provider idempotency keys. Uncertain deliveries older than the provider's 24-hour dedupe window go to REVIEW rather than risk duplicate automatic sending. Provider error details are not exposed. Plain-text Arabic/English messages avoid HTML injection.

## Verification

- Final production Next.js build, TypeScript and lint passed. The build contains both new API routes; traced backend files include Chromium and both Arabic fonts (about 86 MiB of traced files).
- 144 existing regressions passed. They include simulations and historical Functions source contracts, not deployment proof.
- New emulator suite: 14/14 passed against actual compiled Vercel route handlers with real local Auth and Firestore emulators. Tests cover bearer authentication, privilege boundaries, registration capacity/FIFO, token rotation, concurrent check-in deduplication/atomic points, deductions, external links, revocation, private projections, invalid media, actual Arabic Chromium PDF bytes, origin/body validation, super-admin account management, signed avatar uploads, rate limits, notification lease deduplication, safe retry and uncertain-send review.
- Built local Arabic/English pages returned 200; both compiled API routes returned 401 without authentication. This is not a real-user provider pilot.
- Cloudinary is a mocked service adapter in tests; no real files were uploaded. PDF upload mode and download signatures/expiry were checked, but actual account configuration is unverified.
- Emulators use demo-ieee-qu only; no production data was written.
- GitHub/Vercel reported the previous c000344 preview deployment successful. A read-only availability check was redirected to Vercel SSO protection. This does not verify authenticated flows, Preview secrets or live Cloudinary/Resend configuration, and protection was not bypassed or disabled.

## Before production merge

1. Configure Firebase Admin and Cloudinary credentials in the Vercel environment serving this branch. The owner supplied screenshots/reports of Production configuration, not Preview; a preview without private credentials must fail closed. Do not copy secrets into Git or chat. Node 22 or newer is required; local verification uses Node 24.
   For optional email sending, also configure RESEND_API_KEY and verified SENDER_EMAIL, then explicitly set EMAIL_NOTIFICATIONS_ENABLED=true. Until enabled, jobs are safely queued but not sent. Review the queued jobs/recipient list and provider quota before enabling. Preview tests must use a demo Firebase project and test-only recipients to avoid contacting real students. Add the chosen preview domain to Firebase Auth authorized domains if sign-in is rejected; do not weaken Firestore rules or remove Vercel protection to fix it.
2. Enable Cloudinary PDF delivery in the product environment security settings. Test authenticated PDF upload/private download with the actual account. If unavailable, external links remain an alternative; never fall back to public certificate uploads.
3. Back up existing data, inspect historical points/attendance, prepare safe public profiles and reconcile counters. The existing preparation script is dry-run first and requires ADC credentials. It was not run against production. Initial preparation and the required Firestore indexes remain release steps; the owner reports publishing the secured Firestore rules already.
4. Deploy a preview containing the new API endpoints and server credentials, then test Google sign-in, registration, QR attendance, points, avatar/cover uploads, generated and externally linked certificates in Arabic and English. Confirm PDF fonts/Chromium are included in Vercel's traced deployment bundle and requests fit the account's function limits. Local compilation is not live provider verification.
5. After the new upload paths are working, disable/restrict the old unsigned Ieee_events Cloudinary preset to prevent anonymous quota abuse. Doing so before migration can break the old live cover-upload screen.
6. Only then merge/release the tested branch, and run a small real-event pilot. Do not restore insecure rules to bypass backend failures.

## Explicit limitations

- Scheduled upcoming-event reminders have not been migrated. Mail retries run only while the organizer dashboard is open; there is no always-on mail worker or fixed delivery SLA. Bounded queries/batches can delay a large backlog. FAILED and REVIEW jobs require manual inspection; no automatic resend beyond the provider dedupe window is attempted. Legacy mail remains untouched.
- There is no cloud background certificate worker or cron scheduler in this release. The organizer page must remain open to drain its queue.
- Existing Firebase Storage certificate files are not moved automatically. Such records report a migration-required error; existing approved external HTTPS links continue to work.
- No new production deployment, live Cloudinary request, final mobile visual approval, backup schedule or alert channel has been verified.
- Five-minute download URLs already issued may remain usable until expiry. External links cannot be revoked at their third-party host by changing the local certificate status.
- Spark/Vercel/Cloudinary quota availability is finite, not a guarantee of unlimited free service. Monitor usage and provider limits.

## Commands

```sh
npm ci
npm run lint
npm run build
npx tsc --noEmit
npm test
npm run test:spark
```

Do not deploy Firebase Functions or enable Blaze for this architecture. Keep the secured Firestore rules and the matching frontend/API release coordinated. Never merge merely because a Git push or local test succeeded.
