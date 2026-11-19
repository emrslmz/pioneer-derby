# 0010. Broadcast layer derived from the precomputed race

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

X13 asks for a live leaderboard, commentary, a photo finish and a podium. These change during a round,
but the animation must stay at 60 fps without per-frame store writes or re-renders (X10, ADR 0002/0008),
and the commentary must agree exactly with the official result.

## Decision

- `domain/broadcast.ts` derives everything from the precomputed `RoundRace`:
  - `standingsAt(profiles, t)` — order of the field at any moment (ends equal to the official result;
    property-tested for every seed);
  - `buildCommentary(race)` — a timeline of codes (`START`, `LEAD_CHANGE`, `HALFWAY`, `FINAL_STRETCH`,
    `PHOTO_FINISH`, `WINNER`) from one scan of the round, rate-limited so the ticker stays readable;
  - `isPhotoFinish(race)` — 1st and 2nd within `PHOTO_FINISH_MS` (≈ 15 % of rounds).
- `features/track/composables/useBroadcast` evaluates standings and the current line every frame inside
  the existing rAF loop, but **assigns its refs only when the order or the line changes** — a few updates
  per round.
- Between rounds the finished round stays on screen (horses at the line, winner lane highlighted, podium
  card); the next line-up appears when its round starts. The intermission is real time (A28).
- Screen readers: the ticker is a polite live region, except the winner line (the results panel already
  announces it); the leaderboard is a labelled list, not a live region.

## Alternatives considered

- **Compute commentary from rendered positions** — would depend on frame timing and could disagree with
  the result.
- **Store standings in Pinia** — per-frame writes again.

## Consequences

The broadcast is deterministic and replays identically with the seed. All of it is unit- and
property-tested without rendering; the UI only translates codes and draws.
