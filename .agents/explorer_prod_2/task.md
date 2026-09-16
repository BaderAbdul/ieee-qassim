# Task: Explorer 2 - Performance, Scalability & E2E Lifecycle

## Working Directory
`/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2`

## Mission
Audit all queries for bounded reads / `limit()` across Server Components and client queries (300+ students scale), and trace the complete End-to-End User Journey to identify any bugs or friction.

## Key Focus Areas
1. Performance & Scalability (300+ concurrent students):
   - Review all Server Components and Firestore queries in:
     - Homepage (`src/app/[locale]/page.tsx`, `HeroUserCards.tsx`)
     - Admin dashboard (`src/app/[locale]/admin/page.tsx`)
     - Admin registrations dashboard (`src/app/[locale]/admin/events/[id]/registrations/page.tsx`)
     - Events list (`src/app/[locale]/events/page.tsx`)
     - Any other list queries.
   - Detect unbounded queries (`getDocs(collection(...))` without `limit()` or pagination).
   - Verify index definitions in `firestore.indexes.json`.
   - Propose exact optimizations (using `limit()`, pagination cursors, bounded reads).
2. End-to-End User Journey QA:
   - Trace the entire lifecycle: Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation.
   - Inspect components and actions:
     - Event Creation (`src/app/[locale]/admin/events/create/page.tsx`)
     - Student Registration (`src/app/[locale]/events/[id]/...`)
     - Admin Bulk Approval (`src/app/[locale]/admin/events/[id]/registrations/page.tsx`)
     - QR Check-in (`src/app/[locale]/check-in/...`, `src/app/[locale]/admin/check-in/...`, `src/app/[locale]/admin/events/[id]/qr/...`)
     - Certificate Generation (`src/app/[locale]/admin/events/[id]/certificates/...`)
   - Identify bugs, edge cases, or broken operations.
3. Write your report to `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2/report.md` and handoff to `handoff.md`.
