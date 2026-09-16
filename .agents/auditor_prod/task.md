# Task: Forensic Integrity Auditor - Production Readiness Audit

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/auditor_prod`

## Mission
Conduct a rigorous, independent forensic integrity audit of the entire codebase and test implementations:
1. Anti-Cheating & Integrity Verifications:
   - Verify that test assertions are NOT hardcoded, faked, or mocked to artificially pass without testing real application logic.
   - Verify that `firestore.rules` actually enforces security constraints and does not contain dummy bypasses or hidden loopholes.
   - Verify that `getCountFromServer` and bounded queries (`limit()`) genuinely restrict database reads in runtime code.
   - Verify that deterministic attendance log ID `${eventId}_${userId}` actually connects `admin/events/[id]/qr/page.tsx` and `functions/src/issueCertificates.ts`.
   - Verify that `loading.tsx` and `error.tsx` components are genuine Next.js App Router streaming fallbacks and error boundaries, not empty stubs.
2. Build & Test Audit:
   - Run `npm test` and all individual verification scripts.
   - Run production compilation `npx next build --webpack`.
3. Deliver a binary verdict: CLEAN or INTEGRITY VIOLATION with full evidentiary rationale in `/home/bader/Documents/IEEE QU SITE/.agents/auditor_prod/handoff.md`.
