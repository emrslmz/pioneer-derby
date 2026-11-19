import { computed, shallowRef, type Ref } from 'vue'
import {
  buildCommentary,
  commentaryIndexAt,
  isPhotoFinish,
  standingsAt,
  type CommentaryEvent,
} from '@/domain/broadcast'
import type { HorseId, RoundRace } from '@/domain/types'

/**
 * X13 — live standings and commentary for the round on screen.
 *
 * `update(elapsed)` is called every animation frame, but the reactive refs only change when the
 * order of the field or the commentary line actually changes — a handful of updates per round
 * instead of 60 per second (X10).
 */
export function useBroadcast(race: Readonly<Ref<RoundRace | null>>) {
  const standings = shallowRef<readonly HorseId[]>([])
  const lineIndex = shallowRef(-1)

  const commentary = computed<readonly CommentaryEvent[]>(() =>
    race.value ? buildCommentary(race.value) : [],
  )
  const photoFinish = computed(() => (race.value ? isPhotoFinish(race.value) : false))
  const line = computed(() => commentary.value[lineIndex.value] ?? null)

  function update(elapsedMs: number) {
    const profiles = race.value?.profiles ?? []
    const next = standingsAt(profiles, elapsedMs)
    if (next.join() !== standings.value.join()) standings.value = next

    const index = commentaryIndexAt(commentary.value, elapsedMs)
    if (index !== lineIndex.value) lineIndex.value = index
  }

  return { standings, line, photoFinish, update }
}
