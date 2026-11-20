<script setup lang="ts">
import BaseShortName from './BaseShortName.vue'

/** A colour dot plus its (translated) name. The name is real text, so colour is never the only cue. */
defineProps<{
  hex: string
  label: string
  hideLabel?: boolean
  /** Show a person's name as "Grace H." (full name on hover and for screen readers). */
  abbreviate?: boolean
}>()
</script>

<template>
  <span class="swatch">
    <span class="swatch__dot" :style="{ '--swatch': hex }" aria-hidden="true" />
    <span :class="hideLabel ? 'visually-hidden' : 'swatch__label'">
      <BaseShortName v-if="abbreviate" :name="label" />
      <template v-else>{{ label }}</template>
    </span>
  </span>
</template>

<style scoped lang="scss">
.swatch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
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

.swatch__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
