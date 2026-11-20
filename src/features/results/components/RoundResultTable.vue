<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PODIUM_SIZE } from '@/domain/constants'
import type { Placing, RoundResult } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BaseTable, { type TableColumn } from '@/shared/ui/BaseTable.vue'
import { useHorsesStore } from '@/stores/horses.store'

/** R5 — one finished round: position (medals for the podium), horse and race time. */
const props = defineProps<{ result: RoundResult }>()

const { t } = useI18n()
const { lapLabel, raceTime } = useLocale()
const horsesStore = useHorsesStore()

const lap = computed(() => lapLabel(props.result.roundIndex, props.result.distance))

const columns = computed<TableColumn<Placing>[]>(() => [
  { key: 'position', label: t('results.position'), align: 'center', width: '3.5rem' },
  { key: 'name', label: t('results.name') },
  { key: 'time', label: t('results.time'), align: 'end', width: '4.25rem' },
])

const isMedal = (position: number) => position <= PODIUM_SIZE
</script>

<template>
  <article class="result" data-testid="result-round">
    <header class="result__header">
      <h3 class="result__title">{{ lap }}</h3>
    </header>
    <BaseTable
      :columns="columns"
      :rows="result.placings"
      :row-key="(placing) => placing.horseId"
      :caption="t('results.caption', { lap })"
      hide-caption
    >
      <template #cell="{ row, column }">
        <span
          v-if="column.key === 'position'"
          class="position"
          :class="isMedal(row.position) ? ['position--medal', `position--${row.position}`] : []"
        >
          <span v-if="isMedal(row.position)" class="visually-hidden">
            {{ t(`results.medal.${row.position}`) }}
          </span>
          {{ row.position }}
        </span>
        <BaseColorSwatch
          v-else-if="column.key === 'name'"
          abbreviate
          :hex="horsesStore.getHorse(row.horseId)?.color.hex ?? 'transparent'"
          :label="horsesStore.getHorse(row.horseId)?.name ?? ''"
        />
        <span v-else class="time">{{ raceTime(row.timeMs) }}</span>
      </template>
    </BaseTable>
  </article>
</template>

<style scoped lang="scss">
.result {
  border-bottom: 1px solid var(--color-border);
  animation: result-in 560ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.result__header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-raised);
}

.result__title {
  font-size: var(--font-size-md);
  letter-spacing: 0.03em;
}

.result :deep(th) {
  // Only the round header sticks; column headers scroll with their round.
  position: static;
}

.position {
  display: inline-grid;
  place-items: center;
  min-width: 1.6rem;
  height: 1.6rem;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-weight: 700;
}

.position--medal {
  border-radius: 50%;
  color: #1a1a1a;
}

.position--1 {
  background: var(--color-gold);
}

.position--2 {
  background: var(--color-silver);
}

.position--3 {
  background: var(--color-bronze);
}

.time {
  color: var(--color-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

// A finished round slides in and its background fades from a soft gold, like a score update.
@keyframes result-in {
  from {
    background: color-mix(in srgb, var(--color-gold) 22%, transparent);
    opacity: 0;
    transform: translate3d(18px, 0, 0);
  }

  50% {
    opacity: 1;
  }
}
</style>
