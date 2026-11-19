<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Horse, HorseId } from '@/domain/types'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import BaseTable, { type TableColumn, type TableSort } from '@/shared/ui/BaseTable.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import ConditionBar from './ConditionBar.vue'

/** R2 — "Horse List (1-20)": number, name, condition and colour, sortable, with live lane badges. */
const { t } = useI18n()
const { horses } = storeToRefs(useHorsesStore())
const { currentRound, status } = storeToRefs(useRaceStore())

const sort = ref<TableSort>({ key: 'number', direction: 'ascending' })

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
  { key: 'number', label: t('horses.number'), align: 'end', width: '3.25rem', sortable: true },
  { key: 'name', label: t('horses.name') },
  { key: 'condition', label: t('horses.condition'), width: '7.5rem', sortable: true },
  { key: 'color', label: t('horses.color'), width: 'var(--color-column, 6.5rem)' },
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
          <span class="name__text">{{ row.name }}</span>
          <span
            v-if="lanes.has(row.id)"
            class="name__lane"
            :title="t('horses.inRace', { lane: lanes.get(row.id) })"
            data-testid="lane-badge"
          >
            {{ t('horses.lane', { lane: lanes.get(row.id) }) }}
          </span>
        </span>
        <ConditionBar v-else-if="column.key === 'condition'" :value="row.condition" />
        <BaseColorSwatch
          v-else
          class="color"
          :hex="row.color.hex"
          :label="t(`colors.${row.color.key}`)"
        />
      </template>
    </BaseTable>
  </BasePanel>
</template>

<style scoped lang="scss">
// Narrow panel: keep the colour dot, hide the colour name visually (still read by screen readers).
.horse-list {
  container-type: inline-size;
}

@container (max-width: 360px) {
  .horse-list :deep(table) {
    --color-column: 2.75rem;
  }

  .color :deep(.swatch__label) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
}

.number {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
}

.name__text {
  font-weight: 600;
}

.name__lane {
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
