# Task for Explorer 2: Architecture, Firebase, Firestore Rules & Cloud Functions Audit

## Identity
- Role: Explorer (teamwork_preview_explorer)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/explorer_m1_2

## Objective
Audit the architectural integrity and data flow of the IEEE Qassim Engineering Community Platform:
1. Firebase Client Configuration (`src/lib/firebase` or similar) and authentication setup.
2. Firestore database schema & collections: `users`, `events`, `registrations`, `attendance`, `points`, `certificates`, etc.
3. Security Rules Audit (`firestore.rules` and `storage.rules`). Check for rule mismatches, permission-denied vulnerabilities, or unintended open access.
4. Cloud Functions Audit (`functions/` directory): Analyze all exported functions (triggers, callable functions, HTTP endpoints).
5. Core Student Journey Logic:
   - Discover -> Register: How is registration saved? Are duplicates prevented? Is capacity checked?
   - Attend: How is attendance validated? QR code scan, secret code, admin check-in?
   - Earn Points: How are points incremented? In client, transaction, or Cloud Function? Is it idempotent?
   - Build Activity: What collection logs activity? How does "My Activity" retrieve it?
   - Receive Certificate: How are certificates issued, rendered, or downloaded? Is there verification?
6. Cloud Functions Dependency Identification:
   - Identify which features strictly require deployed Firebase Cloud Functions vs what can work client-side with Firestore transactions/rules.
   - Note any broken flows or missing logic.

## Skills & References
- Skill: /home/bader/.gemini/config/plugins/firebase/skills/firebase_firestore/SKILL.md
- Skill: /home/bader/.gemini/config/plugins/firebase/skills/firebase_security_rules_auditor/SKILL.md
- Skill: /home/bader/.gemini/config/plugins/firebase/skills/firebase_basics/SKILL.md

## Output Requirements
Write your detailed report to `/home/bader/Documents/IEEE QU SITE/.agents/explorer_m1_2/report.md` and send a handoff message when complete.
