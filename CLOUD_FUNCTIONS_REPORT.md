# Cloud Functions and release operations

Updated 10 October 2026. See FINAL_PRODUCTION_RELEASE_REPORT.md for evidence and limitations.

## Production status

A read-only functions:list check of ieeeqassim returned success with an empty function list. None of the functions below was verified as deployed. Local code and passing emulator tests do not make these capabilities available to students.

## Required functions

| Capability | Function exports |
|---|---|
| Registration/capacity | registerForEvent, cancelRegistration, manageRegistration |
| Attendance | generateCheckInToken, submitCheckIn, processCheckIn (compatibility), manualAttendanceOverride |
| Points | addManualPoints, onPointTransactionCreated |
| Public member projection | onUserProfileWritten |
| Private onboarding lookup | checkUniversityId |
| Certificates | issueCertificates, saveExternalCertificate, generateCertificate, getCertificateDownloadUrl, retryCertificate, revokeCertificate |
| Email | emailRegistrations, emailAttendance, emailCertificates, processMailQueue, retryMailQueue, sendEventReminders |
| Legacy cancellation reconciliation | onRegistrationCancelled |

There are 24 deployed-function candidates. Helper exports are not callable endpoints. The old beforeCreate/beforeSignIn domain-blocking module is retained as historical source but is not exported; Google sign-in has no university-domain restriction and does not require Identity Platform blocking functions.

Student registration, attendance, points and certificate writes are backend-only. Function failures show errors; browser fallbacks do not write privileged records.

Tokens are random 256-bit values stored in event_secrets, expire after 15 minutes, and rotate when the organizer regenerates the QR. Students cannot read that collection. JWT_SECRET is not used.

## Runtime/configuration

- Functions: Node 22, Firebase Admin 14.5, Firebase Functions 7.4.
- Explicit firebase-functions/v1 imports retain the existing callable/trigger API; existing v2 workers remain v2.
- Default function region and browser callable region are us-central1. Change both sides together if deliberately relocating.
- processMailQueue binds RESEND_API_KEY. SENDER_EMAIL must name a verified Resend sender in the Functions environment.
- Next.js public configuration: NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID (each with the NEXT_PUBLIC_FIREBASE_ prefix), and NEXT_PUBLIC_SITE_URL.
- Optional privileged homepage read path: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. Values must remain server-only.
- Certificate signed URLs require the function service identity to have signing permissions and access to the target Storage bucket.
- PDF generation uses embedded Cairo fonts and bundled Chromium, 1 GiB memory, concurrency 1, maxInstances 5.

## Verification

Run from the repository:
```sh
npm ci
npm ci --prefix functions
npm run lint
npm run build
npx tsc --noEmit
npm test
npm run test:firebase
```

The Firebase suite uses only demo-ieee-qu. It compiles and invokes actual backend handlers against real local Firestore/Storage emulators, including real PDF rendering. Email delivery uses its emulator adapter. No test sends email to real students.

## Coordinated release — after review

Reserve maintenance and back up data first. Review historical client-written attendance/points. Run preparation in dry-run mode; --apply changes production data and must be separately approved.

```sh
node functions/scripts/prepareRelease.cjs --project ieeeqassim
# After reviewing and approving the preparation:
node functions/scripts/prepareRelease.cjs --project ieeeqassim --apply
```

Do preparation before enabling aggregation triggers so old ledger records are not replayed. Prevent old clients/admins from mutating data during preparation. The script uses Application Default Credentials; it does not reuse or extract Firebase CLI login tokens.

Configure RESEND_API_KEY using Firebase Secret Manager; do not paste secrets into source or logs. Set SENDER_EMAIL in the Functions environment, then:

```sh
npx firebase deploy --project ieeeqassim --only firestore:rules,firestore:indexes,storage
npx firebase deploy --project ieeeqassim --only functions
npx firebase functions:list --project ieeeqassim
```

Publish the matching frontend after rules/indexes/preparation/functions are ready. Do not publish only one layer. Run the live pilot and operational checks in the release report before wider launch.

## Operations

- retryMailQueue runs every 5 minutes, wakes due pending mail, and recovers processing jobs stale for 10 minutes.
- onPointTransactionCreated uses a durable aggregatedAt marker within the same transaction as the user total.
- Certificate workers publish Available only while the record is still Generating; retry only Failed certificates and preserve Revoked state.
- Keep certificates private in Storage. Downloads reauthorize the owner or organizer and return a 15-minute signed URL, or an approved external HTTPS URL.
- Monitor failed certificates, pending/stale mail, callable errors and unexpected point adjustments. Managed backups, alert channels and sender verification remain release actions.
