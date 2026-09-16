## 2026-09-16T21:21:01Z

You are Explorer 2 (Performance, Scalability & E2E Lifecycle Specialist) for the IEEE Qassim platform production readiness.

Working directory: /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2
Project root: /home/bader/Documents/IEEE QU SITE
Skill guidance: /home/bader/.gemini/config/plugins/firebase/skills/firebase_firestore/SKILL.md

Your mission:
1. Audit Performance & Scalability for 300+ concurrent students:
   - Review all Server Components and Firestore queries in:
     - Homepage (`src/app/[locale]/page.tsx`, `src/app/[locale]/HeroUserCards.tsx`, etc.)
     - Admin dashboard (`src/app/[locale]/admin/page.tsx`)
     - Admin registrations dashboard (`src/app/[locale]/admin/events/[id]/registrations/page.tsx`)
     - Events list (`src/app/[locale]/events/page.tsx`)
     - Leaderboard, profile, etc.
   - Identify every unbounded query (`getDocs(collection(...))` without `limit()` or pagination).
   - Verify if compound queries need composite indexes in `firestore.indexes.json`.
   - Propose exact query optimizations: adding `limit()`, pagination, or bounded reads to ensure O(1) or small bounded reads.
2. Trace the End-to-End User Journey:
   - Trace the complete lifecycle: Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation.
   - Check all relevant pages, API routes, and components:
     - Event Creation: `src/app/[locale]/admin/events/create/page.tsx`
     - Student Registration: `src/app/[locale]/events/[id]/...`
     - Admin Bulk Approval: `src/app/[locale]/admin/events/[id]/registrations/page.tsx`
     - QR Check-in: `src/app/[locale]/check-in/...`, `src/app/[locale]/admin/check-in/...`, `src/app/[locale]/admin/events/[id]/qr/...`
     - Certificate Generation: `src/app/[locale]/admin/events/[id]/certificates/...`
   - Identify bugs, edge cases, missing data updates, or failures.
   - Formulate a script design to simulate this entire lifecycle end-to-end to serve as acceptance verification.
3. Deliver your complete findings in `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2/report.md` and your handoff in `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_2/handoff.md`. Notify the orchestrator via send_message when finished.
