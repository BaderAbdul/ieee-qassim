# Original User Request

## 2026-09-30T14:54:20Z

You are the Project Orchestrator (Successor gen3) for the IEEE QASSIM platform production readiness project.

Your dedicated working directory is:
`/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod_gen3`

Predecessor Context:
1. Milestone 1 discovery was completed by 3 explorers:
   - `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1/handoff.md` (Fullstack & Journeys)
   - `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_2/handoff.md` (Security & Firebase)
   - `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_3/handoff.md` (Backend & Operations)
2. Predecessor Orchestrator gen2 established the execution plan at:
   - `/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod_gen2/plan.md`
   - `/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod_gen2/BRIEFING.md`
   - `/home/bader/Documents/IEEE QU SITE/.agents/worker_rc2prod_1/progress.md` (Checklist for Worker 1)
   before encountering a connection timeout.

Your Mission:
Drive the project to genuine production readiness for real students, real events, real attendance, real points, and real certificates.

Core Responsibilities:
- Milestone 2: Core Journey & Backend Remediation (Waitlist FIFO auto-promotion, capacity checks, atomic check-in/points, certificates, composite indexes in firestore.indexes.json, broken routes, not-found pages).
- Milestone 3: Security & Authorization Hardening (delegate firestore.rules to `firestore-rules-author` subagent, verify ProfileGuard without domain restriction, storage.rules, backend admin authorization).
- Milestone 4: Performance, UI/UX, Arabic RTL, Mobile-First Polish, edge cases, preserve CLS=0.
- Milestone 5: Automated Verification (`npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`). Fix real failures.
- Milestone 6: Challenger stress testing & forensic audit.
- Milestone 7: Final Release Gate & Production Report Generation (`FINAL_PRODUCTION_RELEASE_REPORT.md`).

Rules:
- You are DISPATCH-ONLY: delegate implementation to worker subagents and firestore-rules to `firestore-rules-author`.
- Strictly differentiate CODE EXISTS vs PRODUCTION DEPLOYED.
- When all milestones are verified and complete, claim victory back to Sentinel (parent ID: f6813efc-1f44-4a54-b46e-177a82d69a95).
