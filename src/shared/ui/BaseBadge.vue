<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'accent' | 'live' | 'success' | 'warning' | 'info'
    /** Pulsing dot, e.g. for a live race. Respects reduced motion. */
    pulse?: boolean
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="badge" :class="`badge--${tone}`">
    <span class="badge__dot" :class="{ 'badge__dot--pulse': pulse }" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped lang="scss">
.badge {
  --badge-color: var(--color-text-muted);
  --badge-bg: var(--color-row-hover);

  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.2em 0.75em;
  border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
  border-radius: var(--radius-pill);
  background: var(--badge-bg);
  color: var(--badge-color);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
  white-space: nowrap;
}

.badge--accent {
  --badge-color: var(--color-accent);
  --badge-bg: var(--color-accent-soft);
}

.badge--live {
  --badge-color: var(--color-live);
  --badge-bg: var(--color-live-soft);
}

.badge--success {
  --badge-color: var(--color-success);
  --badge-bg: var(--color-success-soft);
}

.badge--warning {
  --badge-color: var(--color-warning);
  --badge-bg: var(--color-warning-soft);
}

.badge--info {
  --badge-color: var(--color-info);
  --badge-bg: var(--color-info-soft);
}

.badge__dot {
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  background: currentColor;
}

.badge__dot--pulse {
  animation: pulse 1.2s ease-out infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 70%, transparent);
  }

  100% {
    box-shadow: 0 0 0 0.6em transparent;
  }
}
</style>
