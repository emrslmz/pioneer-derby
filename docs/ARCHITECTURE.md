# Architecture & Design

## 1. Concept — "Pioneer Derby"

A night-time stadium race broadcast where the 20 horses are named after **computing pioneers**
(a nod to the example screenshot: Ada Lovelace, Grace Hopper, Margaret Hamilton, Joan Clarke…).

What makes it distinct while staying faithful to the spec layout:

- **Broadcast look**: dark "night track" theme with a coral accent (`#F4482B` → orange gradient),
  light theme also supported (system preference + toggle).
- **Pioneer cards**: each horse has a name, number, unique color swatch + color name, condition bar.
- **Live leaderboard** during the race (current positions update in real time).
- **Photo finish**: winner lane flashes, podium (🥇🥈🥉) appears in the result block.
- **Commentary ticker**: short generated lines ("Grace Hopper takes the lead at 800m!").
- **Speed control** (1× / 2× / 4×) and a **seed** (`?seed=1234`) so a race can be replayed/shared.
- **Predict the winner** + **recommended horse**: an engagement/personalization layer that mirrors
  what personalisation products build (points only, no betting).
- **Typed analytics events** behind a pluggable adapter, visible in a debug panel (`?debug=1`).
- **Horse statistics**: rounds run, average position, form.
- **Turkish + English** UI.
- **Accessibility**: keyboard shortcuts, `aria-live` results, `prefers-reduced-motion` respected, axe-tested.

Core (MVP) features come first (phases 0–5); the extras above follow in phases 6–8.

### Improving on the brief's example screenshot

We keep the example's layout (horse list · track · program + results) so the reviewer recognises it,
and fix what it does poorly:

| In the example                                                           | In Pioneer Derby                                                                     | Phase |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----- |
| All runners are identical black silhouettes — you can't tell who is who  | Each runner is drawn in its horse's unique colour, with its number                   | 5     |
| Colour is only a word ("Yellow") in the list                             | Colour swatch + translated colour name                                               | 4     |
| Condition is a bare number                                               | Number + condition bar, sortable list                                                | 4     |
| Program table has a "Position" column before the race is run             | Program shows **Lane**; Results show **Position** (plus time)                        | 4     |
| Typos: "2ST Lap", "1.st Lap"                                             | Locale-aware ordinals: "2nd Lap – 1400 m" / "2. Tur – 1400 m"                        | 3–4   |
| Nothing tells you who is leading mid-race                                | Live leaderboard, commentary ticker, photo finish and podium                         | 6     |
| Six cramped tables in one scroll box, results duplicated next to program | Current round highlighted and auto-scrolled; results appear one by one (`aria-live`) | 4     |
| Fixed desktop canvas, pastel headers with low contrast                   | Responsive (360 px → desktop), dark/light themes, WCAG-checked contrast (axe)        | 3, 7  |
| No feedback on fairness or replay                                        | Seeded replay/share link, fairness simulation, horse statistics                      | 6–7   |

## 2. Stack

| Concern         | Choice                                                          |
| --------------- | --------------------------------------------------------------- |
| Framework       | Vue 3 (`<script setup>`, Composition API) + TypeScript strict   |
| Build           | Vite                                                            |
| State           | Pinia (setup stores)                                            |
| Styling         | Scoped SCSS + CSS custom properties (design tokens), no UI kit  |
| i18n            | vue-i18n (Composition API mode), `tr` + `en`                    |
| Unit tests      | Vitest + @vue/test-utils + jsdom + fast-check (property tests)  |
| E2E / visual    | Playwright (`toHaveScreenshot`) + @axe-core/playwright          |
| Quality         | ESLint (flat config, vue + ts, boundaries) + Prettier + vue-tsc |
| CI              | GitHub Actions + Lighthouse CI + bundle size budget             |
| Package manager | npm                                                             |

## 3. Folder structure

```
src/
├─ app/                     # App shell: App.vue, layout, global providers
│  ├─ App.vue
│  ├─ splash.ts             # first-load splash and intro (ADR 0013)
│  ├─ tour/                 # first-visit tour: steps, driver.js wiring, progress (ADR 0013)
│  └─ layout/               # AppHeader, AppFooter, ResponsiveLayout, MobileTabBar, dialogs
├─ domain/                  # PURE TypeScript — no Vue, no Pinia imports
│  ├─ constants.ts          # HORSE_COUNT, ROUND_DISTANCES, HORSES_PER_ROUND …
│  ├─ types.ts              # Horse, Round, RoundResult, RaceStatus …
│  ├─ random.ts             # seeded RNG (mulberry32), shuffle, sample
│  ├─ horses.ts             # createHorses(rng)
│  ├─ schedule.ts           # createSchedule(horses, rng)
│  ├─ race-engine.ts        # speed profiles, positionAt(t), finishing order
│  ├─ race-machine.ts       # status transition table (pure)
│  ├─ game.ts               # one seed → horses, schedule, round races (A11)
│  ├─ stats.ts              # per-horse statistics
│  ├─ prediction.ts         # prediction scoring (3 / 1 / 0)
│  ├─ recommendation.ts     # recommended horse + reason codes (ADR 0009)
│  └─ broadcast.ts          # standings, commentary timeline, photo finish (ADR 0010)
├─ stores/                  # Pinia — orchestrates domain functions
│  ├─ horses.store.ts
│  ├─ schedule.store.ts
│  ├─ race.store.ts         # status machine, current round, clock, results, seed
│  ├─ prediction.store.ts   # picks, points, score
│  └─ settings.store.ts     # locale, theme, speed (persisted)
├─ features/
│  ├─ horses/components/    # HorseList, HorseRow, ConditionBar, ColorSwatch, HorseStatsDrawer
│  ├─ track/components/     # RaceTrack (wires the pieces), TrackWorld, TrackTurf, TrackMarkers, RaceMap,
│  │                        #   PlayerBar, TrackOverlays, RoundResultBoard, LiveLeaderboard, CommentaryTicker
│  ├─ track/composables/    # useRaceLoop (rAF → progressAt, ADR 0008), useTrackPainter (per-frame DOM writes),
│  │                        #   useTrackGeometry, useDisplayedRound, useTheater, useBroadcast, useCommentary, useTrackCard
│  ├─ program/components/   # ProgramPanel, RoundTable
│  ├─ results/components/   # ResultsPanel, RoundResultTable
│  ├─ prediction/components/# PredictionCard, RunnerPicker
│  └─ race/composables/     # useRaceControls
├─ shared/
│  ├─ components/           # HorseRunner (a horse in its colour, reused by several features)
│  ├─ ui/                   # BaseButton, BasePanel, BaseTable, BaseBadge, BaseTabs, BaseDialog, BaseSwitch, BaseEmptyState, BaseTooltip
│  ├─ analytics/            # AnalyticsClient interface, event map, console + memory adapters, DebugPanel
│  ├─ composables/          # useMediaQuery, useReducedMotion, useBreakpoint, useAnimationFrame, useKeyboardShortcuts
│  └─ utils/                # assert, storage
├─ i18n/
│  ├─ index.ts              # createI18n, locale detection & persistence
│  └─ locales/              # en.json, tr.json (same keys, type-checked)
├─ styles/                  # tokens.scss, reset.scss, breakpoints.scss
└─ main.ts
scripts/
├─ simulate.ts              # fairness Monte Carlo → docs/fairness.json + SVG chart
└─ traceability.ts          # requirement IDs in test names → docs/TRACEABILITY.md
tests/
├─ unit/                    # mirrors src/ (domain + stores + components), *.property.spec.ts
├─ e2e/                     # Playwright flows + a11y.spec.ts + perf.spec.ts
└─ visual/                  # Playwright screenshot specs
docs/adr/                   # Architecture Decision Records
.github/workflows/          # ci.yml, deploy.yml
```

Dependency direction (enforced by `eslint-plugin-boundaries`):

```
app → features → stores → domain
          ↘ shared ↙
domain imports nothing from the app.
```

## 4. Domain model

```ts
type HorseId = number // 1..20
interface Horse {
  id: HorseId
  name: string
  color: { key: HorseColorKey; hex: string } // key is translated by the UI (A9)
  condition: number
}
interface Round {
  index: number
  distance: number
  horseIds: HorseId[]
} // 10 ids, lane order
interface SpeedProfile {
  horseId: HorseId
  lane: number
  finishTimeMs: number
  surges: Surge[]
}
interface RoundRace {
  round: Round
  profiles: SpeedProfile[]
  durationMs: number
  result: RoundResult
}
interface RoundResult {
  roundIndex: number
  distance: number
  placings: { position: number; horseId: HorseId; timeMs: number }[]
}
type RaceStatus = 'idle' | 'ready' | 'running' | 'paused' | 'intermission' | 'finished'
```

## 5. Race engine (deterministic)

- At round start, each horse gets a **speed profile** from `condition` + seeded noise
  (`base = lerp(MIN_SPEED, MAX_SPEED, condition/100) * (1 ± variance)` plus small mid-race surges).
- `positionAt(profile, elapsedMs)` is a **pure function** → the UI just asks "where is horse X at time t".
- Finishing order = sorted finish times, computed up front ⇒ results are testable without animation.
- Pause = freeze the clock; resume = continue from the same elapsed time. Speed multiplier scales the clock.
- Races run at a real pace (ADR 0012): a speed factor of 1 is 16.5 m/s, so 1200 m takes about 73 s and 2200 m about 133 s of race time for an average horse. The viewer watches at 2× by default and can choose 0.5× to 16×.
- Progress curve: `p(u) = u + Σ a·(sin(2πfu + φ) − sin φ) / 2πf` with `u = t / finishTime`.
  Whole-number `f` makes `p(1) = 1`; `Σ a < 1` keeps `p′ > 0`, so horses surge and fade but never stop,
  and each one crosses the line exactly at its precomputed finish time.

## 6. State machine (race.store)

The transitions live as data in `domain/race-machine.ts`; the store only sends events.

```
idle ──GENERATE──▶ ready ──START──▶ running ──PAUSE──▶ paused ──RESUME──▶ running
                     ▲                 │                  │
                     │          ROUND_FINISHED            └──GENERATE──▶ ready
                     │                 ▼
                 GENERATE      intermission ──NEXT_ROUND (manual/opt-in auto)──▶ running
                     │                 └──PAUSE──▶ paused
                     │
                 finished ◀──PROGRAM_FINISHED── running (last round)
```

Button rules: Generate disabled while `running` / `intermission`; Start/Pause disabled in `idle` / `finished`.
Clock: checkpoints + one timer per round (ADR 0005).

## 7. Responsive layout

| Breakpoint       | Layout                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------- |
| ≥ 1280px desktop | 3 columns: Horse list · Track · Program + Results (as screenshot)                      |
| 768–1279 tablet  | Track full width on top; below: tabs (Horses / Program / Results)                      |
| < 768 mobile     | Sticky compact header, track with compact lanes, bottom tab bar, sticky action buttons |

Fluid type with `clamp()`, lanes sized by container width, tables scroll inside their panel.
The header is sticky: brand, status and utilities on top, Generate / Start full width below on small screens.
No horizontal page scroll at 360px.

## 8. Internationalization

- `vue-i18n` with `tr` and `en`; initial locale = saved choice → browser language → `en`.
- All UI strings come from locale files; `en.json` is the source of truth and `tr.json` is type-checked
  against it (missing key = type error).
- Ordinals (1st / 1.), meters and numbers via `Intl` APIs. Horse names are not translated.
- `<html lang>` follows the active locale (screen readers, a11y).
- Components use `useLocale()` for `lapLabel`, `ordinal`, `distance`; Base components never import i18n.

## 9. Prediction & analytics (product layer)

- Before each round the player may pick a winner. Correct winner = 3 pts, podium = 1 pt.
- `recommendation.ts` suggests a horse from condition + previous-round form and returns _reason codes_
  (e.g. `TOP_CONDITION`, `IN_FORM`) that the UI translates — logic stays testable and language-free.
- `AnalyticsClient` interface with a typed event map (`track<'round_finished'>(payload)`); the app uses a
  console/memory adapter. A real SDK could be plugged in without touching features.

## 10. Quality gates

| Gate              | Tool                 | Threshold                         |
| ----------------- | -------------------- | --------------------------------- |
| Lint + boundaries | ESLint               | 0 errors                          |
| Types             | vue-tsc              | 0 errors                          |
| Unit coverage     | Vitest v8            | domain ≥ 95%, stores ≥ 90%        |
| E2E + visual      | Playwright           | all green                         |
| Accessibility     | @axe-core/playwright | 0 serious/critical                |
| Lighthouse        | Lighthouse CI        | ≥ 95 perf / a11y / best-practices |
| Bundle            | size budget          | JS < 120 kB gzip                  |

## 11. Testing strategy

- **Unit**: domain (20 horses, unique colors, condition 1–100, 6 rounds, 10 unique horses/round,
  distances, deterministic with seed, finishing order), stores (state transitions), key components.
  Test titles start with requirement IDs, e.g. `it('[C5] picks 10 distinct horses per round')`.
- **Property-based**: fast-check generates seeds; every game rule must hold for all of them.
- **Statistical**: fairness simulation asserts average placing improves with condition.
- **E2E**: generate → program shows 6 rounds → start → results appear one by one → pause/resume →
  all 6 results; language switch; prediction flow. Uses `?seed=` and the fastest speed.
  Locally Playwright starts its own dev server on port 5199 (never reuses another app's server).
- **Accessibility**: axe scan in idle, running and finished states.
- **Visual**: seeded, animations disabled; desktop / tablet / mobile × light / dark × tr / en.
- **Performance**: frame timing during a race, no long tasks > 50 ms.

## Current playback decisions

See [ADR 0012](adr/0012-real-pace-true-scale-broadcast.md), which builds on [ADR 0011](adr/0011-track-camera-and-manual-rounds.md):

- real racing pace (16.5 m/s, default 2×, up to 16×);
- a true-scale follow camera over a looping turf layer;
- finished horses standing still;
- the pause origin in the store (`isBetweenRounds`);
- one player bar under the track;
- auto advance on by default, with a 6 s countdown.

ADR 0011 still covers the metre-based world, the race map and the native modal theater.
