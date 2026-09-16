# Task: Challenger 1 - Adversarial Security & Concurrency Stress Testing

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_1`

## Mission
Empirically and adversarially challenge the security rules and concurrency performance of the IEEE Qassim platform:
1. Security Attacks:
   - Attempt privilege escalation on `/users/{userId}`: Try updating `role` to `super_admin` or `admin`.
   - Attempt unauthorized registration creation: Try creating registration with `attended: true`, `status: 'approved'`, or invalid keys.
   - Attempt unauthenticated or cross-user reads on `/registrations`.
   - Attempt unauthorized event counter increments.
2. Performance & Concurrency (300+ Students):
   - Verify that queries on homepage and admin dashboard remain bounded ($O(1)$) and do not fetch full collections.
   - Simulate 300 concurrent requests or verify algorithmic bounds.
3. Write test harness and report findings in `/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_1/handoff.md`.
