# Pioneer Derby 🏇

[![CI](https://github.com/emrslmz/pioneer-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/emrslmz/pioneer-derby/actions/workflows/ci.yml)

An interactive horse racing game built with **Vue 3, TypeScript and Pinia** for the Insider One Front-end Developer case study.
Twenty horses — named after computing pioneers — race across six rounds from 1200 m to 2200 m.

> The MVP is complete: every requirement of the brief works and is tested. Extra product, evidence and
> delivery layers follow phase by phase; see the [implementation plan](docs/PLAN.md).

## Highlights (planned)

- Deterministic, seeded race engine — every race can be replayed and shared
- Fully responsive (mobile, tablet, desktop), light & dark themes
- Turkish 🇹🇷 and English 🇬🇧 UI
- "Predict the winner" engagement layer with a recommended horse
- Unit, property-based, E2E, accessibility and visual tests
- Fairness simulation proving how condition affects winning chances

## Testing & evidence

Every claim is measured, and every requirement ID from the brief is traced to the tests that prove it:
[**docs/TRACEABILITY.md**](docs/TRACEABILITY.md) (generated, checked in CI).

| Layer            | Tool                             | What it proves                                                                               |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit & component | Vitest, @vue/test-utils          | Game rules, stores (fake clock), components' ARIA contracts                                  |
| Property-based   | fast-check                       | Every rule holds for any seed; any mix of pause / speed changes gives the seeded results     |
| Statistical      | Vitest + `domain/fairness.ts`    | Average position improves with every step up in condition; outsiders can still win           |
| Architecture     | ESLint API in Vitest             | Forbidden imports (domain → Vue, feature → feature, …) are rejected                          |
| End-to-end       | Playwright                       | The brief's full flow, keyboard-only play, persistence, sharing, replay                      |
| Accessibility    | @axe-core/playwright             | 0 serious / critical WCAG 2.2 AA issues — idle, racing, results, podium, both themes, mobile |
| Visual           | Playwright screenshots           | 3 devices × 2 themes × 2 languages, plus clock-frozen race frames                            |
| Performance      | Playwright + PerformanceObserver | Frame timing and long tasks while racing                                                     |

**Performance** (Chromium, 4 s of racing at 4×): **60 fps** median, p95 frame 16.8 ms, **0 long tasks**.
Horses move by `transform` only and nothing is written to Pinia per frame
([ADR 0005](docs/adr/0005-race-clock-checkpoints.md), [ADR 0008](docs/adr/0008-paint-runners-directly.md)).

**Visual baselines** are Linux screenshots made by CI, so they match the CI renderer exactly. When a
change alters the UI on purpose, the **Visual tests** job fails and uploads the new screenshots as the
`visual-baselines` artifact; review them and commit them to `tests/visual/__snapshots__/`:

```bash
gh run download <run-id> -n visual-baselines -D /tmp/visual
cp /tmp/visual/tests/visual/__snapshots__/*-linux.png tests/visual/__snapshots__/
```

Locally, `npm run test:visual:update` writes macOS baselines (git-ignored) for quick checks.

## Fairness

Does condition matter, and can an outsider still win? The race engine is played thousands of times
with seeded randomness ([ADR 0001](docs/adr/0001-deterministic-race-engine.md)):

<!-- fairness:start -->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/fairness-dark.svg">
  <img alt="Win rate by condition: rises from 0.0 % for condition 1–10 to 35.2 % for 91–100" src="docs/fairness-light.svg">
</picture>

**10,000 programs · 60,000 rounds.** Spearman ρ between condition and
finishing position: **-0.641** · best-conditioned runner wins **39.9 %** of rounds
(chance: 10 %) · a horse outside the top-3 conditions wins **19.2 %** — favourites usually, not always.

| Condition | Runs   | Win rate | Podium rate | Avg. position |
| --------- | ------ | -------- | ----------- | ------------- |
| 1–10      | 60,127 | 0.0 %    | 1.0 %       | 8.35          |
| 11–20     | 59,626 | 0.1 %    | 3.1 %       | 7.79          |
| 21–30     | 61,179 | 0.4 %    | 7.4 %       | 7.13          |
| 31–40     | 59,494 | 1.3 %    | 13.5 %      | 6.49          |
| 41–50     | 59,458 | 2.9 %    | 22.0 %      | 5.80          |
| 51–60     | 59,901 | 5.8 %    | 31.1 %      | 5.13          |
| 61–70     | 60,199 | 10.9 %   | 41.1 %      | 4.46          |
| 71–80     | 60,239 | 17.6 %   | 50.9 %      | 3.84          |
| 81–90     | 60,155 | 25.8 %   | 60.4 %      | 3.26          |
| 91–100    | 59,622 | 35.2 %   | 69.7 %      | 2.75          |

_Generated by `npm run simulate`._

<!-- fairness:end -->

## Documentation

| Document                             | Content                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [Requirements](docs/REQUIREMENTS.md) | Case requirements with traceability IDs, ambiguities and decisions     |
| [Architecture](docs/ARCHITECTURE.md) | Stack, folder structure, race engine, state machine, responsive layout |
| [Plan](docs/PLAN.md)                 | Phased implementation plan and progress                                |
| [ADRs](docs/adr/README.md)           | Architecture Decision Records                                          |

## Getting started

Requires **Node.js 24** (see `.nvmrc`).

```bash
nvm use
npm ci
npm run dev        # http://localhost:5173
```

| Script                            | What it does                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run verify`                  | Lint + format check + type-check + unit tests (run before every commit) |
| `npm run build`                   | Type-check and production build                                         |
| `npm run test:unit`               | Vitest in watch mode                                                    |
| `npm run test:coverage`           | Unit tests with coverage thresholds                                     |
| `npm run test:e2e`                | Playwright end-to-end tests (`npx playwright install chromium` once)    |
| `npm run test:visual`             | Playwright screenshot tests                                             |
| `npm run lint` / `npm run format` | Auto-fix lint and formatting                                            |

## Contributing

GitHub Flow: one short-lived branch and one pull request per phase, merged into `main` when CI is green
([ADR 0004](docs/adr/0004-github-flow-branching.md)).
