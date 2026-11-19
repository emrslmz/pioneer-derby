import {
  CONDITION_MAX,
  CONDITION_MIN,
  HORSES_PER_ROUND,
  PODIUM_SIZE,
  RECOMMENDATION_WEIGHTS,
} from './constants'
import { computeHorseStats, type HorseStats } from './stats'
import type { Horse, HorseId, Round, RoundResult } from './types'

/**
 * Why a horse is recommended. The domain returns codes; the UI translates them (A7, X9).
 * - TOP_CONDITION: best condition in this round's line-up
 * - IN_FORM: average finish on the podium in earlier rounds
 * - PREVIOUS_WINNER: has already won a round
 * - BEST_RATING: none of the above, but the best combined rating
 */
export type RecommendationReason = 'TOP_CONDITION' | 'IN_FORM' | 'PREVIOUS_WINNER' | 'BEST_RATING'

export interface Recommendation {
  readonly horseId: HorseId
  /** 0–100 */
  readonly rating: number
  readonly reasons: readonly RecommendationReason[]
}

const normalise = (value: number, min: number, max: number) => (value - min) / (max - min)

/** 0–100: condition, blended with form (1st = 100, last = 0) once the horse has raced. */
export function rateHorse(horse: Horse, stats: HorseStats | undefined): number {
  const condition = normalise(horse.condition, CONDITION_MIN, CONDITION_MAX) * 100
  if (!stats || stats.averagePosition === null) return condition
  const form = (1 - normalise(stats.averagePosition, 1, HORSES_PER_ROUND)) * 100
  return RECOMMENDATION_WEIGHTS.condition * condition + RECOMMENDATION_WEIGHTS.form * form
}

/**
 * X4 — the horse to back in `round`, using only what is known before the round starts:
 * conditions and the results of earlier rounds. Ties go to the lower lane.
 */
export function recommendHorse(
  round: Round,
  horses: readonly Horse[],
  previousResults: readonly RoundResult[],
): Recommendation {
  const earlier = previousResults.filter((result) => result.roundIndex < round.index)
  const stats = computeHorseStats(round.horseIds, earlier)
  const byId = new Map(horses.map((horse) => [horse.id, horse]))
  const runners = round.horseIds.map((id) => {
    const horse = byId.get(id)
    if (!horse) throw new Error(`recommendHorse: unknown horse ${id}`)
    return { horse, stats: stats.get(id), rating: rateHorse(horse, stats.get(id)) }
  })

  // `reduce` keeps the first (lowest lane) runner on ties.
  const best = runners.reduce((top, runner) => (runner.rating > top.rating ? runner : top))
  const topCondition = Math.max(...runners.map((r) => r.horse.condition))

  const reasons: RecommendationReason[] = []
  if (best.horse.condition === topCondition) reasons.push('TOP_CONDITION')
  if (best.stats?.averagePosition != null && best.stats.averagePosition <= PODIUM_SIZE)
    reasons.push('IN_FORM')
  if ((best.stats?.wins ?? 0) > 0) reasons.push('PREVIOUS_WINNER')
  if (reasons.length === 0) reasons.push('BEST_RATING')

  return { horseId: best.horse.id, rating: Math.round(best.rating), reasons }
}
