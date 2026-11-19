import { describe, expect, it } from 'vitest'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'

describe('game seed helpers', () => {
  const horses = horsesForSeed(99)
  const schedule = scheduleForSeed(horses, 99)

  it('[X11] one seed rebuilds the same horses, program and races', () => {
    expect(horsesForSeed(99)).toEqual(horses)
    expect(scheduleForSeed(horses, 99)).toEqual(schedule)
    expect(roundRaceForSeed(schedule[2]!, horses, 99)).toEqual(
      roundRaceForSeed(schedule[2]!, horses, 99),
    )
  })

  it('[X11] each round has its own random stream', () => {
    const first = roundRaceForSeed(schedule[0]!, horses, 99)
    const sameLineupOtherRound = roundRaceForSeed({ ...schedule[0]!, index: 1 }, horses, 99)
    expect(sameLineupOtherRound.profiles).not.toEqual(first.profiles)
  })
})
