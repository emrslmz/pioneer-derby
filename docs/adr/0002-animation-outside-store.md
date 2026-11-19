# 0002. Keep per-frame animation state out of Pinia

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

10 horses × 60 fps = 600 position updates per second. Writing them into a reactive store triggers
dependency tracking, devtools timeline entries and re-renders of unrelated components.

## Decision

Pinia stores hold game state (status, current round, elapsed-time checkpoints, results).
A `useRaceLoop` composable owns the `requestAnimationFrame` clock; each `HorseRunner` derives its
`transform: translateX()` from that clock via `positionAt`. Only meaningful events (round finished,
leader changed) reach the store.

## Alternatives considered

- **Positions in Pinia** — simple to inspect, but costly and noisy at 60 fps.
- **Canvas rendering** — fast, but loses DOM accessibility and component-level testing.

## Consequences

- Smooth animation using only `transform`, measurable in the perf test (X10).
- Store stays small and testable; animation logic is isolated in one composable.
