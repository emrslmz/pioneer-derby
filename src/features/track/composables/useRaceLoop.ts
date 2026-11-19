import { nextTick, watch, type Ref } from 'vue'
import { progressAt } from '@/domain/race-engine'
import type { RoundRace, SpeedProfile } from '@/domain/types'
import { useAnimationFrame } from '@/shared/composables/useAnimationFrame'

export interface RaceLoopOptions {
  /** The round on screen (the running round, or the one that just finished). */
  race: Readonly<Ref<RoundRace | null>>
  /** Race time to draw at `now` — reads the store's checkpoint clock, never writes it. */
  clock: (now?: number) => number
  /** Whether the clock is moving; the loop only runs then. */
  running: Readonly<Ref<boolean>>
  /** Per horse, per frame. Must only touch the DOM (transform), not reactive state. */
  paint: (profile: SpeedProfile, progress: number) => void
  /** Once per frame, after painting — e.g. to update standings when they actually change. */
  onFrame?: (elapsedMs: number) => void
  /** Extra sources that require a repaint when they change while the clock is stopped. */
  repaintOn?: readonly Readonly<Ref<unknown>>[]
}

/**
 * The race animation loop (R6, X10, ADR 0002 / 0005 / 0008).
 *
 * Every frame: read race time from the clock, compute each horse's progress with the pure
 * `progressAt`, and hand it to `paint`. 60 fps never goes through Pinia or Vue re-rendering.
 */
export function useRaceLoop({
  race,
  clock,
  running,
  paint,
  onFrame,
  repaintOn = [],
}: RaceLoopOptions) {
  function frame(now?: number) {
    const elapsed = clock(now)
    for (const profile of race.value?.profiles ?? []) paint(profile, progressAt(profile, elapsed))
    onFrame?.(elapsed)
  }

  useAnimationFrame(frame, running)

  // When the clock is stopped, paint the frozen frame once, after the DOM for a new line-up exists.
  watch(
    [running, race, ...repaintOn],
    async () => {
      await nextTick()
      frame()
    },
    { immediate: true },
  )

  return { repaint: () => frame() }
}
