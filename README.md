# IEEE Qassim community platform

Arabic-first student event platform with English support. Built with Next.js 16.3.8, React 19, next-intl, Tailwind 4, Firebase Authentication/Firestore on Spark, Vercel server endpoints, and Cloudinary media storage. Historical Firebase Functions sources remain for reference and emulator regression tests; they are not needed for the migrated core flows.

Students discover events, register, attend, earn points and receive certificates. Organizers manage events, approvals, attendance, feedback and members.

## Local development

```sh
npm ci
npm ci --prefix functions
npm run dev
```

Configure the Firebase public values listed in CLOUD_FUNCTIONS_REPORT.md in .env.local. Never commit secret keys. The hosted privileged homepage read path optionally uses private Admin credentials.

## Verification

```sh
npm run lint
npm run build
npx tsc --noEmit
npm test
npm run test:firebase
npm run test:spark
```

npm test runs domain simulations and source contracts. test:firebase exercises actual rules, backend handlers and PDF rendering on a demo project; it never connects test writes to production. Java 21 and Node 24 are used for local testing. Deployed Functions target Node 22.

## Source map

- src/app/[locale]: public, student and organizer routes
- src/context/AuthContext.tsx: Google sign-in and private user profile subscription
- src/i18n and messages: Arabic/English routing and translations
- functions/src: authoritative registration, attendance, points, certificates and email
- src/app/api and src/lib/server: Spark-compatible Vercel registration, attendance, points, member projection and certificates
- firestore.rules / storage.rules: data access boundaries
- firestore.indexes.json: query indexes
- tests/firebase: real local integration/security tests
- functions/scripts/prepareRelease.cjs: read-only-by-default existing-data preparation

## Release status

The owner has chosen to keep Firebase on Spark. Core operations now use authenticated same-origin Vercel endpoints. Event/avatar images use server-validated Cloudinary uploads, and generated PDFs use authenticated Cloudinary assets with short-lived downloads. External certificate links remain supported. Certificate generation is driven one-at-a-time by the open organizer certificate page, not a Firebase trigger. Transactional notifications and bounded Resend retries are opt-in and run while the organizer dashboard is open; scheduled event reminders are still not ported. Read SPARK_RELEASE_REPORT.md before merging or deploying; the Cloud Functions report below is historical.

Read SPARK_RELEASE_REPORT.md before deployment. It records the current Vercel candidate, required preparation/preview checks and remaining mail/reminder limitations. FINAL_PRODUCTION_RELEASE_REPORT.md and CLOUD_FUNCTIONS_REPORT.md describe the earlier architecture; their Firebase Functions deployment steps do not apply to the Spark candidate. Passing local tests does not confirm a live deployment.
