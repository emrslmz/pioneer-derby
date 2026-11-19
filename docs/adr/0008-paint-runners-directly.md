# 0008. Paint runner positions directly to the DOM

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

ADR 0002 keeps per-frame positions out of Pinia and ADR 0005 makes the store clock readable at any time.
The remaining question is how the 10 runners get their position every frame (R6, X10). Binding a reactive
`elapsed` ref into the template would re-render the track component 60 times a second.

## Decision

- `shared/composables/useAnimationFrame` is a generic rAF loop that runs only while a flag is true.
- `features/track/composables/useRaceLoop` runs it while the race clock runs. Each frame it reads
  `race.elapsedMs(now)`, computes `progressAt(profile, elapsed)` per horse, and calls a `paint` callback.
- `RaceTrack` keeps template refs to each runner's **carrier** and writes
  `style.transform = translate3d(progress × 100%, 0, 0)` directly. The carrier is as wide as the run
  length (lane width − runner width, via container query units), so 100 % puts the nose on the finish line
  without reading layout.
- When the clock stops (ready, paused, intermission, finished) one frozen frame is painted.
- The gallop (legs, body bob) is CSS transform animation, its speed tied to the race speed with a CSS
  variable, and switched off under `prefers-reduced-motion`. The horses themselves still move — that motion
  _is_ the content (R6).

## Alternatives considered

- **Reactive ref in the template** — simple, but re-renders the track every frame.
- **CSS transitions to the finish time** — cheap, but pause/resume and speed changes would desynchronise
  from the store clock, and positions would not follow the engine's surge curve.
- **Canvas/WebGL** — fastest, but loses DOM accessibility, theming via CSS variables and easy testing.

## Consequences

The Vue component renders only when the line-up or status changes; per-frame work is ten style writes.
Tests drive frames with fake timers and read the painted transforms; an E2E test measures real movement.
