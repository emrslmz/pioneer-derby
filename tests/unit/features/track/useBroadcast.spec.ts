import { describe, expect, it } from 'vitest'
import { shallowRef, watch } from 'vue'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import type { RoundRace } from '@/domain/types'
import { useBroadcast } from '@/features/track/composables/useBroadcast'

describe('useBroadcast', () => {
  it('[X10] updates standings and commentary only when they actually change', async () => {
    const horses = horsesForSeed(42)
    const race = shallowRef<RoundRace | null>(
      roundRaceForSeed(scheduleForSeed(horses, 42)[0]!, horses, 42),
    )
    const broadcast = useBroadcast(race)
    let standingsUpdates = 0
    let lineUpdates = 0
    watch(broadcast.standings, () => standingsUpdates++, { flush: 'sync' })
    watch(broadcast.line, () => lineUpdates++, { flush: 'sync' })

    // Simulate 60 fps for the whole round.
    const frames = Math.ceil(race.value!.durationMs / 16.7)
    for (let f = 0; f <= frames; f++) broadcast.update(f * 16.7)

    expect(frames).toBeGreaterThan(300)
    expect(standingsUpdates).toBeLessThan(frames / 4)
    expect(lineUpdates).toBe(broadcast.line.value ? lineUpdates : 0)
    expect(broadcast.line.value?.code).toBe('WINNER')
    expect(broadcast.standings.value).toEqual(race.value!.result.placings.map((p) => p.horseId))
  })

  it('[X13] is empty without a race', () => {
    const broadcast = useBroadcast(shallowRef(null))
    broadcast.update(1000)
    expect(broadcast.standings.value).toEqual([])
    expect(broadcast.line.value).toBeNull()
    expect(broadcast.photoFinish.value).toBe(false)
  })
})
