---
description: Execute a phase from docs/PLAN.md (e.g. /phase 1)
argument-hint: <phase-number>
---

Execute **Phase $ARGUMENTS** from @docs/PLAN.md.

1. Re-read the phase's checklist, the related requirement IDs in @docs/REQUIREMENTS.md and the relevant sections of @docs/ARCHITECTURE.md.
2. Make sure previous phases are complete; if not, stop and tell the user.
3. Implement every unchecked item of this phase only — do not start the next phase.
4. Write/update tests for what you built.
5. Run `npm run verify` (and `npm run test:e2e` if the phase touches user flows). Fix failures.
6. Tick the completed checkboxes in docs/PLAN.md.
7. Reply in Turkish with: what was done, files touched, test results, any new decisions (also record them in REQUIREMENTS.md → "Ambiguities & decisions"), and a suggested Conventional Commit message. Do not commit unless the user asks.
