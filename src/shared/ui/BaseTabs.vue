<script setup lang="ts">
import { nextTick, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'
import { nextIndex, tabId, tabPanelId, type TabItem } from './tabs'

/**
 * WAI-ARIA tablist with automatic activation and roving tabindex.
 * Renders only the tab buttons; the caller renders the panel with `tabPanelId(group, id)`.
 */
const props = withDefaults(
  defineProps<{
    tabs: readonly (TabItem & { icon?: IconName })[]
    /** Unique prefix for the tab / panel ids. */
    group: string
    label: string
    variant?: 'pills' | 'bar'
  }>(),
  { variant: 'pills' },
)

const active = defineModel<string>({ required: true })
const buttons = ref<HTMLButtonElement[]>([])

async function onKeydown(event: KeyboardEvent, index: number) {
  const next = nextIndex(event.key, index, props.tabs.length)
  if (next === null) return
  event.preventDefault()
  active.value = props.tabs[next]!.id
  await nextTick()
  buttons.value[next]?.focus()
}
</script>

<template>
  <div class="tabs" :class="`tabs--${variant}`" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :id="tabId(group, tab.id)"
      :key="tab.id"
      ref="buttons"
      type="button"
      role="tab"
      class="tabs__tab"
      :aria-selected="active === tab.id"
      :aria-controls="tabPanelId(group, tab.id)"
      :tabindex="active === tab.id ? 0 : -1"
      @click="active = tab.id"
      @keydown="onKeydown($event, index)"
    >
      <BaseIcon v-if="tab.icon" :name="tab.icon" :size="variant === 'bar' ? 22 : 16" />
      <span class="tabs__label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.tabs {
  display: flex;
  gap: var(--space-1);
}

.tabs__tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color var(--duration-fast),
    background-color var(--duration-fast);
}

.tabs--pills {
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);

  .tabs__tab {
    min-height: 36px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);

    &[aria-selected='true'] {
      background: var(--color-surface-raised);
      color: var(--color-text);
      box-shadow: var(--shadow-raised);
    }
  }
}

.tabs--bar {
  .tabs__tab {
    flex-direction: column;
    gap: 2px;
    min-height: var(--tabbar-height);
    font-size: var(--font-size-xs);

    &[aria-selected='true'] {
      color: var(--color-accent);
    }
  }
}
</style>
