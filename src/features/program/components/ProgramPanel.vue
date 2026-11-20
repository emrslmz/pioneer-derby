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
const { currentRoundIndex, status, completedResults, canGenerate, seed } = storeToRefs(race)
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
    data-tour="program"
    data-testid="program-panel"
  >
    <template v-if="rounds.length > 0" #actions>
      <BaseButton
        size="sm"
        icon="generate"
        :disabled="!canGenerate"
        :aria-label="t('changeProgram.button')"
        :title="canGenerate ? t('changeProgram.button') : t('changeProgram.locked')"
        data-testid="change-program-button"
        @click="emit('change')"
      >
        <!-- Short: the panel header is narrow. The full name is the accessible name (WCAG 2.5.3). -->
        {{ t('changeProgram.short') }}
      </BaseButton>
    </template>
    <div v-if="rounds.length > 0" ref="list" class="program">
      <!-- A short "drawing the lots" moment: a veil that fades by itself (CSS only, never blocks
           the pointer or the tests), after which the rounds have dealt in. -->
      <div :key="seed ?? 0" class="loading" aria-hidden="true" data-testid="program-loading">
        <span class="loading__spinner" />
        <span class="loading__text">{{ t('program.drawing') }}</span>
      </div>
      <RoundTable
        v-for="round in rounds"
        :key="`${seed}-${round.index}`"
        :round="round"
        :state="roundState(round.index, currentRoundIndex, status, completedResults.length)"
      />
    </div>
    <BaseEmptyState v-else :description="t('empty.program')">
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

<style scoped lang="scss">
.program {
  position: relative;
}

.loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-8);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  pointer-events: none;
  animation: veil 1000ms ease forwards;
}

.loading__spinner {
  width: 34px;
  height: 34px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

.loading__text {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@keyframes veil {
  0%,
  65% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading {
    display: none;
  }
}
</style>
