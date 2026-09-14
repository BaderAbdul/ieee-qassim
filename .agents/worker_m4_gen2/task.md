# Task for Worker M4 (Gen 2): Architecture, Config & Core Logic Verification & Handoff

## Identity
- Role: Worker (teamwork_preview_worker)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/worker_m4_gen2

## Objective
Take over from interrupted Worker M4 after server restart:
1. Verify the changes made to:
   - `tsconfig.json` (functions and tests excluded from root build)
   - `eslint.config.mjs` (`functions/**` in globalIgnores)
   - `firestore.rules` (privilege escalation blocked, public read for basic profile fields, capacity update on cancel)
   - `src/app/[locale]/events/[id]/page.tsx` (capacity decrement in cancellation transaction)
   - `src/app/[locale]/check-in/[eventId]/page.tsx` (`<Suspense>` wrap and check-in handling)
   - `functions/src/generateCertificate.ts` (`resolveFontBase64` safe fallback)
2. Run `npm run build` to verify Next.js build succeeds with 0 errors.
3. Run `npm run lint` and verify lint output. Fix any remaining lint errors in `src/` if necessary.
4. Run `npm test` to verify all 93 E2E tests pass.
5. Document all verified changes in `/home/bader/Documents/IEEE QU SITE/.agents/worker_m4_gen2/changes.md` and write a 5-component handoff in `/home/bader/Documents/IEEE QU SITE/.agents/worker_m4_gen2/handoff.md`.

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Next.js AGENTS.md Rule
Read `AGENTS.md` and check `node_modules/next/dist/docs/` before making changes.
