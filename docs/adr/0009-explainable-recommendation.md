# 0009. Explainable horse recommendation with reason codes

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The "Predict the winner" game (X4) suggests a horse before each round. In personalisation
products, a suggestion users can't understand is a suggestion users don't trust. The suggestion must
also be fair (no knowledge of the coming result), testable, and language-independent.

## Decision

- `domain/recommendation.ts` rates each runner 0–100:
  `rating = 0.65 × condition` (normalised) `+ 0.35 × form`, where form is the average finishing position in
  **earlier** rounds (1st → 100, 10th → 0). Horses that have not raced are rated on condition alone.
- Only results of rounds before the current one are used — the precomputed result of the coming round is
  never read (tested: "no peeking").
- The highest rating wins; ties go to the lower lane.
- The domain returns **reason codes** (`TOP_CONDITION`, `IN_FORM`, `PREVIOUS_WINNER`, fallback
  `BEST_RATING`); the UI translates them and joins them with `Intl.ListFormat`.
- `prediction_made` records whether the player followed the tip (`followedRecommendation`), the metric a
  product team would use to measure the recommendation's influence.

## Alternatives considered

- **Condition only** — ignores what the player has just seen happen; feels static.
- **Peek at the precomputed result** — always right, therefore pointless and unfair.
- **Free-text reasons from the domain** — not translatable, mixes presentation into business logic.

## Consequences

The tip is right often but not always (the race engine adds per-round noise), which keeps the game
interesting. Weights live in `RECOMMENDATION_WEIGHTS`; tuning them is a one-line change with tests.
