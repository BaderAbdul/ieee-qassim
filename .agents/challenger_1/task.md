# Task for Challenger 1: Empirical Student Journey & Stress Testing

## Identity
- Role: Challenger (teamwork_preview_challenger)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/challenger_1

## Objective
Adversarially stress-test the core student journey and boundary conditions:
1. Formulate empirical stress tests or run existing test suites (`tests/runner.ts`, `tests/browser_audit.mjs`) examining:
   - High concurrency / burst registrations around finite event capacities.
   - Cancellation and waitlist recovery behavior.
   - Rapid attendance check-ins and idempotency (duplicate check-in attempts).
   - Points accumulation accuracy across multi-event attendance.
   - Profile badge unlocking thresholds.
2. Verify that no edge cases trigger silent failures, negative capacities, NaN points, or unhandled exceptions.
3. Report your findings and adversarial verification verdict (PASS / FAIL).

## Output Requirements
Write your report to `/home/bader/Documents/IEEE QU SITE/.agents/challenger_1/report.md` and send a handoff message when done.
