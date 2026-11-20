<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PODIUM_SIZE } from '@/domain/constants'
import type { Placing, RoundResult } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BaseTable, { type TableColumn } from '@/shared/ui/BaseTable.vue'
import { useHorsesStore } from '@/stores/horses.store'

/**
 * R5 — one finished round: position (medals for the podium), horse and race time.
 * With `live`, the round is still running and `result` holds only the horses that have crossed
 * the line so far; it grows one row at a time and is replaced by the official result.
 */
const props = defineProps<{ result: RoundResult; live?: boolean; paused?: boolean }>()

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
  <article
    class="result"
    :class="{ 'result--live': live }"
    :data-testid="live ? 'result-live' : 'result-round'"
  >
    <header class="result__header">
      <h3 class="result__title">{{ lap }}</h3>
      <BaseBadge v-if="live" tone="live" pulse>{{ t('broadcast.live') }}</BaseBadge>
    </header>
    <BaseTable
      v-if="result.placings.length > 0"
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
          :horse-number="row.horseId"
        />
        <span v-else class="time">{{ raceTime(row.timeMs) }}</span>
      </template>
    </BaseTable>
    <!-- The round is still being run: this line stays until the official result replaces it. -->
    <p v-if="live" class="result__running" :class="{ 'result__running--paused': paused }">
      <span class="result__dots" aria-hidden="true"><span /><span /><span /></span>
      <span class="result__running-text">{{
        paused ? t('results.pausedLine') : t('results.inProgress')
      }}</span>
    </p>
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

// Live: each horse that crosses the line slides in as a new row; rows already there stay put.
.result--live :deep(tbody tr) {
  animation: row-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}

@keyframes row-in {
  from {
    background: color-mix(in srgb, var(--color-gold) 30%, transparent);
    opacity: 0;
    transform: translate3d(14px, 0, 0);
  }

  60% {
    opacity: 1;
  }
}

.result__running {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

// Three dots that rise in turn: the race is on.
.result__dots {
  display: inline-flex;
  gap: 4px;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-accent);
    animation: dot-bounce 900ms ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 150ms;
    }

    &:nth-child(3) {
      animation-delay: 300ms;
    }
  }
}

.result__running-text {
  animation: running-pulse 1400ms ease-in-out infinite;
}

@keyframes running-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
}

.result__running--paused .result__running-text {
  animation: none;
}

.result__running--paused .result__dots span {
  animation: none;
  background: var(--color-text-subtle);
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}
</style>
