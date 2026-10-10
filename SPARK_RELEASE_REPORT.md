# Spark / Vercel / Cloudinary migration

10 October 2026, Asia/Riyadh. Local core migration; not a verified production release.

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

## Verification

- Final production Next.js build, TypeScript and lint passed. The build contains both new API routes; traced backend files include Chromium and both Arabic fonts (about 86 MiB of traced files).
- 144 existing regressions passed. They include simulations and historical Functions source contracts, not deployment proof.
- New emulator suite: 11/11 passed against actual compiled Vercel route handlers with real local Auth and Firestore emulators. Tests cover bearer authentication, privilege boundaries, registration capacity/FIFO, token rotation, concurrent check-in deduplication/atomic points, deductions, external links, revocation, private projections, invalid media, actual Arabic Chromium PDF bytes, origin/body validation, super-admin account management, signed avatar uploads and rate limits.
- Built local Arabic/English pages returned 200; both compiled API routes returned 401 without authentication. This is not a real-user provider pilot.
- Cloudinary is a mocked service adapter in tests; no real files were uploaded. PDF upload mode and download signatures/expiry were checked, but actual account configuration is unverified.
- Emulators use demo-ieee-qu only; no production data was written.

## Before production merge

1. Configure Firebase Admin and Cloudinary credentials in the Vercel environment serving this branch. The owner supplied screenshots/reports of Production configuration, not Preview; a preview without private credentials must fail closed. Do not copy secrets into Git or chat. Node 22 or newer is required; local verification uses Node 24.
2. Enable Cloudinary PDF delivery in the product environment security settings. Test authenticated PDF upload/private download with the actual account. If unavailable, external links remain an alternative; never fall back to public certificate uploads.
3. Back up existing data, inspect historical points/attendance, prepare safe public profiles and reconcile counters. The existing preparation script is dry-run first and requires ADC credentials. It was not run against production. Initial preparation and the required Firestore indexes remain release steps; the owner reports publishing the secured Firestore rules already.
4. Deploy a preview containing the new API endpoints and server credentials, then test Google sign-in, registration, QR attendance, points, avatar/cover uploads, generated and externally linked certificates in Arabic and English. Confirm PDF fonts/Chromium are included in Vercel's traced deployment bundle and requests fit the account's function limits. Local compilation is not live provider verification.
5. After the new upload paths are working, disable/restrict the old unsigned Ieee_events Cloudinary preset to prevent anonymous quota abuse. Doing so before migration can break the old live cover-upload screen.
6. Only then merge/release the tested branch, and run a small real-event pilot. Do not restore insecure rules to bypass backend failures.

## Explicit limitations

- Automatic email notifications, mail retries and scheduled event reminders from the old Firebase Functions architecture have not been migrated. Do not promise automatic mail delivery in this candidate.
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
