<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

/**
 * The one button of the app. Always `type="button"` unless told otherwise.
 * Icon-only buttons must get an `aria-label` from the caller.
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    icon?: IconName
    iconOnly?: boolean
    /** Shown as a hint and exposed via `aria-keyshortcuts`, e.g. "G" or "Space". */
    shortcut?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="button"
    :class="[`button--${variant}`, `button--${size}`, { 'button--icon-only': iconOnly }]"
    :disabled="disabled"
    :aria-keyshortcuts="shortcut"
  >
    <BaseIcon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span v-if="!iconOnly" class="button__label"><slot /></span>
    <kbd v-if="shortcut && !iconOnly" class="button__shortcut" aria-hidden="true">{{
      shortcut
    }}</kbd>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard),
    box-shadow var(--duration-fast) var(--easing-standard),
    opacity var(--duration-fast);

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.98);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.button--sm {
  min-height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}

.button--lg {
  min-height: 48px;
  padding: 0 var(--space-6);
  font-size: var(--font-size-lg);
}

.button--icon-only {
  aspect-ratio: 1;
  padding: 0;
}

.button--primary {
  background: var(--gradient-accent);
  color: var(--color-accent-contrast);
  box-shadow: 0 6px 20px rgb(244 72 43 / 0.35);

  &:hover:not(:disabled) {
    box-shadow: 0 8px 28px rgb(244 72 43 / 0.5);
  }
}

.button--secondary {
  border-color: var(--color-border-strong);
  background: var(--color-surface-raised);
  color: var(--color-text);

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
  }
}

.button--ghost {
  background: transparent;
  color: var(--color-text-muted);

  &:hover:not(:disabled) {
    background: var(--color-row-hover);
    color: var(--color-text);
  }
}

.button__shortcut {
  display: none;
  font-size: 0.7em;
  opacity: 0.8;

  @include bp.from(desktop) {
    display: inline-grid;
  }
}

.button--primary .button__shortcut {
  border-color: rgb(255 255 255 / 0.4);
  background: rgb(255 255 255 / 0.15);
  color: inherit;
}
</style>
