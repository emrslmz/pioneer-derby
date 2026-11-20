<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

/**
 * A small tooltip shown on hover and on keyboard focus (WCAG 1.4.13):
 * - dismissible: Escape hides it without moving focus;
 * - hoverable: the pointer can move onto the tooltip without it disappearing;
 * - persistent: it stays until the pointer/focus leaves or Escape is pressed.
 *
 * Rendered in <body> with fixed positioning, so panels with `overflow: hidden` never clip it.
 * The text is supplementary: callers keep the same information in the accessible name.
 */
const props = withDefaults(defineProps<{ text: string; hideDelayMs?: number }>(), {
  hideDelayMs: 120,
})

defineSlots<{ default(): unknown }>()

const id = useId()
const trigger = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)
const visible = ref(false)
const position = ref({ top: 0, left: 0, placement: 'top' as 'top' | 'bottom' })
let hideTimer: ReturnType<typeof setTimeout> | null = null

function cancelHide() {
  if (hideTimer !== null) clearTimeout(hideTimer)
  hideTimer = null
}

async function show() {
  cancelHide()
  const element = trigger.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const placement = rect.top < 48 ? 'bottom' : 'top'
  position.value = {
    top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
    left: rect.left + rect.width / 2,
    placement,
  }
  visible.value = true
  await nextTick()
  // Keep the bubble inside the viewport horizontally.
  const bubble = tooltip.value?.getBoundingClientRect()
  if (bubble) {
    const overflowRight = bubble.right - (window.innerWidth - 8)
    const overflowLeft = 8 - bubble.left
    if (overflowRight > 0)
      position.value = { ...position.value, left: position.value.left - overflowRight }
    else if (overflowLeft > 0)
      position.value = { ...position.value, left: position.value.left + overflowLeft }
  }
}

function scheduleHide() {
  cancelHide()
  hideTimer = setTimeout(() => (visible.value = false), props.hideDelayMs)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    visible.value = false
    event.stopPropagation()
  }
}

// Escape must work wherever focus is — a hovered tooltip is often not the focused element.
watch(visible, (isVisible) => {
  if (isVisible) document.addEventListener('keydown', onKeydown, true)
  else document.removeEventListener('keydown', onKeydown, true)
})

onBeforeUnmount(() => {
  cancelHide()
  document.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <span
    ref="trigger"
    class="tooltip-trigger"
    @pointerenter="show"
    @pointerleave="scheduleHide"
    @focusin="show"
    @focusout="scheduleHide"
  >
    <slot />
    <!-- Inside the trigger so the component has one root (attrs like class fall through), but
         teleported to <body> so no panel can clip it. -->
    <Teleport to="body">
      <span
        v-if="visible"
        :id="id"
        ref="tooltip"
        class="tooltip"
        :class="`tooltip--${position.placement}`"
        role="tooltip"
        aria-hidden="true"
        :style="{ top: `${position.top}px`, left: `${position.left}px` }"
        data-testid="tooltip"
        @pointerenter="cancelHide"
        @pointerleave="scheduleHide"
      >
        {{ text }}
      </span>
    </Teleport>
  </span>
</template>

<style scoped lang="scss">
.tooltip-trigger {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
}

.tooltip {
  position: fixed;
  z-index: calc(var(--z-dialog) + 1);
  max-width: min(280px, calc(100vw - 16px));
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: var(--color-surface);
  box-shadow: var(--shadow-raised);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  pointer-events: auto;
  animation: tooltip-in var(--duration-fast) var(--easing-standard);

  &::after {
    position: absolute;
    left: 50%;
    border: 5px solid transparent;
    content: '';
    transform: translateX(-50%);
  }
}

.tooltip--top {
  transform: translate(-50%, -100%);

  &::after {
    top: 100%;
    border-top-color: var(--color-text);
  }
}

.tooltip--bottom {
  transform: translate(-50%, 0);

  &::after {
    bottom: 100%;
    border-bottom-color: var(--color-text);
  }
}

@keyframes tooltip-in {
  from {
    opacity: 0;
  }
}
</style>
