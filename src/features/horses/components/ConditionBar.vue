<script setup lang="ts">
import { computed } from 'vue'
import { CONDITION_MAX, CONDITION_MIN } from '@/domain/constants'

/** Condition as a number plus a bar. The number carries the meaning; the bar is decoration. */
const props = defineProps<{ value: number }>()

const ratio = computed(() => (props.value - CONDITION_MIN) / (CONDITION_MAX - CONDITION_MIN))
const level = computed(() => (props.value >= 70 ? 'high' : props.value >= 40 ? 'mid' : 'low'))
</script>

<template>
  <span class="condition" :class="`condition--${level}`">
    <span class="condition__value">{{ value }}</span>
    <span class="condition__track" aria-hidden="true">
      <span class="condition__fill" :style="{ transform: `scaleX(${ratio})` }" />
    </span>
  </span>
</template>

<style scoped lang="scss">
.condition {
  --condition-color: var(--color-success);

  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.condition--mid {
  --condition-color: var(--color-warning);
}

.condition--low {
  --condition-color: var(--color-live);
}

.condition__value {
  min-width: 2ch;
  font-weight: 600;
  text-align: end;
}

.condition__track {
  flex: 1;
  min-width: 1.5rem;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
}

.condition__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--condition-color);
  transform-origin: left center;
  transition: transform var(--duration-base) var(--easing-standard);
}
</style>
