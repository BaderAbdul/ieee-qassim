# Task: Reviewer 1 - Security & Performance Verification

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/reviewer_prod_1`

## Mission
Independently review, test, and verify the changes implemented by the Worker for:
1. Security & Data Integrity (`firestore.rules`, `/users/{userId}` role protection, `/registrations` write whitelisting, `/admin/*` route guard).
2. Performance & Scalability (`getCountFromServer` in `admin/page.tsx`, parallelized `Promise.all` in registrations/certificates desks, `limit()` bounded reads, and `firestore.indexes.json`).

## Requirements
- Execute test suites: `npm test`, `node --test --experimental-strip-types tests/verify_security_rules.test.ts`, `node --test --experimental-strip-types tests/verify_performance_bounds.test.ts`.
- Verify `firestore.rules` against `firebase-security-rules-auditor` checklist.
- Check code changes and verify no regressions.
- Deliver handoff in `/home/bader/Documents/IEEE QU SITE/.agents/reviewer_prod_1/handoff.md`.
