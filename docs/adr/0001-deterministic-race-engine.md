# 0001. Deterministic, precomputed race engine

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Races must animate visibly (R6), support pause/resume (screenshot: START / PAUSE), show results in order
(R5) and be testable. A naive "move each horse by a random step every frame" couples results to frame rate
and makes tests flaky.

## Decision

At round start, the engine builds a speed profile per horse from its condition and a seeded RNG.
`positionAt(profile, elapsedMs)` is a pure function, and finishing order is computed up front from finish times.
The UI only reads positions for the current clock value.

## Alternatives considered

- **Per-frame random steps** — results depend on FPS and timing; hard to test; can't replay.
- **Pick the winner first, then animate towards it** — simple, but movement looks scripted and condition has no real meaning.

## Consequences

- Results are reproducible from a seed → replay/share (X11), deterministic E2E and visual tests.
- Pause = freeze clock; speed control = scale clock. No engine changes needed.
- Fairness can be measured offline with the same engine (X1).
