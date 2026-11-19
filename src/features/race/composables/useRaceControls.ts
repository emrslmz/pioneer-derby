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
  const { status, canGenerate, canToggle, speed, currentRound, currentRoundIndex } =
    storeToRefs(race)
  const { roundCount } = storeToRefs(useScheduleStore())
  const { t } = useI18n()

  const isRunning = computed(() => status.value === 'running' || status.value === 'intermission')

  const toggleLabel = computed(() => {
    if (status.value === 'paused') return t('actions.resume')
    return isRunning.value ? t('actions.pause') : t('actions.start')
  })
  const toggleIcon = computed<IconName>(() => (isRunning.value ? 'pause' : 'play'))

  const statusLabel = computed(() => t(`status.${status.value}`))
  const statusTone = computed(() => STATUS_TONES[status.value])

  const speedOptions = RACE_SPEEDS.map((value) => ({
    value,
    label: t('speed.value', { speed: value }),
  }))

  return {
    status,
    speed,
    canGenerate,
    canToggle,
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
    setSpeed: (value: RaceSpeed) => race.setSpeed(value),
  }
}
