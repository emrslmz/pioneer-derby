# 0005. Race clock as checkpoints with one timer per round

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The race must support start, pause, resume, an automatic intermission between rounds and 1× / 2× / 4×
speed, while horses animate at 60 fps (R4, X10). ADR 0002 already keeps per-frame positions out of Pinia,
but the store still needs to know _when_ a round ends so results appear in order (R5).

## Decision

`race.store` stores the clock as two checkpoints instead of a ticking value:

```
raceTime = elapsedAtCheckpoint + (performance.now() − checkpointAt) × speed
```

- `elapsedMs()` computes race time on demand; the animation loop calls it every frame.
- Pause folds the running time into `elapsedAtCheckpoint` and clears `checkpointAt`.
- Speed changes rebase the checkpoint, so horses keep their position and only their pace changes.
- One `setTimeout` per round fires when the slowest horse finishes (`ceil(remaining / speed)`, so a
  result is never shown early). It publishes the result and starts the intermission timer.
- Status changes go through the pure transition table in `domain/race-machine.ts`.

## Alternatives considered

- **Tick the store every frame** — reactive churn at 60 Hz, harder to test, violates X10.
- **Let the animation loop detect the finish** — results would depend on rendering; a hidden or
  throttled tab would stall the program.
- **Wall-clock `Date.now()`** — not monotonic; `performance.now()` is.

## Consequences

The game runs fully headless: store tests drive it with fake timers, and a property test shows that any
mix of pauses and speed changes yields exactly the seeded results. The store's state does not change
while a round runs, which a unit test asserts.
