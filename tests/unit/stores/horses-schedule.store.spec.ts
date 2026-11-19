import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { horsesForSeed, scheduleForSeed } from '@/domain/game'
import { useHorsesStore } from '@/stores/horses.store'
import { useScheduleStore } from '@/stores/schedule.store'

describe('horses & schedule stores', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('[R2] [T1] holds the 20 horses generated from a seed, with lookup by id', () => {
    const store = useHorsesStore()
    store.generate(5)

    expect(store.horses).toEqual(horsesForSeed(5))
    expect(store.getHorse(3)).toEqual(horsesForSeed(5)[2])
    expect(store.getHorse(999)).toBeUndefined()
  })

  it('[R3] [T1] holds the 6-round program and can be cleared', () => {
    const horses = horsesForSeed(5)
    const store = useScheduleStore()
    expect(store.hasProgram).toBe(false)

    store.generate(horses, 5)
    expect(store.rounds).toEqual(scheduleForSeed(horses, 5))
    expect(store.roundCount).toBe(6)
    expect(store.hasProgram).toBe(true)

    store.clear()
    expect(store.roundCount).toBe(0)
  })
})
