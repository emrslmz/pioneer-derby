import { PODIUM_SIZE, PREDICTION_POINTS } from './constants'
import type { HorseId, RoundResult } from './types'

export type PredictionOutcome = keyof typeof PREDICTION_POINTS

export interface PredictionScore {
  readonly outcome: PredictionOutcome
  readonly points: number
  /** Where the picked horse finished. */
  readonly position: number | null
}

/** X4 — 3 points for the winner, 1 for a podium finish, 0 otherwise. */
export function scorePrediction(pick: HorseId, result: RoundResult): PredictionScore {
  const placing = result.placings.find((p) => p.horseId === pick)
  const position = placing?.position ?? null
  const outcome: PredictionOutcome =
    position === 1 ? 'winner' : position !== null && position <= PODIUM_SIZE ? 'podium' : 'miss'
  return { outcome, points: PREDICTION_POINTS[outcome], position }
}
