import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseTable from '@/shared/ui/BaseTable.vue'

interface Row {
  id: number
  name: string
}

const columns = [
  { key: 'id', label: 'Position', align: 'end' as const, value: (row: Row) => row.id },
  { key: 'name', label: 'Name', value: (row: Row) => row.name },
]
const rows: Row[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Grace Hopper' },
]

describe('BaseTable', () => {
  it('[X8] is a semantic table with caption and scoped column headers', () => {
    const wrapper = mount(BaseTable<Row>, {
      props: { columns, rows, rowKey: (row: Row) => row.id, caption: '1st Lap', hideCaption: true },
    })
    expect(wrapper.get('caption').text()).toBe('1st Lap')
    expect(wrapper.get('caption').classes()).toContain('visually-hidden')
    expect(wrapper.findAll('th').map((th) => [th.text(), th.attributes('scope')])).toEqual([
      ['Position', 'col'],
      ['Name', 'col'],
    ])
    expect(wrapper.findAll('tbody tr').map((tr) => tr.text())).toEqual([
      '1Ada Lovelace',
      '2Grace Hopper',
    ])
  })

  it('[T2] marks the highlighted row as current and supports custom cells', () => {
    const wrapper = mount(BaseTable<Row>, {
      props: { columns, rows, rowKey: (row: Row) => row.id, caption: 'c', highlightedKey: 2 },
      slots: {
        cell: `<template #cell="{ row, column }">{{ column.key === 'name' ? row.name.toUpperCase() : row.id }}</template>`,
      },
    })
    const current = wrapper.get('[aria-current="true"]')
    expect(current.text()).toContain('GRACE HOPPER')
  })

  it('[T2] shows the empty slot when there are no rows', () => {
    const wrapper = mount(BaseTable<Row>, {
      props: { columns, rows: [], rowKey: (row: Row) => row.id, caption: 'c' },
      slots: { empty: 'Nothing yet' },
    })
    expect(wrapper.get('.table__empty').attributes('colspan')).toBe('2')
    expect(wrapper.text()).toContain('Nothing yet')
  })
})
