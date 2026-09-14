# Task for Challenger M7: Adversarial Stress Testing & Boundary Verification

## Identity
- Role: Challenger (teamwork_preview_challenger)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/challenger_m7

## Objective
Empirically stress-test the IEEE Qassim Engineering Community Platform, the core student journey, and the E2E test suites with adversarial boundary cases:

1. **Adversarial Stress Testing**:
   - Inspect and stress-test the test engine and edge cases (`tests/engine/platform.ts`, `tests/tier2-boundary-corner/`, `tests/tier3-cross-feature/`, `tests/tier4-real-world-scenarios/`).
   - Test race condition resilience in event registration capacity limits.
   - Test invalid/expired/tampered dynamic QR tokens in attendance check-in.
   - Test unauthorized points manipulation and ensure `firestore.rules` blocks client writes.
   - Test duplicate check-ins, registration cancellation when already cancelled, and out-of-order state transitions.
2. **Empirical Execution**:
   - Run `npm test` across all 4 tiers and inspect outputs.
   - Run `node tests/browser_audit.mjs` and inspect viewport and RTL/LTR consistency.
   - Execute targeted adversarial test checks to verify that errors are gracefully rejected rather than crashing the system.
3. **Audit Artifact Verification**:
   - Check that `CLOUD_FUNCTIONS_REPORT.md` correctly models the threat surface and security requirements.
   - Verify that no duplicate backend/database architectures exist.
   - Verify that Teams, Projects, and Challenges were NOT added.

## Mandatory Integrity Warning
DO NOT CHEAT. All stress tests and verifications must be genuine.

## Output Requirements
Write your detailed report to `/home/bader/Documents/IEEE QU SITE/.agents/challenger_m7/report.md` and your 5-component handoff to `/home/bader/Documents/IEEE QU SITE/.agents/challenger_m7/handoff.md`. Send a completion message to the orchestrator when finished.
