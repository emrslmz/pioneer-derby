<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Horse, HorseId } from '@/domain/types'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import BaseTooltip from '@/shared/ui/BaseTooltip.vue'
import { nextIndex } from '@/shared/ui/tabs'

/**
 * The round's runners as small horses in their own colour, the number on the saddle cloth, in lane
 * order — all ten fit on one row. The full name is in the accessible name ("20 Margaret Hamilton") and in a tooltip.
 * A radio group: arrow keys move the pick, like native radios.
 */
const props = defineProps<{
  runners: readonly Horse[]
  label: string
  recommendedId: HorseId | null
  recommendedLabel: string
  disabled?: boolean
  /** Always render this many slots, so the row keeps its size before a line-up exists. */
  slots?: number
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
    <BaseTooltip
      v-for="(runner, index) in runners"
      :key="runner.id"
      :text="runner.id === recommendedId ? `${runner.name} · ${recommendedLabel}` : runner.name"
    >
      <button
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
        <HorseRunner :color="runner.color.hex" :number="runner.id" :galloping="false" />
        <span class="visually-hidden">{{ runner.id }} {{ runner.name }}</span>
        <span v-if="runner.id === recommendedId" class="picker__tip" data-testid="pick-tip">
          <BaseIcon name="star" :size="9" />
          <span class="visually-hidden">{{ recommendedLabel }}</span>
        </span>
      </button>
    </BaseTooltip>
    <span
      v-for="slot in Math.max(0, (slots ?? 0) - runners.length)"
      :key="`slot-${slot}`"
      class="picker__runner picker__runner--placeholder"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: flex;
  // Ten horses fit one row from ~500 px; narrower, they wrap instead of overflowing.
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.picker__runner {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 36px;
  flex-shrink: 0;
  padding: 2px 3px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--coat) 14%, var(--color-surface));
  cursor: pointer;
  transition:
    transform var(--duration-fast),
    box-shadow var(--duration-fast);

  :deep(.runner) {
    width: 100%;
    height: 100%;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &[aria-checked='true'] {
    border-color: var(--color-accent);
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 4px var(--color-accent);
    transform: scale(1.05);
  }

  &:disabled {
    cursor: default;
  }

  &:disabled:not([aria-checked='true']) {
    opacity: 0.45;
  }
}

.picker__runner--placeholder {
  border: 2px dashed var(--color-border-strong);
  background: transparent;
  cursor: default;
}

.picker__tip {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-gold);
  color: #1a1a1a;
  text-shadow: none;
}
</style>
