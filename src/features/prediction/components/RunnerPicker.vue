<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Horse, HorseId } from '@/domain/types'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import BaseShortName from '@/shared/ui/BaseShortName.vue'
import { nextIndex } from '@/shared/ui/tabs'

/**
 * Radio group of the round's runners in lane order, laid out as a grid so all ten are visible at
 * once. Arrow keys move the pick, like native radios.
 */
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
      <BaseShortName class="picker__name" :name="runner.name" />
      <span
        v-if="runner.id === recommendedId"
        class="picker__tip"
        :title="recommendedLabel"
        data-testid="pick-tip"
      >
        <BaseIcon name="star" :size="12" />
        <span class="visually-hidden">{{ recommendedLabel }}</span>
      </span>
      <BaseIcon v-if="model === runner.id" name="check" :size="14" class="picker__check" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: grid;
  // Five per row on a laptop: all ten runners in two compact rows.
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-1);
}

.picker__runner {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  min-height: 34px;
  padding: 3px var(--space-2) 3px 3px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  text-align: start;
  cursor: pointer;
  transition:
    border-color var(--duration-fast),
    background-color var(--duration-fast),
    transform var(--duration-fast);

  &:hover:not(:disabled) {
    border-color: var(--coat);
    transform: translateY(-1px);
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

.picker__runner--tip {
  border-color: var(--color-gold);
}

.picker__number {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 2px solid rgb(0 0 0 / 0.35);
  border-radius: 50%;
  background: var(--coat);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000;
}

.picker__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
}

.picker__tip {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--color-gold);
  color: #1a1a1a;
}

.picker__check {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--color-accent-text);
}

.picker__tip + .picker__check {
  margin-left: 0;
}
</style>
