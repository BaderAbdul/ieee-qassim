# Task for Forensic Auditor M7: Integrity Verification & Forensic Audit

## Identity
- Role: Forensic Auditor (teamwork_preview_auditor)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/auditor_m7

## Objective
Perform a strict, comprehensive forensic integrity audit of the entire codebase and test suite for the IEEE Qassim Engineering Community Platform:

1. **Integrity Forensics Checks**:
   - Check for hardcoded test results, expected return values, or dummy mocks in source code.
   - Check for facade implementations that bypass real business logic.
   - Check for test evasion, bypassed assertions, or tautological tests (e.g., `expect(true).toBe(true)`).
   - Check for unauthorized external library inclusions or duplicate backend systems.
   - Check that Teams, Projects, and Challenges were NOT added.
   - Check that existing Firebase, Auth, Firestore, and certificate architectures were genuinely preserved.
2. **Static & Dynamic Integrity Analysis**:
   - Inspect `src/`, `functions/src/`, `tests/`, `firestore.rules`, and `storage.rules`.
   - Run verification commands: `npm run build`, `npm run lint`, `npm test`, `node tests/browser_audit.mjs`.
   - Validate that all 93 tests genuinely execute real logic and assertion checks against the platform contracts.
3. **Verdict Determination**:
   - Issue a definitive binary verdict: CLEAN or INTEGRITY VIOLATION.
   - If clean, provide exhaustive supporting evidence and verification steps.
   - If violation, provide file paths, line numbers, and exact code evidence.

## Mandatory Warning
DO NOT COMPROMISE. The Forensic Audit is a strict binary veto. Deliver an objective, unforgiving assessment.

## Output Requirements
Write your detailed forensic report to `/home/bader/Documents/IEEE QU SITE/.agents/auditor_m7/report.md` and your 5-component handoff to `/home/bader/Documents/IEEE QU SITE/.agents/auditor_m7/handoff.md`. Send a completion message to the orchestrator when finished.
