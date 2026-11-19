import { PODIUM_SIZE } from './constants'
import type { HorseId, RoundResult } from './types'

/** X12 — per-horse performance over the rounds finished so far. */
export interface HorseStats {
  readonly horseId: HorseId
  readonly roundsRun: number
  readonly wins: number
  readonly podiums: number
  /** `null` until the horse has finished a round. */
  readonly averagePosition: number | null
  /** Finishing positions in round order, e.g. [3, 1, 5]. */
  readonly form: readonly number[]
}

/** Builds stats for every given horse; horses that have not raced get empty stats. */
export function computeHorseStats(
  horseIds: readonly HorseId[],
  results: readonly RoundResult[],
): Map<HorseId, HorseStats> {
  const positions = new Map<HorseId, number[]>(horseIds.map((id) => [id, []]))

  const ordered = [...results].sort((a, b) => a.roundIndex - b.roundIndex)
  for (const result of ordered) {
    for (const placing of result.placings) {
      positions.get(placing.horseId)?.push(placing.position)
    }
  }

  return new Map(
    [...positions].map(([horseId, form]) => [
      horseId,
      {
        horseId,
        roundsRun: form.length,
        wins: form.filter((position) => position === 1).length,
        podiums: form.filter((position) => position <= PODIUM_SIZE).length,
        averagePosition:
          form.length === 0
            ? null
            : form.reduce((sum, position) => sum + position, 0) / form.length,
        form,
      },
    ]),
  )
}
