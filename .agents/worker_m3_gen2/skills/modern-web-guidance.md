# Modern Web Guidance (Local Snapshot)
Source: /home/bader/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md

Core Methodology:
1. Prefer modern web platform APIs and standards (CSS logical properties, modern container queries, CSS grid/flexbox, semantic HTML5, accessible ARIA roles).
2. For RTL/LTR, use logical properties: `ms-` (margin-inline-start), `me-` (margin-inline-end), `ps-` (padding-inline-start), `pe-` (padding-inline-end), `start-`, `end-`, `text-start`, `text-end`.
3. Avoid hardcoded physical directionals (left/right, ml/mr, pl/pr) unless intentional absolute positioning is invariant to reading direction.
4. Ensure responsive layouts adapt gracefully across viewports without overflow or clipping.
5. Use modern Next.js font optimization (`next/font/google`).
