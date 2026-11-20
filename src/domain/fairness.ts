import { CONDITION_MAX, CONDITION_MIN, PODIUM_SIZE } from './constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from './game'

/**
 * X1 — fairness analysis. Plays many seeded programs and measures how condition relates to results.
 * Pure and deterministic, so the simulation script and the statistical test share it.
 */

export interface ConditionBucket {
  /** Inclusive condition range, e.g. 1–10. */
  readonly from: number
  readonly to: number
  readonly runs: number
  readonly winRate: number
  readonly podiumRate: number
  readonly averagePosition: number
}

export interface FairnessReport {
  readonly programs: number
  readonly rounds: number
  readonly buckets: readonly ConditionBucket[]
  /** Spearman rank correlation between condition and finishing position (negative = fitter finishes higher). */
  readonly spearman: number
  /** Share of rounds won by the runner with the best condition in that line-up. */
  readonly favouriteWinRate: number
  /** Share of rounds won by a runner outside the top 3 conditions of its line-up. */
  readonly upsetRate: number
}

function ranks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const result = Array.from<number>({ length: values.length })
  for (let i = 0; i < order.length;) {
    let j = i
    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) j++
    const averageRank = (i + j) / 2 + 1 // ties share the average rank
    for (let k = i; k <= j; k++) result[order[k]!.index] = averageRank
    i = j + 1
  }
  return result
}

/** Spearman's rho: Pearson correlation of the ranks. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  const rx = ranks(xs)
  const ry = ranks(ys)
  const n = rx.length
  const mean = (n + 1) / 2
  let covariance = 0
  let varianceX = 0
  let varianceY = 0
  for (let i = 0; i < n; i++) {
    const dx = rx[i]! - mean
    const dy = ry[i]! - mean
    covariance += dx * dy
    varianceX += dx * dx
    varianceY += dy * dy
  }
  return covariance / Math.sqrt(varianceX * varianceY)
}

export function analyseFairness(
  programs: number,
  { firstSeed = 1, bucketSize = 10 }: { firstSeed?: number; bucketSize?: number } = {},
): FairnessReport {
  const bucketCount = Math.ceil((CONDITION_MAX - CONDITION_MIN + 1) / bucketSize)
  const totals = Array.from({ length: bucketCount }, () => ({
    runs: 0,
    wins: 0,
    podiums: 0,
    positions: 0,
  }))
  const conditions: number[] = []
  const positions: number[] = []
  let rounds = 0
  let favouriteWins = 0
  let upsets = 0

  for (let seed = firstSeed; seed < firstSeed + programs; seed++) {
    const horses = horsesForSeed(seed)
    const conditionOf = new Map(horses.map((horse) => [horse.id, horse.condition]))
    for (const round of scheduleForSeed(horses, seed)) {
      const { placings } = roundRaceForSeed(round, horses, seed).result
      rounds++

      const byCondition = [...round.horseIds].sort(
        (a, b) => conditionOf.get(b)! - conditionOf.get(a)!,
      )
      const winner = placings[0]!.horseId
      if (conditionOf.get(winner) === conditionOf.get(byCondition[0]!)) favouriteWins++
      if (!byCondition.slice(0, PODIUM_SIZE).includes(winner)) upsets++

      for (const { horseId, position } of placings) {
        const condition = conditionOf.get(horseId)!
        const bucket = totals[Math.floor((condition - CONDITION_MIN) / bucketSize)]!
        bucket.runs++
        bucket.positions += position
        if (position === 1) bucket.wins++
        if (position <= PODIUM_SIZE) bucket.podiums++
        conditions.push(condition)
        positions.push(position)
      }
    }
  }

  const round3 = (value: number) => Math.round(value * 1000) / 1000
  return {
    programs,
    rounds,
    buckets: totals.map((bucket, index) => ({
      from: CONDITION_MIN + index * bucketSize,
      to: Math.min(CONDITION_MAX, CONDITION_MIN + (index + 1) * bucketSize - 1),
      runs: bucket.runs,
      winRate: round3(bucket.runs ? bucket.wins / bucket.runs : 0),
      podiumRate: round3(bucket.runs ? bucket.podiums / bucket.runs : 0),
      averagePosition: round3(bucket.runs ? bucket.positions / bucket.runs : 0),
    })),
    spearman: round3(spearman(conditions, positions)),
    favouriteWinRate: round3(favouriteWins / rounds),
    upsetRate: round3(upsets / rounds),
  }
}
