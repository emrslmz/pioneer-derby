import type { RaceStatus } from '@/domain/types'

export type RoundState = 'done' | 'live' | 'next' | 'upcoming'

/** How a round in the program should be shown, given the race progress. */
export function roundState(
  roundIndex: number,
  currentRoundIndex: number,
  status: RaceStatus,
  completedCount: number,
): RoundState {
  if (roundIndex < completedCount) return 'done'
  if (roundIndex !== currentRoundIndex || status === 'idle' || status === 'finished')
    return 'upcoming'
  return status === 'running' ? 'live' : 'next'
}
