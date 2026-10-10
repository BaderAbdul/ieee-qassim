# IEEE Qassim community platform

Arabic-first student event platform with English support. Built with Next.js 16.3.8, React 19, next-intl, Tailwind 4, and Firebase Authentication/Firestore/Storage/Cloud Functions.

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
```

npm test runs domain simulations and source contracts. test:firebase exercises actual rules, backend handlers and PDF rendering on a demo project; it never connects test writes to production. Java 21 and Node 24 are used for local testing. Deployed Functions target Node 22.

## Source map

- src/app/[locale]: public, student and organizer routes
- src/context/AuthContext.tsx: Google sign-in and private user profile subscription
- src/i18n and messages: Arabic/English routing and translations
- functions/src: authoritative registration, attendance, points, certificates and email
- firestore.rules / storage.rules: data access boundaries
- firestore.indexes.json: query indexes
- tests/firebase: real local integration/security tests
- functions/scripts/prepareRelease.cjs: read-only-by-default existing-data preparation

## Release status

The owner has chosen to keep Firebase on Spark. The live website is hosted on Vercel, and Cloudinary already handles event cover uploads. Migration of protected operations from Firebase Functions to authenticated Vercel endpoints, plus avatar/private certificate storage migration to Cloudinary, is **not implemented yet**. Preserve external certificate link support during that migration. Do not merge this engineering checkpoint into the production branch as a completed Spark-compatible release.

Read FINAL_PRODUCTION_RELEASE_REPORT.md before deployment. The local candidate is verified, but a read-only production check found no deployed functions. Rules, indexes, existing-data preparation, functions and frontend must be released together. The historical TEST_READY.md claim covers tests, not production deployment.
