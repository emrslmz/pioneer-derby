<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { scrollWithinContainer } from '@/shared/utils/scroll'
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
const { completedResults } = storeToRefs(useRaceStore())
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
    data-testid="results-panel"
  >
    <p class="visually-hidden" aria-live="polite" data-testid="results-announcer">
      {{ announcement }}
    </p>
    <div v-if="completedResults.length > 0" ref="list">
      <RoundResultTable
        v-for="result in completedResults"
        :key="result.roundIndex"
        :result="result"
      />
    </div>
    <BaseEmptyState
      v-else
      icon="results"
      :title="t('empty.resultsTitle')"
      :description="t('empty.results')"
      :skeleton="4"
    />
  </BasePanel>
</template>

<style scoped lang="scss"></style>
