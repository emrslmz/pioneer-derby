<script setup lang="ts" generic="V extends string | number">
import { nextTick, ref } from 'vue'
import { nextIndex } from './tabs'

/** A radio group drawn as joined buttons (speed 1×/2×/4×, TR/EN). Arrow keys move the choice. */
const props = defineProps<{
  options: readonly { value: V; label: string; ariaLabel?: string }[]
  label: string
  size?: 'sm' | 'md'
}>()

const model = defineModel<V>({ required: true })
const buttons = ref<HTMLButtonElement[]>([])

async function onKeydown(event: KeyboardEvent, index: number) {
  const next = nextIndex(event.key, index, props.options.length)
  if (next === null) return
  event.preventDefault()
  model.value = props.options[next]!.value
  await nextTick()
  buttons.value[next]?.focus()
}
</script>

<template>
  <div
    class="segmented"
    :class="`segmented--${size ?? 'md'}`"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="buttons"
      type="button"
      role="radio"
      class="segmented__option"
      :aria-checked="model === option.value"
      :aria-label="option.ariaLabel"
      :tabindex="model === option.value ? 0 : -1"
      @click="model = option.value"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.segmented {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
}

.segmented__option {
  min-width: 2.5rem;
  min-height: 30px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background-color var(--duration-fast),
    color var(--duration-fast);

  &[aria-checked='true'] {
    // The stronger coral keeps white small text above WCAG AA (4.67:1 vs 3.6:1).
    background: var(--color-accent-strong);
    color: var(--color-accent-contrast);
  }

  &:hover:not([aria-checked='true']) {
    color: var(--color-text);
  }
}

.segmented--sm .segmented__option {
  min-width: 2.1rem;
  min-height: 26px;
  font-size: var(--font-size-xs);
}
</style>
