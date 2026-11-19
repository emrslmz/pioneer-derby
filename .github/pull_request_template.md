## Summary

<!-- What does this PR do and why? Which phase of docs/PLAN.md? -->

## Requirements covered

<!-- IDs from docs/REQUIREMENTS.md, e.g. R3, C5, X2 -->

-

## Changes

-

## How to verify

```bash
npm ci
npm run verify
```

## Checklist

- [ ] `npm run verify` is green (lint + type-check + unit tests)
- [ ] Test titles start with requirement IDs (`[C5] …`)
- [ ] No hard-coded user-facing strings (en.json + tr.json updated together)
- [ ] Game numbers only from `src/domain/constants.ts`
- [ ] docs/PLAN.md checkboxes ticked; new decisions recorded (REQUIREMENTS.md / ADR)
