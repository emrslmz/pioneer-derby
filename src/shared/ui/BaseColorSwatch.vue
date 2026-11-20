<script setup lang="ts">
import HorseRunner from '../components/HorseRunner.vue'
import BaseShortName from './BaseShortName.vue'
import BaseTooltip from './BaseTooltip.vue'

/** A colour dot plus its (translated) name. The name is real text, so colour is never the only cue. */
defineProps<{
  hex: string
  label: string
  hideLabel?: boolean
  /** Show a person's name as "Grace H." (full name on hover and for screen readers). */
  abbreviate?: boolean
  /** Draw the horse itself (in this colour, with its number) instead of a dot. */
  horseNumber?: number
}>()
</script>

<template>
  <span class="swatch">
    <HorseRunner
      v-if="horseNumber !== undefined"
      class="swatch__horse"
      :color="hex"
      :number="horseNumber"
      :galloping="false"
    />
    <span v-else class="swatch__dot" :style="{ '--swatch': hex }" aria-hidden="true" />
    <span v-if="hideLabel" class="visually-hidden">{{ label }}</span>
    <span v-else-if="abbreviate" class="swatch__label"><BaseShortName :name="label" /></span>
    <!-- Long labels end in "…"; the tooltip then shows the whole label. -->
    <BaseTooltip v-else :text="label" when-truncated class="swatch__tip">
      <span class="swatch__label" data-truncate>{{ label }}</span>
    </BaseTooltip>
  </span>
</template>

<style scoped lang="scss">
.swatch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  // Never wider than its cell, so long labels end in "…" instead of being clipped.
  max-width: 100%;
}

.swatch__dot {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow:
    0 0 0 2px var(--color-surface),
    0 0 0 3px var(--color-border-strong);
}

.swatch__horse {
  width: 1.9rem;
  height: auto;
  flex-shrink: 0;
}

.swatch__tip {
  flex: 1;
  min-width: 0;
}

.swatch__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
