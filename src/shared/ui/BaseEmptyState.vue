<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

/**
 * A panel with nothing in it yet: an icon, what it is for, what to do, and optionally the action.
 * The faint bars sketch the content that will arrive, so the panel does not look broken.
 */
withDefaults(
  defineProps<{
    icon: IconName
    title: string
    description: string
    /** Number of ghost rows drawn under the text. */
    skeleton?: number
  }>(),
  { skeleton: 0 },
)
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true"><BaseIcon :name="icon" :size="26" /></span>
    <p class="empty__title">{{ title }}</p>
    <p class="empty__text">{{ description }}</p>
    <div v-if="$slots.default" class="empty__action"><slot /></div>
    <div v-if="skeleton > 0" class="empty__ghosts" aria-hidden="true">
      <span v-for="row in skeleton" :key="row" class="empty__ghost" />
    </div>
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

.empty__ghosts {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  margin-top: var(--space-4);
}

.empty__ghost {
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-sunken),
    color-mix(in srgb, var(--color-surface-sunken) 50%, transparent)
  );

  &:nth-child(odd) {
    opacity: 0.7;
  }
}
</style>
