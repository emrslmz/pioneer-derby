<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceStatus } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'

/**
 * Screen-reader narration of the race (X8): a polite live region that speaks
 * when a program is ready, a round starts, the race pauses or ends.
 */
const { t } = useI18n()
const { lapLabel } = useLocale()
const { status, currentRound } = storeToRefs(useRaceStore())
const { roundCount } = storeToRefs(useScheduleStore())

const message = ref('')

function lap(): string {
  const round = currentRound.value
  return round ? lapLabel(round.index, round.distance) : ''
}

function describe(next: RaceStatus, previous: RaceStatus | undefined): string {
  switch (next) {
    case 'ready':
      return t('announce.generated', { rounds: roundCount.value })
    case 'running':
      // The commentary ticker calls the start of each round ("And they're off…").
      return previous === 'paused' ? t('announce.resumed') : ''
    case 'paused':
      return t('announce.paused')
    case 'intermission':
      return t('announce.intermission', { lap: lap() })
    case 'finished':
      return t('announce.finished')
    default:
      return ''
  }
}

watch(status, (next, previous) => {
  message.value = describe(next, previous)
})
</script>

<template>
  <p class="visually-hidden" role="status" aria-live="polite" data-testid="announcer">
    {{ message }}
  </p>
</template>
