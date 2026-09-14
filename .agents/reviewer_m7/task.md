# Task for Reviewer M7: Comprehensive Milestone Review & Verification

## Identity
- Role: Reviewer (teamwork_preview_reviewer)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/reviewer_m7

## Objective
Perform a thorough, objective, and adversarial review of the entire IEEE Qassim Engineering Community Platform across all milestones:

1. **Milestone 1 (Baseline Audit)**: Verify findings were addressed.
2. **Milestone 2 (E2E Testing Track)**: Inspect `TEST_INFRA.md`, `TEST_READY.md`, and test suite in `tests/`.
3. **Milestone 3 (R1 UI Polish & Localization)**:
   - Check shared Navbar and Footer in `src/app/[locale]/layout.tsx`.
   - Check complete bilingual dictionaries in `src/lib/i18n/dictionaries.ts`.
   - Check engineering profile page in `src/app/[locale]/profile/page.tsx` (ensure it is concise, modular, and ~30KB).
   - Check Cairo and Inter font configurations in `src/app/layout.tsx` and `src/app/[locale]/layout.tsx`.
   - Check CSS logical properties (ps, pe, ms, me, text-start, text-end, border-s, border-e) across routes.
4. **Milestone 4 (R2 Architecture Integrity & Bug Fixes)**:
   - Check `tsconfig.json` paths and compilerOptions.
   - Check `.eslintrc.json`.
   - Check `firestore.rules` (ensure strict security, decrement rules, points protection).
5. **Milestone 5 (R3 End-to-End Core Journey)**:
   - Review `tests/tier4-real-world-scenarios/real_world_scenarios.test.ts` and `tests/browser_audit.mjs`.
   - Verify that the full student journey (Discovery -> Registration -> Check-in -> Points -> Profile -> Certificate) works cohesively.
6. **Milestone 6 (R4 Cloud Functions Report)**:
   - Review `/home/bader/Documents/IEEE QU SITE/CLOUD_FUNCTIONS_REPORT.md` for accuracy, completeness, and architectural validity.
7. **Verification Commands**:
   - Run `npm run build` (must exit 0).
   - Run `npm run lint` (must exit 0).
   - Run `npm test` (must pass 93/93 tests).
   - Run `node tests/browser_audit.mjs` (must pass all 42 checks).

## Mandatory Integrity Warning
DO NOT CHEAT. All verifications must be genuine. Report actual command outputs and findings.

## Output Requirements
Write your detailed report to `/home/bader/Documents/IEEE QU SITE/.agents/reviewer_m7/report.md` and your 5-component handoff to `/home/bader/Documents/IEEE QU SITE/.agents/reviewer_m7/handoff.md`. Send a completion message to the orchestrator when finished.
