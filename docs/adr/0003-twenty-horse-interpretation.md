# 0003. Always generate exactly 20 horses

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The brief says "the horse list should contain between 1 to 20 horses" and also "the game should have a
total of 20 horses". The example screenshot titles the list "Horse List (1-20)" and shows 20 rows.

## Decision

Generate exactly 20 horses (`HORSE_COUNT = 20`). "1–20" is read as the list numbering.

## Alternatives considered

- **Random count between 1 and 20** — contradicts "total of 20" and breaks "10 random horses per round"
  whenever fewer than 10 horses exist.

## Consequences

Rules C1 and C5 always hold. `HORSE_COUNT` stays a single constant if the business rule ever changes.
