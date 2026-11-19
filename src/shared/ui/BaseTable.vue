<script setup lang="ts" generic="T">
export interface TableColumn<Row> {
  key: string
  label: string
  align?: 'start' | 'center' | 'end'
  width?: string
  /** Default cell text; override any cell with the `cell` slot. */
  value?: (row: Row) => string | number
}

/** Semantic data table: caption, scoped column headers, sticky head, optional highlighted row. */
defineProps<{
  columns: readonly TableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string | number
  caption: string
  /** Visually hide the caption (it stays available to screen readers). */
  hideCaption?: boolean
  highlightedKey?: string | number | null
}>()

defineSlots<{
  cell?(props: { row: T; column: TableColumn<T>; index: number }): unknown
  empty?(): unknown
}>()
</script>

<template>
  <table class="table">
    <caption :class="{ 'visually-hidden': hideCaption }">
      {{
        caption
      }}
    </caption>
    <thead>
      <tr>
        <th
          v-for="column in columns"
          :key="column.key"
          scope="col"
          :style="{ width: column.width, textAlign: column.align ?? 'start' }"
        >
          {{ column.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, index) in rows"
        :key="rowKey(row)"
        :class="{ 'table__row--highlighted': highlightedKey === rowKey(row) }"
        :aria-current="highlightedKey === rowKey(row) ? 'true' : undefined"
      >
        <td
          v-for="column in columns"
          :key="column.key"
          :style="{ textAlign: column.align ?? 'start' }"
        >
          <slot name="cell" :row="row" :column="column" :index="index">
            {{ column.value?.(row) }}
          </slot>
        </td>
      </tr>
      <tr v-if="rows.length === 0">
        <td class="table__empty" :colspan="columns.length"><slot name="empty" /></td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
.table {
  width: 100%;
  font-size: var(--font-size-sm);
}

caption {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  text-align: start;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

tbody tr:nth-child(even) {
  background: var(--color-row-alt);
}

tbody tr:hover {
  background: var(--color-row-hover);
}

.table__row--highlighted {
  background: var(--color-accent-soft) !important;
  box-shadow: inset 3px 0 0 var(--color-accent);
}

.table__empty {
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}
</style>
