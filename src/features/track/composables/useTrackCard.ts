import { storeToRefs } from 'pinia'
import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRaceStore } from '@/stores/race.store'

/**
 * The words on the track's controls and cards, from the race status: the card over the picture
 * when nothing is moving, and the label of the play button in the player bar.
 */
export function useTrackCard(lap: Readonly<Ref<string>>) {
  const { t } = useI18n()
  const { status, isBetweenRounds } = storeToRefs(useRaceStore())

  /** Idle, ready or paused mid-round: eyebrow, title and how to continue. Null while it runs. */
  const overlay = computed(() => {
    switch (status.value) {
      case 'idle':
        return { eyebrow: '', title: t('track.idleTitle'), hint: t('track.idleHint') }
      case 'ready':
        return { eyebrow: t('track.readyEyebrow'), title: lap.value, hint: t('track.readyHint') }
      case 'paused':
        // Paused between rounds: the result board stays, with its own Resume button.
        return isBetweenRounds.value
          ? null
          : { eyebrow: t('track.pausedEyebrow'), title: lap.value, hint: t('track.pausedHint') }
      default:
        return null
    }
  })

  /** The player bar's play button: the same action as the header's Start / Pause. */
  const play = computed(() => {
    switch (status.value) {
      case 'running':
        return { icon: 'pause' as const, label: t('actions.pause') }
      case 'intermission':
        return { icon: 'play' as const, label: t('actions.nextRound') }
      case 'paused':
        return { icon: 'play' as const, label: t('actions.resume') }
      default:
        return { icon: 'play' as const, label: t('actions.start') }
    }
  })

  return { overlay, play }
}
