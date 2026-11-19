<script setup lang="ts" generic="T">
export interface TableColumn<Row> {
  key: string
  label: string
  align?: 'start' | 'center' | 'end'
  width?: string
  /** Default cell text; override any cell with the `cell` slot. */
  value?: (row: Row) => string | number
  /** Renders the header as a button that emits `sort`. */
  sortable?: boolean
}

export interface TableSort {
  key: string
  direction: 'ascending' | 'descending'
}

/** Semantic data table: caption, scoped column headers, sticky head, optional highlighted row. */
const props = defineProps<{
  columns: readonly TableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string | number
  caption: string
  /** Visually hide the caption (it stays available to screen readers). */
  hideCaption?: boolean
  highlightedKey?: string | number | null
  /** Current sort, reflected as `aria-sort` on the column header. */
  sort?: TableSort | null
}>()

defineEmits<{ sort: [key: string] }>()

function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
  return props.sort?.key === key ? props.sort.direction : 'none'
}

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
          :aria-sort="column.sortable ? ariaSort(column.key) : undefined"
        >
          <button
            v-if="column.sortable"
            type="button"
            class="table__sort"
            :data-direction="sort?.key === column.key ? sort.direction : undefined"
            @click="$emit('sort', column.key)"
          >
            {{ column.label }}<span class="table__sort-icon" aria-hidden="true" />
          </button>
          <template v-else>{{ column.label }}</template>
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
  // Columns keep their declared widths; flexible columns share the rest and truncate.
  table-layout: fixed;
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
  overflow: hidden;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-overflow: ellipsis;
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

.table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;

  &:hover {
    color: var(--color-text);
  }
}

.table__sort-icon {
  width: 0;
  height: 0;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  opacity: 0.35;
  border-top: 5px solid currentColor;
}

.table__sort[data-direction] .table__sort-icon {
  color: var(--color-accent);
  opacity: 1;
}

.table__sort[data-direction='ascending'] .table__sort-icon {
  border-top: 0;
  border-bottom: 5px solid currentColor;
}

.table__empty {
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}
</style>
