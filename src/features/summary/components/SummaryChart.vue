<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { chartMaximum } from '@/domain/summary'
import type { HorseStats } from '@/domain/stats'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import BaseShortName from '@/shared/ui/BaseShortName.vue'
import { useHorsesStore } from '@/stores/horses.store'

/**
 * Wins and podiums of the best horses. A real table, so screen readers get the numbers; the bars
 * are a picture of the same figures (a light bar for podiums, a gold one in front for wins).
 */
const props = defineProps<{ standings: readonly HorseStats[] }>()

const { t } = useI18n()
const horsesStore = useHorsesStore()
const maximum = computed(() => chartMaximum(props.standings))
const share = (value: number) => `${(value / maximum.value) * 100}%`

const rows = computed(() =>
  props.standings.flatMap((stats) => {
    const horse = horsesStore.getHorse(stats.horseId)
    return horse ? [{ stats, horse }] : []
  }),
)
</script>

<template>
  <table class="chart" data-testid="summary-chart">
    <caption class="visually-hidden">
      {{
        t('summary.chart')
      }}
    </caption>
    <thead>
      <tr>
        <th scope="col">{{ t('summary.chartHorse') }}</th>
        <th scope="col">
          <span class="visually-hidden">{{ t('summary.chart') }}</span>
        </th>
        <th scope="col" class="chart__num">{{ t('summary.chartWins') }}</th>
        <th scope="col" class="chart__num">{{ t('summary.chartPodiums') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="{ stats, horse } in rows" :key="stats.horseId" data-testid="summary-chart-row">
        <th scope="row" class="chart__horse">
          <HorseRunner :color="horse.color.hex" :number="horse.id" :galloping="false" />
          <BaseShortName :name="horse.name" />
        </th>
        <td class="chart__bars" aria-hidden="true">
          <span class="chart__bar chart__bar--podium" :style="{ width: share(stats.podiums) }" />
          <span class="chart__bar chart__bar--win" :style="{ width: share(stats.wins) }" />
        </td>
        <td class="chart__num">{{ stats.wins }}</td>
        <td class="chart__num">{{ stats.podiums }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
.chart {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.chart th,
.chart td {
  padding: var(--space-1) var(--space-2);
  text-align: start;
}

.chart thead th {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.chart__horse {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;

  :deep(.runner) {
    width: 2rem;
    height: auto;
    flex-shrink: 0;
  }
}

.chart__bars {
  position: relative;
  width: 100%;
  min-width: 2.5rem;
}

.chart__bar {
  position: absolute;
  inset-block: 50% auto;
  height: 14px;
  border-radius: var(--radius-pill);
  transform: translateY(-50%);
  // The bars grow in once, when the dialog opens.
  animation: bar-grow 700ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transform-origin: left center;
}

.chart__bar--podium {
  background: color-mix(in srgb, var(--color-text-muted) 45%, transparent);
}

.chart__bar--win {
  background: var(--color-gold);
  animation-delay: 150ms;
}

.chart__num {
  width: 3.25rem;
  font-variant-numeric: tabular-nums;
  text-align: end !important;
}

@keyframes bar-grow {
  from {
    clip-path: inset(0 100% 0 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chart__bar {
    animation: none;
  }
}
</style>
