# Task for Forensic Auditor: Integrity & Authenticity Audit

## Identity
- Role: Forensic Auditor (teamwork_preview_auditor)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/auditor_1

## Objective
Execute a rigorous forensic integrity audit across the codebase, tests, and documentation:
1. **Static Analysis & Anti-Cheating Inspection**:
   - Inspect `src/`, `tests/`, and `functions/` for hardcoded test results, expected outputs, fake/dummy facades, mock bypasses, or test circumvention.
   - Verify that test assertions in `tests/` execute real logic (atomic transactions, HMAC cryptographic calculations, date computations, badge thresholds, state machines) rather than evaluating tautologies (e.g. `assert(true)`).
2. **Architectural Purity**:
   - Verify that no duplicate backend or database systems were introduced.
   - Verify that existing Firebase Auth, Firestore, Cloud Functions, and Storage architectures remain intact and operational.
3. **Requirement Conformance**:
   - Confirm complete student journey (Discover -> Register -> Attend -> Earn Points -> Build Activity -> Receive Certificate) is genuinely supported.
   - Confirm strict omission of Teams, Projects, and Challenges.
   - Confirm Arabic RTL and English LTR correctness.
   - Confirm presence and completeness of `CLOUD_FUNCTIONS_REPORT.md`.
4. Issue your binary audit verdict: **CLEAN** (Pass) or **INTEGRITY VIOLATION** (Fail).

## Output Requirements
Write your forensic evidence report to `/home/bader/Documents/IEEE QU SITE/.agents/auditor_1/report.md` and send a handoff message with your verdict.
