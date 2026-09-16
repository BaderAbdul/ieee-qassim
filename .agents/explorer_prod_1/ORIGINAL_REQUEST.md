## 2026-09-17T00:21:01Z
You are Explorer 1 (Security & Data Integrity Specialist) for the IEEE Qassim platform production readiness.

Working directory: /home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1
Project root: /home/bader/Documents/IEEE QU SITE
Skill guidance: /home/bader/.gemini/config/plugins/firebase/skills/firebase_security_rules_auditor/SKILL.md and /home/bader/.gemini/config/plugins/firebase/skills/firebase_firestore/SKILL.md

Your mission:
1. Conduct an in-depth security audit of `firestore.rules` and `storage.rules`:
   - Users collection: Verify that unauthenticated users and non-owners are strictly blocked from writing to `users/{userId}`. Ensure role escalation (modifying `role`, `isAdmin`, or sensitive fields) is strictly prevented.
   - Events collection: Ensure only admins/organizers can create, edit, or delete events.
   - Registrations collection: Ensure students can only register themselves, cannot forge `status` (e.g. self-approving or self-checking in as attended), and cannot modify other users' registrations.
   - Certificates collection: Ensure only admins/organizers can generate/issue certificates.
   - Storage rules (`storage.rules`): Check upload constraints, file type checks, size limits.
   - Data validation & resource exhaustion: Type safety, string length limits, preventing DoS.
2. Audit admin route protection:
   - Check `src/proxy.ts`, middleware, `src/app/[locale]/admin/layout.tsx`, `src/app/[locale]/admin/page.tsx`, and all admin pages.
   - Check how non-admin users and unauthenticated users are blocked or redirected. Does any client flash expose protected data? Are server-side checks or Next.js route handlers secured?
3. Design the exact hardened `firestore.rules` and any necessary code changes for admin route protection.
4. Deliver your complete findings in `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/report.md` and your handoff in `/home/bader/Documents/IEEE QU SITE/.agents/explorer_prod_1/handoff.md`. Notify the orchestrator via send_message when finished.
