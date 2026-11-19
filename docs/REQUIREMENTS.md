# Requirements — Insider One Horse Racing Case

Source: `Insider One Case Study - Front-end Developer.pdf` (2 pages + example screenshot).
Every requirement has an ID. Code, tests and PRs reference these IDs.

## Functional requirements

| ID  | Requirement (PDF)                                                             | Implementation note                                        | Test       |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| R1  | Technology: VueJS                                                             | Vue 3 + TypeScript + Vite                                  | —          |
| R2  | Generate horse list: 1–20 horses, randomly generated                          | 20 horses, numbered 1–20, random condition, names shuffled | unit       |
| R3  | **Generate** button creates a race schedule of 6 rounds                       | "Generate Program" button → `scheduleStore.generate()`     | unit + e2e |
| R4  | **Start** button starts races, **one round at a time**                        | Rounds run sequentially; button toggles Start / Pause      | e2e        |
| R5  | Results appear in the **Results** field, sequentially as each round concludes | Results panel appends a round only after it finishes       | e2e        |
| R6  | Horses visibly move during each race                                          | rAF-driven clock + CSS `transform: translateX` per lane    | visual     |
| R7  | Clean, maintainable code "as if for a large-scale project"                    | Feature-based folders, pure domain layer, strict TS, lint  | CI         |

## Rules & conditions

| ID  | Rule                                            | Constant / location                        |
| --- | ----------------------------------------------- | ------------------------------------------ |
| C1  | Total of 20 horses available                    | `HORSE_COUNT = 20`                         |
| C2  | Each horse has a **unique color**               | `HORSE_COLORS` (20 named, distinct)        |
| C3  | Condition score 1–100                           | `CONDITION_MIN = 1`, `CONDITION_MAX = 100` |
| C4  | 6 rounds per race                               | `ROUND_DISTANCES.length === 6`             |
| C5  | Each round: 10 random horses out of 20          | `HORSES_PER_ROUND = 10`                    |
| C6  | Distances: 1200, 1400, 1600, 1800, 2000, 2200 m | `ROUND_DISTANCES`                          |

## Technical expectations

| ID  | Expectation                                     |
| --- | ----------------------------------------------- |
| T1  | Vuex / **Pinia** state management for game data |
| T2  | Component-based design                          |

## Bonus

| ID  | Bonus       | Tooling                                             |
| --- | ----------- | --------------------------------------------------- |
| B1  | Unit test   | Vitest + @vue/test-utils                            |
| B2  | E2E test    | Playwright                                          |
| B3  | Visual test | Playwright `toHaveScreenshot` (seeded, motion-free) |

## Differentiators (beyond the brief)

Our own additions. They carry IDs too, so they show up in the traceability report.

| ID  | Addition                                                                  | Evidence / where                                      |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| X1  | Fairness simulation: 10k seeded races, condition → win-rate               | `scripts/simulate.ts`, README chart, statistical test |
| X2  | Property-based tests (fast-check) for all game rules                      | `tests/unit/domain/*.property.spec.ts`                |
| X3  | Requirement ↔ test traceability (IDs in test names + generated report)    | `scripts/traceability.ts`, `docs/TRACEABILITY.md`     |
| X4  | "Predict the winner" game + recommended horse (personalization signal)    | `features/prediction/`                                |
| X5  | Typed analytics event layer (pluggable adapter) + debug panel             | `shared/analytics/`                                   |
| X6  | CI: lint, types, coverage, E2E, visual, axe, Lighthouse, bundle budget    | `.github/workflows/`                                  |
| X7  | Enforced architecture boundaries                                          | `eslint-plugin-boundaries` config                     |
| X8  | Accessibility: axe tests, keyboard shortcuts, screen-reader announcements | `tests/e2e/a11y.spec.ts`                              |
| X9  | i18n: Turkish + English, auto-detected, persisted                         | `src/i18n/`                                           |
| X10 | Performance: 60fps, transform-only, no per-frame store writes             | perf test + trace in README                           |
| X11 | Replay & share via seed (`?seed=`)                                        | `race.store`, share button                            |
| X12 | Horse statistics (rounds run, avg position, form)                         | `domain/stats.ts`, `features/horses/`                 |
| X13 | Live leaderboard, photo finish, podium, commentary ticker                 | `features/track/`, `features/results/`                |
| X14 | Architecture Decision Records                                             | `docs/adr/`                                           |
| X15 | Clean, phase-based Conventional Commit history                            | git log                                               |

## Details read from the example screenshot

- Header: title + **GENERATE PROGRAM** and **START / PAUSE** buttons → pause is expected.
- Left: "Horse List (1-20)" table — columns **Name / Condition / Color** (color shown as a _name_, e.g. "Red").
- Center: 10 numbered lanes, dashed separators, red FINISH line, label "1st Lap 1200m" under the track.
- Right: **Program** and **Results** side by side; each round block "1st Lap - 1200m" with **Position / Name** table.
- Horse names in the screenshot are computing pioneers (Ada Lovelace, Grace Hopper, Margaret Hamilton, Joan Clarke).
- Screenshot typos ("2ST Lap", "3ST Lap") → we use correct ordinals (1st, 2nd, 3rd, 4th, 5th, 6th).

## Ambiguities & decisions

| #   | Ambiguity                                  | Decision                                                                                                       |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| A1  | "1 to 20 horses" vs "total of 20 horses"   | Always generate exactly 20; "1–20" = list numbering (matches screenshot).                                      |
| A2  | When is the horse list generated?          | On app load; "Generate Program" re-rolls horses + schedule.                                                    |
| A3  | Can the same horse race in several rounds? | Yes — each round independently samples 10 of 20 (no repeat inside a round).                                    |
| A4  | Does "Start" auto-advance between rounds?  | Yes, short intermission between rounds; Pause stops at any time.                                               |
| A5  | How does condition affect the result?      | Higher condition → higher base speed, plus seeded per-round randomness (favorites usually but not always win). |
| A6  | Generate during a running race?            | Disabled while running; enabled when paused/finished (resets the game).                                        |
| A7  | Are horse names translated?                | No — names are proper nouns; only UI text, ordinals and units are localized.                                   |
| A8  | Predictions & gambling                     | Points only, no money/odds wording — keeps it a friendly engagement feature.                                   |
