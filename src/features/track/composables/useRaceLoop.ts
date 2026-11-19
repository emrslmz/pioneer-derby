import { storeToRefs } from 'pinia'
import { nextTick, watch } from 'vue'
import { progressAt } from '@/domain/race-engine'
import type { SpeedProfile } from '@/domain/types'
import { useAnimationFrame } from '@/shared/composables/useAnimationFrame'
import { useRaceStore } from '@/stores/race.store'

/**
 * The race animation loop (R6, X10, ADR 0002 / 0005).
 *
 * Every frame: read race time from the store clock (`elapsedMs()`, no store write), compute each
 * horse's progress with the pure `progressAt`, and hand it to `paint`. Painting writes
 * `transform` straight to the DOM, so 60 fps never goes through Pinia or Vue re-rendering.
 */
export function useRaceLoop(paint: (profile: SpeedProfile, progress: number) => void) {
  const race = useRaceStore()
  const { isClockRunning, currentRace, status } = storeToRefs(race)

  function frame(now?: number) {
    const profiles = currentRace.value?.profiles ?? []
    const elapsed = race.elapsedMs(now)
    for (const profile of profiles) paint(profile, progressAt(profile, elapsed))
  }

  useAnimationFrame(frame, isClockRunning)

  // When the clock is stopped (ready, paused, intermission, finished) paint the frozen frame once,
  // after the DOM for a new line-up exists.
  watch(
    [isClockRunning, currentRace, status],
    async () => {
      await nextTick()
      frame()
    },
    { immediate: true },
  )

  return { repaint: () => frame() }
}
