## 2026-09-16T21:43:56Z
You are Challenger 1 for the IEEE Qassim platform production readiness.

Working directory: /home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_1
Project root: /home/bader/Documents/IEEE QU SITE
Task specification: /home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_1/task.md
Worker handoff: /home/bader/Documents/IEEE QU SITE/.agents/worker_prod/handoff.md

Your mission:
Empirically and adversarially challenge the security rules and concurrency performance of the IEEE Qassim platform:
1. Security Red-Teaming:
   - Attempt to bypass `/users/{userId}` rules to grant `super_admin` or alter unauthorized fields.
   - Attempt to forge a registration with `attended: true` or unapproved status.
   - Attempt unauthenticated reads on `/registrations`.
   - Attempt to tamper with `registeredCount` outside valid states.
2. Performance & Scalability Stress Test (300+ Students):
   - Benchmark and verify that queries on homepage and admin dashboard remain strictly bounded ($O(1)$) and execute with minimal document reads.
   - Test Firestore index compliance.
3. Write an adversarial test harness and execute it.
4. Deliver your findings and verdict in `/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_1/handoff.md` and notify the orchestrator via send_message.
