<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { scrollWithinContainer } from '@/shared/utils/scroll'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { roundState } from '../roundState'
import RoundTable from './RoundTable.vue'

/** R3 — the 6-round program. The current round is highlighted and scrolled into view. */
const { t } = useI18n()
const { rounds } = storeToRefs(useScheduleStore())
const { currentRoundIndex, status, completedResults } = storeToRefs(useRaceStore())
const reducedMotion = useReducedMotion()
const list = ref<HTMLElement | null>(null)

watch(currentRoundIndex, async () => {
  await nextTick()
  const current = list.value?.querySelector<HTMLElement>('[aria-current="step"]')
  if (current) scrollWithinContainer(current, !reducedMotion.value)
})
</script>

<template>
  <BasePanel
    tone="program"
    icon="program"
    :title="t('panels.program')"
    scroll
    data-testid="program-panel"
  >
    <div v-if="rounds.length > 0" ref="list">
      <RoundTable
        v-for="round in rounds"
        :key="round.index"
        :round="round"
        :state="roundState(round.index, currentRoundIndex, status, completedResults.length)"
      />
    </div>
    <p v-else class="empty">{{ t('empty.program') }}</p>
  </BasePanel>
</template>

<style scoped lang="scss">
.empty {
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}
</style>
