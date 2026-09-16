# Task: Explorer 1 - Security & Data Integrity

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1`

## Mission
Perform comprehensive security audit of `firestore.rules` and Next.js admin route protection (`/admin/*`), and formulate an exact hardening strategy.

## Key Focus Areas
1. Firestore Security Rules (`firestore.rules`):
   - Ownership checks on `/users/{userId}`: Block non-owners and unauthenticated users. Prevent privilege escalation (`role` or `isAdmin` self-assignment).
   - Events collection permissions: Restrict write access to admins/organizers.
   - Registrations collection: Enforce that users can only register themselves and cannot tamper with attendance or approval status.
   - Certificates collection: Only admins/organizers can issue certificates; users can only read their own.
   - Storage rules (`storage.rules`).
   - Type validation and resource limits (prevent DoS/storage exhaustion).
2. Admin Route Protection (`/admin/*`):
   - Inspect Next.js middleware / layout / proxy / server auth checks.
   - Ensure unauthorized users cannot access any `/admin/*` pages or API routes and are redirected/blocked.
3. Write your report to `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md` and handoff to `handoff.md`.
