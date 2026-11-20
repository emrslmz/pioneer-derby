import { computeHorseStats, type HorseStats } from './stats'
import type { HorseId, RoundResult } from './types'

/** How many horses the summary chart shows. */
export const SUMMARY_CHART_SIZE = 6

export interface RoundWinner {
  readonly roundIndex: number
  readonly distance: number
  readonly horseId: HorseId
  readonly timeMs: number
}

/** X13 — what a finished program comes down to: who won most, and who won each round. */
export interface ProgramSummary {
  /** Most wins, then most podiums, then best average position, then the lowest number. */
  readonly champion: HorseStats | null
  /** The best horses in the same order, for the chart. */
  readonly standings: readonly HorseStats[]
  readonly roundWinners: readonly RoundWinner[]
}

function compare(a: HorseStats, b: HorseStats): number {
  return (
    b.wins - a.wins ||
    b.podiums - a.podiums ||
    (a.averagePosition ?? Infinity) - (b.averagePosition ?? Infinity) ||
    a.horseId - b.horseId
  )
}

/** Pure: the same results always give the same summary. */
export function summarizeProgram(
  horseIds: readonly HorseId[],
  results: readonly RoundResult[],
): ProgramSummary {
  const stats = [...computeHorseStats(horseIds, results).values()].filter(
    (horse) => horse.roundsRun > 0,
  )
  const ranked = stats.sort(compare)

  const roundWinners = [...results]
    .sort((a, b) => a.roundIndex - b.roundIndex)
    .flatMap((result) => {
      const winner = result.placings.find((placing) => placing.position === 1)
      return winner
        ? [
            {
              roundIndex: result.roundIndex,
              distance: result.distance,
              horseId: winner.horseId,
              timeMs: winner.timeMs,
            },
          ]
        : []
    })

  return {
    champion: ranked[0] ?? null,
    standings: ranked
      .filter((horse) => horse.podiums > 0 || horse.wins > 0)
      .slice(0, SUMMARY_CHART_SIZE),
    roundWinners,
  }
}

/** Highest podium count in the chart: the length of its longest bar. */
export function chartMaximum(standings: readonly HorseStats[]): number {
  return Math.max(1, ...standings.map((horse) => horse.podiums))
}
