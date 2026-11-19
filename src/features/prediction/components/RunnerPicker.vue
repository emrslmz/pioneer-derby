<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Horse, HorseId } from '@/domain/types'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import { nextIndex } from '@/shared/ui/tabs'

/** Radio group of the round's runners (lane order). Arrow keys move the pick, like native radios. */
const props = defineProps<{
  runners: readonly Horse[]
  label: string
  recommendedId: HorseId | null
  recommendedLabel: string
  disabled?: boolean
}>()

const model = defineModel<HorseId | null>({ required: true })
const buttons = ref<HTMLButtonElement[]>([])

/** Roving tabindex: the picked runner, or the first one when nothing is picked yet. */
const focusIndex = (index: number) =>
  model.value === null ? index === 0 : props.runners[index]?.id === model.value

async function onKeydown(event: KeyboardEvent, index: number) {
  const next = nextIndex(event.key, index, props.runners.length)
  if (next === null || props.disabled) return
  event.preventDefault()
  model.value = props.runners[next]!.id
  await nextTick()
  buttons.value[next]?.focus()
}
</script>

<template>
  <div class="picker" role="radiogroup" :aria-label="label" :aria-disabled="disabled || undefined">
    <button
      v-for="(runner, index) in runners"
      :key="runner.id"
      ref="buttons"
      type="button"
      role="radio"
      class="picker__runner"
      :class="{ 'picker__runner--tip': runner.id === recommendedId }"
      :aria-checked="model === runner.id"
      :tabindex="focusIndex(index) ? 0 : -1"
      :disabled="disabled"
      :style="{ '--coat': runner.color.hex }"
      data-testid="pick-option"
      :data-horse-id="runner.id"
      @click="model = runner.id"
      @keydown="onKeydown($event, index)"
    >
      <span class="picker__number" aria-hidden="true">{{ runner.id }}</span>
      <span class="picker__name">{{ runner.name }}</span>
      <span v-if="runner.id === recommendedId" class="picker__tip">
        <BaseIcon name="star" :size="12" />{{ recommendedLabel }}
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: flex;
  min-width: 0;
  // Fade the edge so it is obvious more runners scroll into view.
  mask-image: linear-gradient(90deg, #000 calc(100% - 32px), transparent);
  gap: var(--space-2);
  padding: var(--space-1) 0 var(--space-2);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}

.picker__runner {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    border-color var(--duration-fast),
    background-color var(--duration-fast),
    transform var(--duration-fast);

  &:hover:not(:disabled) {
    border-color: var(--coat);
  }

  &[aria-checked='true'] {
    border-color: var(--color-accent);
    background: var(--color-accent-soft);
    box-shadow: 0 0 0 1px var(--color-accent) inset;
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
}

.picker__number {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid rgb(0 0 0 / 0.35);
  border-radius: 50%;
  background: var(--coat);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000;
}

.picker__name {
  font-weight: 600;
  white-space: nowrap;
}

.picker__tip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
