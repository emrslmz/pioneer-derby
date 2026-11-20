<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/i18n/useLocale'
import type { RoundResult } from '@/domain/types'
import { useAnimationFrame } from '@/shared/composables/useAnimationFrame'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { scrollWithinContainer } from '@/shared/utils/scroll'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseEmptyState from '@/shared/ui/BaseEmptyState.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import RoundResultTable from './RoundResultTable.vue'

/**
 * R5 — results appear one round at a time, only after the round has finished.
 * A polite live region announces each winner; the tables themselves are not live, so screen
 * readers don't read ten rows aloud on every update.
 */
const { t } = useI18n()
const { lapLabel } = useLocale()
const emit = defineEmits<{ summary: [] }>()
const race = useRaceStore()
const { completedResults, currentRace, status, isClockRunning } = storeToRefs(race)
const horsesStore = useHorsesStore()
const reducedMotion = useReducedMotion()
const list = ref<HTMLElement | null>(null)

const announcement = computed(() => {
  const latest = completedResults.value.at(-1)
  const winner = latest?.placings[0]
  if (!latest || !winner) return ''
  return t('results.announce', {
    lap: lapLabel(latest.roundIndex, latest.distance),
    name: horsesStore.getHorse(winner.horseId)?.name ?? '',
  })
})

// ── Live finishing order ────────────────────────────────────────────────────
// While a round runs, the horses that have crossed the line appear here one by one, in finishing
// order. The count is read from the race clock a frame at a time, but it only changes (and Vue only
// re-renders) when a horse actually finishes, about ten times a round — never per frame (X10).
const finished = ref(0)
const racing = computed(() => status.value === 'running' || status.value === 'paused')

useAnimationFrame(() => {
  const placings = currentRace.value?.result.placings
  if (!placings) return
  const elapsed = race.elapsedMs()
  let count = finished.value
  while (count < placings.length && placings[count]!.timeMs <= elapsed) count++
  if (count !== finished.value) finished.value = count
}, isClockRunning)

// A new round, a new program or a replay starts the count again.
watch(status, (next) => {
  if (next === 'idle' || next === 'ready') finished.value = 0
})
watch(
  () => currentRace.value?.round.index,
  () => (finished.value = 0),
)

const live = computed<RoundResult | null>(() => {
  const race = currentRace.value
  if (!racing.value || !race) return null
  return {
    roundIndex: race.round.index,
    distance: race.round.distance,
    placings: race.result.placings.slice(0, finished.value),
  }
})

// The block appears when a round starts and grows with every horse that finishes.
watch([finished, () => live.value?.roundIndex], async () => {
  if (!live.value) return
  await nextTick()
  const block = list.value?.querySelector<HTMLElement>('[data-testid="result-live"]')
  if (block) scrollWithinContainer(block, !reducedMotion.value)
})

watch(
  () => completedResults.value.length,
  async (count, previous) => {
    if (count <= previous) return
    await nextTick()
    const rounds = list.value?.querySelectorAll<HTMLElement>('[data-testid="result-round"]')
    const latest = rounds?.[rounds.length - 1]
    if (latest) scrollWithinContainer(latest, !reducedMotion.value)
  },
)
</script>

<template>
  <BasePanel
    tone="results"
    icon="results"
    :title="t('panels.results')"
    scroll
    data-tour="results"
    data-testid="results-panel"
  >
    <template v-if="status === 'finished'" #actions>
      <BaseButton size="sm" icon="results" data-testid="summary-open" @click="emit('summary')">
        {{ t('summary.open') }}
      </BaseButton>
    </template>
    <p class="visually-hidden" aria-live="polite" data-testid="results-announcer">
      {{ announcement }}
    </p>
    <div v-if="completedResults.length > 0 || live" ref="list">
      <RoundResultTable
        v-for="result in completedResults"
        :key="result.roundIndex"
        :result="result"
      />
      <RoundResultTable v-if="live" key="live" :result="live" live :paused="status === 'paused'" />
    </div>
    <BaseEmptyState v-else :description="t('empty.results')" />
  </BasePanel>
</template>

<style scoped lang="scss"></style>
