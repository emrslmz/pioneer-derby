import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RACE_SPEEDS } from '@/domain/constants'
import type { RaceSpeed, RaceStatus } from '@/domain/types'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import type { IconName } from '@/shared/ui/icons'

type BadgeTone = 'neutral' | 'accent' | 'live' | 'success' | 'warning' | 'info'

const STATUS_TONES: Record<RaceStatus, BadgeTone> = {
  idle: 'neutral',
  ready: 'accent',
  running: 'live',
  paused: 'warning',
  intermission: 'info',
  finished: 'success',
}

/** Everything the header, shortcuts and mobile bar need to drive the race (R3, R4). */
export function useRaceControls() {
  const race = useRaceStore()
  const {
    status,
    canGenerate,
    canToggle,
    canReplay,
    speed,
    currentRound,
    currentRoundIndex,
    seed,
  } = storeToRefs(race)
  const { roundCount } = storeToRefs(useScheduleStore())
  const { t, locale } = useI18n()

  const isRunning = computed(() => status.value === 'running' || status.value === 'intermission')

  /** The big primary button: Start / Pause / Resume, and Replay once the program has finished. */
  const isReplay = computed(() => status.value === 'finished')
  const canPrimary = computed(() => canToggle.value || (isReplay.value && canReplay.value))

  const toggleLabel = computed(() => {
    if (isReplay.value) return t('actions.replay')
    if (status.value === 'paused') return t('actions.resume')
    return isRunning.value ? t('actions.pause') : t('actions.start')
  })
  const toggleIcon = computed<IconName>(() => {
    if (isReplay.value) return 'replay'
    return isRunning.value ? 'pause' : 'play'
  })

  const statusLabel = computed(() => t(`status.${status.value}`))
  const statusTone = computed(() => STATUS_TONES[status.value])

  // Computed so labels follow the language: "0.5×" / "0,5×".
  const speedOptions = computed(() => {
    const number = new Intl.NumberFormat(locale.value)
    return RACE_SPEEDS.map((value) => ({
      value,
      label: t('speed.value', { speed: number.format(value) }),
    }))
  })

  return {
    status,
    speed,
    canGenerate,
    canToggle,
    canReplay,
    canPrimary,
    isReplay,
    seed,
    isRunning,
    currentRound,
    currentRoundIndex,
    roundCount,
    toggleLabel,
    toggleIcon,
    statusLabel,
    statusTone,
    speedOptions,
    generate: () => race.generateProgram(),
    toggle: () => race.toggle(),
    replay: () => race.replay(),
    /** Primary action: replay when finished, otherwise start / pause / resume. */
    primary: () => (status.value === 'finished' ? race.replay() : race.toggle()),
    setSpeed: (value: RaceSpeed) => race.setSpeed(value),
  }
}
