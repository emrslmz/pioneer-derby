<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { scrollWithinContainer } from '@/shared/utils/scroll'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseEmptyState from '@/shared/ui/BaseEmptyState.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { roundState } from '../roundState'
import RoundTable from './RoundTable.vue'

/** R3 — the 6-round program. The current round is highlighted and scrolled into view. */
const { t } = useI18n()
const { rounds } = storeToRefs(useScheduleStore())
const race = useRaceStore()
const { currentRoundIndex, status, completedResults, canGenerate } = storeToRefs(race)
const emit = defineEmits<{ change: [] }>()
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
    <template v-if="rounds.length > 0" #actions>
      <BaseButton
        size="sm"
        icon="generate"
        :disabled="!canGenerate"
        :title="canGenerate ? undefined : t('changeProgram.locked')"
        data-testid="change-program-button"
        @click="emit('change')"
      >
        {{ t('changeProgram.button') }}
      </BaseButton>
    </template>
    <div v-if="rounds.length > 0" ref="list">
      <RoundTable
        v-for="round in rounds"
        :key="round.index"
        :round="round"
        :state="roundState(round.index, currentRoundIndex, status, completedResults.length)"
      />
    </div>
    <BaseEmptyState
      v-else
      icon="program"
      :title="t('empty.programTitle')"
      :description="t('empty.program')"
      :skeleton="4"
    >
      <BaseButton
        variant="primary"
        icon="generate"
        shortcut="G"
        data-testid="generate-button"
        @click="race.generateProgram()"
      >
        {{ t('actions.generate') }}
      </BaseButton>
    </BaseEmptyState>
  </BasePanel>
</template>
