import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { analyticsLog } from '@/shared/analytics'
import { useRaceStore } from '@/stores/race.store'

/** Fresh Pinia + fake clock (setTimeout and performance.now advance together). */
export function setupRace(seed = 42) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  setActivePinia(createPinia())
  analyticsLog.clear()
  window.history.replaceState(null, '', '/')
  const race = useRaceStore()
  race.initialize(seed)
  return race
}

export type RaceStore = ReturnType<typeof useRaceStore>

/** Real milliseconds until the running round ends at the current speed. */
export function msToRoundEnd(race: RaceStore): number {
  return Math.ceil((race.currentRace!.durationMs - race.elapsedMs()) / race.speed)
}

export function eventNames(): string[] {
  return analyticsLog.events.map((event) => event.name)
}
