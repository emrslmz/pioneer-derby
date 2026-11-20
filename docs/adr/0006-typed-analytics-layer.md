# 0006. Typed analytics layer with pluggable adapters

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Products are built on top of behavioural events. The game should show how user actions would be
measured in a real product, without coupling features to a vendor SDK or scattering `console.log` (X5).

## Decision

- `AnalyticsEventMap` in `shared/analytics/events.ts` is the single event catalogue. `track(name, payload)`
  is type-checked against it, so payloads cannot drift.
- Every event carries `timestamp` and `sessionId`, like a real SDK envelope.
- An `AnalyticsClient` fans events out to adapters: an in-memory log (debug panel, tests) and a
  dev-only console adapter. A vendor SDK would be one more adapter.
- A failing adapter is caught and logged; analytics can never break the game.
- Stores emit domain-level events (`program_generated`, `round_finished` …); UI-only events follow in Phase 6.

## Alternatives considered

- **Direct vendor SDK calls** — vendor lock-in, untestable, network in unit tests.
- **Untyped `track(string, object)`** — silent schema drift between code and dashboards.

## Consequences

Tests assert on the exact event sequence of a game. Adding an event is a one-line change to the map, and
TypeScript then flags every call site with a wrong payload.
