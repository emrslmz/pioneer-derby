import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import { roundRaceForSeed } from '@/domain/game'
import type { Horse, RoundRace, SpeedProfile } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'

export interface TrackLane {
  lane: number
  profile: SpeedProfile | undefined
  horse: Horse | undefined
}

/**
 * Which round the track shows, and what is derived from it: the running round, or, between rounds
 * and at the end, the one that has just finished with its result on screen.
 */
export function useDisplayedRound() {
  const { t } = useI18n()
  const { lapLabel } = useLocale()
  const race = useRaceStore()
  const { status, currentRace, currentRound, currentRoundIndex, seed, isBetweenRounds } =
    storeToRefs(race)
  const { rounds } = storeToRefs(useScheduleStore())
  const horsesStore = useHorsesStore()

  /** A finished round is on screen: between rounds (even if paused there) or at the very end. */
  const showingFinished = computed(() => status.value === 'finished' || isBetweenRounds.value)

  const displayRace = computed<RoundRace | null>(() => {
    if (!showingFinished.value || status.value === 'finished') return currentRace.value
    const finished = rounds.value[currentRoundIndex.value - 1]
    return finished && seed.value !== null
      ? roundRaceForSeed(finished, horsesStore.horses, seed.value)
      : null
  })

  const displayRound = computed(() => displayRace.value?.round ?? currentRound.value)
  const lap = computed(() =>
    displayRound.value ? lapLabel(displayRound.value.index, displayRound.value.distance) : '',
  )
  const nextLap = computed(() =>
    showingFinished.value && status.value !== 'finished' && currentRound.value
      ? t('result.next', { lap: lapLabel(currentRound.value.index, currentRound.value.distance) })
      : '',
  )

  const lanes = computed<TrackLane[]>(() =>
    Array.from({ length: HORSES_PER_ROUND }, (_, index) => {
      const profile = displayRace.value?.profiles[index]
      const horse = profile ? horsesStore.getHorse(profile.horseId) : undefined
      return { lane: index + 1, profile, horse }
    }),
  )

  /** 1-based lane of the winner, once the round is over. */
  const winnerLane = computed(() => {
    if (!showingFinished.value) return null
    const id = displayRace.value?.result.placings[0]?.horseId
    if (id === undefined) return null
    return (displayRace.value?.round.horseIds.indexOf(id) ?? -1) + 1 || null
  })

  /** Leader's distance to the line, shown while a round is under way. */
  const showToGo = computed(
    () => !showingFinished.value && (status.value === 'running' || status.value === 'paused'),
  )

  return { showingFinished, displayRace, displayRound, lap, nextLap, lanes, winnerLane, showToGo }
}
