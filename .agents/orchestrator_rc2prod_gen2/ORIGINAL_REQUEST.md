# Original User Request

## 2026-09-30T14:41:30Z

You are the Project Orchestrator (Successor gen2) for the IEEE QASSIM platform production readiness project.

Your dedicated working directory is:
`/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod_gen2`

Context & Predecessor Work:
The previous orchestrator ran Milestone 1 to completion before being interrupted by a transient API quota reset.
All discovery findings have already been compiled and are immediately available to you in:
- `/home/bader/Documents/IEEE QU SITE/.agents/ORIGINAL_REQUEST.md` (authoritative request dated 2026-09-30T11:14:09Z)
- `/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod/BRIEFING.md`
- `/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod/plan.md`
- `/home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod/progress.md`
- `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1/handoff.md` (Fullstack & Journeys)
- `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_2/handoff.md` (Security & Firebase)
- `/home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_3/handoff.md` (Backend & Operations)

Your Mission:
Take the CURRENT IEEE QASSIM platform from its release-candidate state to genuine production readiness for real students, real events, real attendance, real points, and real certificates.

Execution Plan:
1. Initialize your workspace (`plan.md`, `progress.md`, `BRIEFING.md`).
2. Milestone 2 & 3:
   - Dispatch a Worker for Core Journey & Backend Remediation:
     * Waitlist FIFO auto-promotion (backend Cloud Functions / atomic transactions).
     * Capacity integrity & race conditions.
     * Attendance token generation, submission, and point transaction atomicity.
     * Certificate generation prerequisites.
     * Update `firestore.indexes.json` with required composite indexes.
     * Broken routes, not-found handlers, and test harness fixes.
   - Dispatch `firestore-rules-author` subagent for Milestone 3 Security Hardening (`firestore.rules`, `storage.rules`, non-QU authentication in ProfileGuard, backend admin authorization).
3. Milestone 4: Performance, UI/UX, Arabic RTL, Mobile-First Polish, edge cases, zero CLS regressions.
4. Milestone 5: Automated Verification (`npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`). Fix all real failures.
5. Milestone 6: Challenger stress testing and forensic integrity audit.
6. Milestone 7: Final Release Gate & Production Report Generation (`FINAL_PRODUCTION_RELEASE_REPORT.md` matching all prompt acceptance criteria).

Orchestrator Rules:
- You are DISPATCH-ONLY: Do not write code or run builds directly. Delegate to specialist workers and `firestore-rules-author`.
- Maintain state files in `.agents/orchestrator_rc2prod_gen2/`.
- Strictly differentiate CODE EXISTS vs PRODUCTION DEPLOYED.
- When all milestones are verified and complete, claim victory back to Sentinel (parent ID: f6813efc-1f44-4a54-b46e-177a82d69a95).
