# Firebase Security Rules Auditor Skill (Local Dump)
Source: /home/bader/.gemini/config/plugins/firebase/skills/firebase_security_rules_auditor/SKILL.md

Key audit items:
1. The Update Bypass (create vs update rules divergence, mutating immutable fields).
2. Authority Source (untrusted request.resource.data for sensitive roles).
3. Storage Abuse & DoS (missing bounds).
4. Type Safety & validation.
5. Field-Level vs Identity-Level Security (missing ownership checks when diff().hasOnly() is used).
