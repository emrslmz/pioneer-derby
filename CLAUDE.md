# Pioneer Derby — Front-end Case Study

Interactive horse racing game built for a Front-end Developer assessment.
The original brief is the case study PDF (kept out of the repository).

- Requirements & traceability IDs: @docs/REQUIREMENTS.md
- Architecture, theme, folder structure: @docs/ARCHITECTURE.md
- Phased plan with checkboxes (source of truth for progress): @docs/PLAN.md
- Architecture Decision Records: `docs/adr/` (index in docs/adr/README.md)

## Working agreement

- The user speaks Turkish → reply in Turkish. Code, identifiers, comments, commits and README are in English.
- Work **phase by phase** (docs/PLAN.md). Do not start the next phase until the user asks.
- At the end of a phase: run `npm run verify`, tick the checkboxes in docs/PLAN.md, summarize, open a PR.
- **Git flow** (ADR 0004): GitHub Flow, no `development` branch. Never commit to `main`. One short-lived branch per
  phase from up-to-date `main` (`<type>/phase-<n>-<topic>`), several small commits, then a PR using
  `.github/pull_request_template.md`. Merge with _rebase and merge_ after CI is green; delete the branch.
  No stacked PRs: start the next branch only after the previous PR is merged.
- When a spec ambiguity appears, check "Ambiguities & decisions" in REQUIREMENTS.md; add new decisions there.

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # type-check + production build
npm run lint           # ESLint (--fix)
npm run format         # Prettier
npm run type-check     # vue-tsc
npm run test:unit      # Vitest
npm run test:e2e       # Playwright E2E
npm run test:visual    # Playwright screenshot tests
npm run test:coverage  # Vitest with coverage thresholds
npm run simulate       # fairness Monte Carlo (condition → win rate)
npm run report:traceability  # requirement ID → test table (docs/TRACEABILITY.md)
npm run verify         # lint + type-check + unit tests (must be green before commit)
```

## Non-negotiable game rules (from the PDF)

- 20 horses, each with a unique color; condition score 1–100.
- 6 rounds: 1200, 1400, 1600, 1800, 2000, 2200 m.
- Each round: 10 distinct random horses out of 20.
- "Generate Program" creates the schedule; "Start/Pause" runs rounds **one at a time**.
- Results appear in the Results panel **sequentially**, only after each round finishes.
- Horses must visibly move.
  All of these live as constants in `src/domain/constants.ts` — never hard-code the numbers elsewhere.

## Code conventions

- Vue 3 `<script setup lang="ts">`, Composition API only. TypeScript `strict`, no `any`.
- `src/domain/` is pure TS: no imports from Vue, Pinia or the DOM. All randomness goes through the seeded RNG in `domain/random.ts` (never `Math.random()` directly).
- Pinia **setup stores**, one per concern (`horses`, `schedule`, `race`). Components read via `storeToRefs`, mutate only through store actions.
- Components: PascalCase, one per file, props/emits typed with `defineProps<>()` / `defineEmits<>()`. Base UI components in `src/shared/ui` are prefixed `Base`.
- Feature components stay inside `src/features/<feature>/`. Cross-feature reuse moves to `src/shared/`.
- Styling: scoped SCSS + CSS variables from `src/styles/tokens.scss`. No hard-coded colors outside tokens (horse colors excepted, they live in domain constants). Mobile-first media queries.
- Animation: `transform` only (no `left`/`width` animations), driven by `requestAnimationFrame`; respect `prefers-reduced-motion`.
- Accessibility: semantic tables for lists, buttons with clear labels, `aria-live="polite"` on results.
- Tests mirror `src/` under `tests/unit/`. Use `data-testid` for E2E selectors. Seed (`?seed=`) for deterministic E2E/visual tests.
- **Test titles start with the requirement ID** they prove (`[C5] …`, `[R4] …`, `[X4] …`) — the traceability report depends on it. Game rules also get fast-check property tests (`*.property.spec.ts`).
- **i18n**: no hard-coded user-facing strings in components; add keys to `src/i18n/locales/en.json` and `tr.json` together. Domain returns codes (e.g. reason codes), never display text.
- **Analytics**: user actions are tracked only via the typed `AnalyticsClient` (`src/shared/analytics`), never `console.log` in features.
- **Animation state**: per-frame horse positions are derived from the race clock + `positionAt`, not written into Pinia every frame.
- **Boundaries** (enforced by ESLint): `domain` imports nothing app-specific; `features` don't import each other — shared code goes to `shared/`.
- New significant decision → write an ADR (`/adr <title>`).
- Commits: small Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`, `ci:`), several per phase. Pushing the phase branch and opening its PR is part of finishing a phase; never push to `main`, never force-push.
