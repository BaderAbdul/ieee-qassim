# Task: Challenger 2 - Adversarial E2E Lifecycle & UX Fault Injection

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_2`

## Mission
Empirically and adversarially stress-test the End-to-End User Journey and UX fault tolerance:
1. E2E Lifecycle Stress Testing:
   - Test race conditions in event registration, bulk approval, QR check-in, and certificate issuance.
   - Verify deterministic attendance log ID `${eventId}_${userId}` integrity under edge cases (duplicate scans, unapproved users, revoked registrations).
   - Test certificate issuance under boundary conditions (0 attendees, 1 attendee, 300 attendees).
2. UX Resilience & Fault Injection:
   - Test route fallbacks (`loading.tsx`) and error boundaries (`error.tsx`) under thrown errors or delayed data.
   - Verify mobile responsiveness and that no unhandled exceptions crash the UI.
3. Deliver handoff in `/home/bader/Documents/IEEE QU SITE/.agents/challenger_prod_2/handoff.md`.
