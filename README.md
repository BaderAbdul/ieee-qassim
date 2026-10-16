# IEEE Qassim community platform

Arabic-first student event platform with English support. Built with Next.js 16.3.8, React 19, next-intl, Tailwind 4, Firebase Authentication/Firestore on Spark, Vercel server endpoints, and Cloudinary media storage. Historical Firebase Functions sources remain for reference and emulator regression tests; they are not needed for the migrated core flows.

Students discover events, register, attend, earn points and receive certificates. Organizers manage events, approvals, attendance, feedback and members.

## Local development

```sh
npm ci
npm ci --prefix functions
npm run dev
```

Configure Firebase in `.env.local` in the repository root. The `NEXT_PUBLIC_FIREBASE_*` settings configure the browser. The authenticated server endpoints (including admin events, registration, attendance and ratings) also require these private settings when connecting to your existing Firebase project:

```dotenv
FIREBASE_PROJECT_ID="project_id from the service-account JSON"
FIREBASE_CLIENT_EMAIL="client_email from the service-account JSON"
FIREBASE_PRIVATE_KEY="private_key from the service-account JSON, with escaped newlines"
```

Use a service account from the same project as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Obtain it from Firebase Console → Project settings → Service accounts → Firebase Admin SDK. Keep these values server-only: never prefix them with `NEXT_PUBLIC_`, commit the JSON key, or share it in chat. Restart the development server after changing `.env.local`. Public Firebase configuration alone cannot authenticate the server endpoints; missing server credentials produce `Server configuration is unavailable.`

For isolated local development without private credentials, enable the demo Firebase emulators instead. All settings below must be configured together; do not combine a live project ID with emulator settings:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=demo-build-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-ieee-qu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ieee-qu
NEXT_PUBLIC_FIREBASE_APP_ID=demo-build-app
NEXT_PUBLIC_FIREBASE_EMULATORS=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

With Java 21 installed, start `npx firebase emulators:start --project demo-ieee-qu --only auth,firestore` in one terminal. In another, run `node --env-file=.env.local scripts/seed-demo.mjs` followed by `npm run dev`. Open `/ar/dev-signin` to sign in with a seeded demo account. This demo sign-in page is available only in development with an explicitly configured demo project.

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
