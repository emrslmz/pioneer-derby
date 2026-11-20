<script setup lang="ts">
/**
 * An on/off switch. Built on a native checkbox with role="switch", so keyboard (Space), forms and
 * screen readers ("switch, on") work without custom handling; only the look is custom.
 */
defineProps<{ label: string; hint?: string }>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="switch" :title="hint">
    <input v-model="model" class="switch__input" type="checkbox" role="switch" v-bind="$attrs" />
    <span class="switch__track" aria-hidden="true"><span class="switch__thumb" /></span>
    <span class="switch__label">{{ label }}</span>
  </label>
</template>

<script lang="ts">
// Attributes (data-testid, aria-*) belong on the input, not the label wrapper.
export default { inheritAttrs: false }
</script>

<style scoped lang="scss">
.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  cursor: pointer;
}

// The real checkbox covers the switch: it stays focusable and clickable, but invisible.
.switch__input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch__track {
  position: relative;
  width: 34px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--color-border-strong);
  transition: background-color var(--duration-fast);
}

.switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
  transition: transform var(--duration-fast) var(--easing-standard);
}

.switch__input:checked + .switch__track {
  background: var(--color-accent-strong);
}

.switch__input:checked + .switch__track .switch__thumb {
  transform: translateX(14px);
}

.switch__input:focus-visible + .switch__track {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
