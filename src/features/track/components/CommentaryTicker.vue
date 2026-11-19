<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * X13 — broadcast lower third. The visible line animates in; a separate polite live region speaks
 * the same line for screen readers, except the winner call, which the results panel announces.
 */
defineProps<{ text: string; spoken: string; live: boolean }>()

const { t } = useI18n()
</script>

<template>
  <div class="ticker" data-testid="commentary">
    <span class="ticker__tag" :class="{ 'ticker__tag--live': live }">{{
      t('broadcast.live')
    }}</span>
    <Transition name="ticker" mode="out-in">
      <p :key="text" class="ticker__line" aria-hidden="true" data-testid="commentary-line">
        {{ text }}
      </p>
    </Transition>
    <p class="visually-hidden" aria-live="polite">{{ spoken }}</p>
  </div>
</template>

<style scoped lang="scss">
.ticker {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 40px;
  padding: var(--space-2) var(--space-3);
  overflow: hidden;
  border-top: 1px solid var(--color-border);
  background: linear-gradient(90deg, var(--color-surface-raised), var(--color-surface));
}

.ticker__tag {
  flex-shrink: 0;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-text-subtle);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.ticker__tag--live {
  background: #c8102e;
}

.ticker__line {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticker-enter-active,
.ticker-leave-active {
  transition:
    transform var(--duration-base) var(--easing-standard),
    opacity var(--duration-base);
}

.ticker-enter-from {
  opacity: 0;
  transform: translateY(60%);
}

.ticker-leave-to {
  opacity: 0;
  transform: translateY(-60%);
}
</style>
