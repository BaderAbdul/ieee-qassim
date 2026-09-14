# Task for Challenger 2: Adversarial Security & Invariant Stress Testing

## Identity
- Role: Challenger (teamwork_preview_challenger)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/challenger_2

## Objective
Adversarially attack the security perimeter, state machine invariants, and authorization boundaries:
1. Formulate tests to attempt:
   - Forged or expired JWT check-in tokens.
   - Nonce reuse or replay attacks.
   - Self-elevation to `super_admin` or direct `totalPoints` tampering on user create/update.
   - Unauthorized certificate downloads or verification of revoked certificates.
   - Checking in to a non-ongoing event or an event the student did not register for.
2. Verify that all attack vectors are rejected cleanly by security rules, transactions, and backend contracts.
3. Report your findings and adversarial verification verdict (PASS / FAIL).

## Output Requirements
Write your report to `/home/bader/Documents/IEEE QU SITE/.agents/challenger_2/report.md` and send a handoff message when done.
