<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

/**
 * A panel with nothing in it yet: an icon, what it is for, what to do, and optionally the action.
 */
defineProps<{
  icon: IconName
  title: string
  description: string
}>()
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true"><BaseIcon :name="icon" :size="26" /></span>
    <p class="empty__title">{{ title }}</p>
    <p class="empty__text">{{ description }}</p>
    <div v-if="$slots.default" class="empty__action"><slot /></div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  color: var(--color-accent-strong);
}

.empty__title {
  margin-top: var(--space-1);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.empty__text {
  max-width: 28ch;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.empty__action {
  margin-top: var(--space-2);
}
</style>
