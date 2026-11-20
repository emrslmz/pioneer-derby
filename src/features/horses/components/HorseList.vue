<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Horse, HorseId } from '@/domain/types'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BaseShortName from '@/shared/ui/BaseShortName.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import BaseTable, { type TableColumn, type TableSort } from '@/shared/ui/BaseTable.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { analytics } from '@/shared/analytics'
import ConditionBar from './ConditionBar.vue'
import HorseStatsDrawer from './HorseStatsDrawer.vue'

/** R2 — "Horse List (1-20)": number, name, condition and colour, sortable, with live lane badges. */
const { t } = useI18n()
const { horses } = storeToRefs(useHorsesStore())
const { currentRound, status } = storeToRefs(useRaceStore())

const sort = ref<TableSort>({ key: 'number', direction: 'ascending' })

const statsOpen = ref(false)
const statsHorseId = ref<HorseId | null>(null)

function openStats(horse: Horse) {
  statsHorseId.value = horse.id
  statsOpen.value = true
  analytics.track('horse_stats_opened', { horseId: horse.id })
}

/** Lane of each horse in the current round (only once a program exists). */
const lanes = computed(() => {
  const round = status.value === 'idle' ? null : currentRound.value
  return new Map<HorseId, number>(round?.horseIds.map((id, index) => [id, index + 1]) ?? [])
})

const rows = computed(() => {
  const { key, direction } = sort.value
  const sign = direction === 'ascending' ? 1 : -1
  const pick = (horse: Horse) => (key === 'condition' ? horse.condition : horse.id)
  return [...horses.value].sort((a, b) => sign * (pick(a) - pick(b)) || a.id - b.id)
})

const columns = computed<TableColumn<Horse>[]>(() => [
  { key: 'number', label: t('horses.number'), align: 'end', width: '2.75rem', sortable: true },
  { key: 'name', label: t('horses.name') },
  { key: 'condition', label: t('horses.condition'), width: '5.5rem', sortable: true },
  { key: 'color', label: t('horses.color'), width: '6rem' },
])

function onSort(key: string) {
  if (sort.value.key === key) {
    sort.value = {
      key,
      direction: sort.value.direction === 'ascending' ? 'descending' : 'ascending',
    }
  } else {
    // Best condition first is the useful default; numbers start at 1.
    sort.value = { key, direction: key === 'condition' ? 'descending' : 'ascending' }
  }
}
</script>

<template>
  <BasePanel
    class="horse-list"
    tone="horses"
    icon="horses"
    :title="t('panels.horses', { count: horses.length })"
    scroll
    data-testid="horses-panel"
  >
    <BaseTable
      :columns="columns"
      :rows="rows"
      :row-key="(horse) => horse.id"
      :caption="t('horses.caption', { count: horses.length })"
      hide-caption
      :sort="sort"
      @sort="onSort"
    >
      <template #cell="{ row, column }">
        <span v-if="column.key === 'number'" class="number">{{ row.id }}</span>
        <span v-else-if="column.key === 'name'" class="name">
          <button type="button" class="name__text" data-testid="horse-name" @click="openStats(row)">
            <BaseShortName :name="row.name" />
            <span class="visually-hidden">{{ t('stats.openSuffix') }}</span>
          </button>
          <span
            v-if="lanes.has(row.id)"
            class="name__lane"
            :title="t('horses.inRace', { lane: lanes.get(row.id) })"
            data-testid="lane-badge"
          >
            <span aria-hidden="true">{{ t('horses.laneShort', { lane: lanes.get(row.id) }) }}</span>
            <span class="visually-hidden">{{ t('horses.lane', { lane: lanes.get(row.id) }) }}</span>
          </span>
        </span>
        <ConditionBar v-else-if="column.key === 'condition'" :value="row.condition" />
        <BaseColorSwatch v-else :hex="row.color.hex" :label="t(`colors.${row.color.key}`)" />
      </template>
    </BaseTable>
    <HorseStatsDrawer v-model:open="statsOpen" :horse-id="statsHorseId" />
  </BasePanel>
</template>

<style scoped lang="scss">
.number {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  white-space: nowrap;
}

.name__text {
  position: relative;
  // The lane badge never shrinks; a long name truncates instead.
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: start;
  text-decoration: underline dotted var(--color-text-subtle);
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: var(--color-accent-text);
    text-decoration-color: currentColor;
  }
}

.name__lane {
  position: relative;
  flex-shrink: 0;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
</style>
