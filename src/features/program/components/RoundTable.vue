<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Round } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BaseTable, { type TableColumn } from '@/shared/ui/BaseTable.vue'
import { useHorsesStore } from '@/stores/horses.store'
import type { RoundState } from '../roundState'

/**
 * One round of the program: the lane draw. The example labels this column "Position", but nothing
 * has been raced yet — it is the lane order, so we call it Lane.
 */
const props = defineProps<{ round: Round; state: RoundState }>()

const { t } = useI18n()
const { lapLabel } = useLocale()
const horsesStore = useHorsesStore()

interface LaneRow {
  lane: number
  horseId: number
}

const rows = computed<LaneRow[]>(() =>
  props.round.horseIds.map((horseId, index) => ({ lane: index + 1, horseId })),
)

const columns = computed<TableColumn<LaneRow>[]>(() => [
  { key: 'lane', label: t('program.lane'), align: 'center', width: '4rem' },
  { key: 'name', label: t('program.name') },
])

const lap = computed(() => lapLabel(props.round.index, props.round.distance))
const tones = { done: 'success', live: 'live', next: 'accent', upcoming: 'neutral' } as const
</script>

<template>
  <article
    class="round"
    :class="`round--${state}`"
    :data-state="state"
    :style="{ '--i': round.index }"
    :aria-current="state === 'live' || state === 'next' ? 'step' : undefined"
    data-testid="program-round"
  >
    <header class="round__header">
      <h3 class="round__title">{{ lap }}</h3>
      <BaseBadge :tone="tones[state]" :pulse="state === 'live'">
        {{ t(`program.status.${state}`) }}
      </BaseBadge>
    </header>
    <BaseTable
      :columns="columns"
      :rows="rows"
      :row-key="(row) => row.lane"
      :caption="t('program.caption', { lap })"
      hide-caption
    >
      <template #cell="{ row, column }">
        <span v-if="column.key === 'lane'" class="lane">{{ row.lane }}</span>
        <BaseColorSwatch
          v-else
          :hex="horsesStore.getHorse(row.horseId)?.color.hex ?? 'transparent'"
          :label="horsesStore.getHorse(row.horseId)?.name ?? ''"
        />
      </template>
    </BaseTable>
  </article>
</template>

<style scoped lang="scss">
.round {
  border-bottom: 1px solid var(--color-border);
  scroll-margin-top: var(--space-2);
  // A fresh program deals its rounds in one after another. `backwards` only holds the start
  // frame during the delay, so the settled block is never touched; reduced motion skips it.
  animation: round-in 460ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  animation-delay: calc(var(--i, 0) * 80ms);
}

@media (prefers-reduced-motion: reduce) {
  .round {
    // The global rule only shortens animations; the staggered delay would still hide the blocks.
    animation: none;
  }
}

@keyframes round-in {
  from {
    opacity: 0;
    transform: translate3d(18px, 0, 0) scale(0.98);
  }

  60% {
    opacity: 1;
  }
}

.round__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-raised);
}

.round__title {
  font-size: var(--font-size-md);
  letter-spacing: 0.03em;
}

.round :deep(th) {
  // Only the round header sticks; column headers scroll with their round.
  position: static;
}

.round--live,
.round--next {
  box-shadow: inset 3px 0 0 var(--color-accent);

  .round__header {
    background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-raised));
  }
}

// Finished rounds recede without opacity, which would break text contrast.
.round--done :deep(td) {
  color: var(--color-text-muted);
}

.round--done :deep(.swatch__dot) {
  filter: saturate(0.35);
}

.lane {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-weight: 700;
}
</style>
