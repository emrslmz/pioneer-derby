import { storeToRefs } from 'pinia'
import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Round } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import type { useBroadcast } from './useBroadcast'

/** The commentary line in words (translated), and what screen readers hear of it. */
export function useCommentary(
  line: ReturnType<typeof useBroadcast>['line'],
  round: Readonly<Ref<Round | null | undefined>>,
) {
  const { t } = useI18n()
  const { lapLabel, distance } = useLocale()
  const { status } = storeToRefs(useRaceStore())
  const horsesStore = useHorsesStore()

  const commentaryText = computed(() => {
    const event = line.value
    const current = round.value
    // Nothing is said before the gates open.
    if (!event || !current || status.value === 'idle' || status.value === 'ready') return ''
    const name = event.horseId === null ? '' : (horsesStore.getHorse(event.horseId)?.name ?? '')
    return t(`commentary.${event.code}`, {
      lap: lapLabel(current.index, current.distance),
      name,
      distance: distance(current.distance / 2),
    })
  })
  // The results panel already announces the winner; don't say it twice.
  const spokenCommentary = computed(() =>
    line.value?.code === 'WINNER' ? '' : commentaryText.value,
  )

  return { commentaryText, spokenCommentary }
}
