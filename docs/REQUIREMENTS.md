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

| #   | Ambiguity                                                   | Decision                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | "1 to 20 horses" vs "total of 20 horses"                    | Always generate exactly 20; "1–20" = list numbering (matches screenshot).                                                                                                                                                                                                                                           |
| A2  | When is the horse list generated?                           | On app load; "Generate Program" re-rolls horses + schedule.                                                                                                                                                                                                                                                         |
| A3  | Can the same horse race in several rounds?                  | Yes — each round independently samples 10 of 20 (no repeat inside a round).                                                                                                                                                                                                                                         |
| A4  | Does "Start" auto-advance between rounds?                   | Manual by default: after each round the primary action is Next round, with unlimited time to predict. Auto advance is opt-in (off on a fresh visit), starts after a 2.5 s break and can be cancelled during that break.                                                                                             |
| A5  | How does condition affect the result?                       | Higher condition → higher base speed, plus seeded per-round randomness (favorites usually but not always win).                                                                                                                                                                                                      |
| A6  | Generate during a running race?                             | Disabled while running; enabled when paused/finished (resets the game).                                                                                                                                                                                                                                             |
| A7  | Are horse names translated?                                 | No — names are proper nouns; only UI text, ordinals and units are localized.                                                                                                                                                                                                                                        |
| A8  | Predictions & gambling                                      | Points only, no money/odds wording — keeps it a friendly engagement feature.                                                                                                                                                                                                                                        |
| A9  | Are colour names translated?                                | Yes — the domain stores a colour `key` (`red`, `navy` …) plus hex; the UI translates the key.                                                                                                                                                                                                                       |
| A10 | How long does a round take on screen?                       | 6 s (1200 m) to 9 s (2200 m) for an average horse, whatever the metres; speed factor 0.85–1.0 from condition, ±8 % seeded noise per round.                                                                                                                                                                          |
| A11 | How does one seed drive the whole game?                     | `deriveSeed(seed, …parts)` gives each concern its own stream: horses `1`, schedule `2`, round _r_ `(3, r)` — replaying one round never depends on others.                                                                                                                                                           |
| A12 | What does the first "Generate Program" use?                 | The seed the horses were created from (URL `?seed=` or random), so a shared link replays the same game; later clicks re-roll horses + program with a new seed. "Replay" reruns the current seed.                                                                                                                    |
| A13 | Can you pause between rounds?                               | The primary button starts the next round during intermission. A mid-race pause freezes the checkpoint clock; Resume continues from the same position.                                                                                                                                                               |
| A14 | When exactly is a round result published?                   | When the timer for the slowest horse fires, rounded up to the next millisecond — never before the last horse crosses the line.                                                                                                                                                                                      |
| A15 | Where do language and theme live?                           | Language in vue-i18n (`useLocale`), theme in `settings.store`; both persisted in `localStorage`. Speed stays in `race.store` because it changes the clock.                                                                                                                                                          |
| A16 | What stays visible on small screens?                        | The track is always on top; Horses / Program / Results switch via tabs (tablet) or a bottom tab bar (mobile).                                                                                                                                                                                                       |
| A17 | Keyboard shortcuts                                          | `G` generate, `Space` start/pause/resume, `1` `2` `4` speed, `L` language, `T` theme, `?` help. Ignored while typing or with modifier keys; Space on a focused button is left to the button.                                                                                                                        |
| A18 | The example's Program table says "Position"                 | Program shows **Lane** (the draw, nothing raced yet); Results show **Position**, name and race time.                                                                                                                                                                                                                |
| A19 | How are results shown and announced?                        | One block per finished round, in round order, podium positions as medals; a polite live region announces only the winner, so screen readers don't read ten rows per update.                                                                                                                                         |
| A20 | Horse list extras                                           | Sortable by number or condition (`aria-sort`), condition bar, colour dot + translated name, and a "Lane n" badge for horses in the current round.                                                                                                                                                                   |
| A21 | What does reduced motion change on the track?               | Horses still move — that motion is the content (R6) — but the gallop and body bob stop, and decorative transitions are disabled.                                                                                                                                                                                    |
| A22 | How is the track described to screen readers?               | One labelled image (lap, number of horses, lane and finish orientation); runners are decorative. Progress and results are announced by the live regions instead.                                                                                                                                                    |
| A23 | Where does `useRaceLoop` live?                              | `features/track/composables` (only the track uses it; features can't import each other). The generic rAF loop is `shared/composables/useAnimationFrame`.                                                                                                                                                            |
| A24 | When can a prediction be made?                              | On a fresh program (`ready`) and between rounds (`intermission`); locked while a round runs or is paused mid-round. One pick per round, changeable until it locks. Winner 3 pts, podium 1 pt.                                                                                                                       |
| A25 | How is the recommended horse chosen?                        | 65 % condition + 35 % form from earlier rounds only, reason codes translated in the UI (ADR 0009).                                                                                                                                                                                                                  |
| A26 | How are races shared and replayed?                          | "Copy share link" copies the URL with `?seed=`; after the program the primary button becomes **Replay** (also `R`), rerunning the same seed. Predictions reset with every new program.                                                                                                                              |
| A27 | Where are horse statistics?                                 | Clicking a horse name opens a side drawer: condition, colour, rounds run, wins, podiums, average position, form string (e.g. `1-3-5`) and a small form chart.                                                                                                                                                       |
| A28 | Does the race speed shorten the pause between rounds?       | Manual mode waits indefinitely. With Auto advance enabled, the intermission is 2.5 s of real time at every speed; speed only affects racing.                                                                                                                                                                        |
| A29 | What does the track show between rounds?                    | The finished round: horses at the line, the winner's lane highlighted and a podium card (with a photo-finish stamp when 1st and 2nd are < 45 ms apart) plus "Next up". The next line-up appears when its round starts.                                                                                              |
| A30 | How is the broadcast narrated to screen readers?            | The commentary ticker is a polite live region (start, lead changes, halfway, final stretch, photo finish); the winner is announced once, by the results panel.                                                                                                                                                      |
| A31 | Which visual baselines are authoritative?                   | Linux screenshots produced by CI (the CI renderer); missing baselines fail. macOS baselines stay local and are git-ignored.                                                                                                                                                                                         |
| A32 | What does "60 fps" mean in tests?                           | Measured in Chromium while racing: median frame ≤ 20 ms, p95 ≤ 50 ms, no main-thread task ≥ 100 ms (thresholds sized for shared CI runners; local runs measure 60 fps, 0 long tasks).                                                                                                                               |
| A33 | Long names in narrow tables                                 | Horse list, results, leaderboard and picker show "Grace H."; a tooltip (`BaseTooltip`: hover + focus, Escape to dismiss, hoverable — WCAG 1.4.13) shows the full name, and screen readers hear "Grace H. (Grace Hopper)" so the visible text starts the accessible name (WCAG 2.5.3). The program keeps full names. |
| A34 | Where do the prediction card and lists go on small screens? | The compact prediction strip sits inside the track panel and moves with it into the modal theater. Tablet and phone lists cap at 75% of the viewport and scroll internally.                                                                                                                                         |
| A35 | How is a finished round presented?                          | An opaque result board below the track shows podium rows, times, photo-finish margin and prediction outcome. Next round is an explicit button; a countdown appears only with Auto advance enabled.                                                                                                                  |
| A36 | Should the prediction card change size between states?      | The compact title, runner and info rows reserve their size across idle, ready, racing and intermission states; an E2E check verifies no height shift.                                                                                                                                                               |
| A37 | Track surface                                               | Distance-based turf, rails, 100 m ticks and labelled 200 m poles share a world transform. A 300 m camera follows the leaders; an overview and race map preserve full-distance context. Reduced motion uses a stationary overview.                                                                                   |
| A38 | How does a first-time visitor know what to do?              | Before a program exists the prediction card shows a 3-step "How to play" guide with a primary **Generate Program** button; the header button pulses and the empty track offers the same action. The guide and the game share one grid cell, so the card height never changes.                                       |
| A39 | Race speeds                                                 | 0.5×, 1×, 2×, 4× with locale-specific labels and shortcut 0 for 0.5×. Base timing is 12–18 s for an average horse, 24–36 s at 0.5×, with slower runners taking longer.                                                                                                                                              |
| A40 | Reduced motion and transitions                              | Under `prefers-reduced-motion` transitions are `none` (not a tiny duration, which would enable transitions on every property and delay visibility changes); animations end after one 0.01 ms iteration.                                                                                                             |
| A41 | Overlays on the track                                       | Paused and ready states use a compact banner above the track. Results sit below it. These interactive elements are outside the role="img" track so they remain accessible.                                                                                                                                          |
