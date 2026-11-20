<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'
import BaseButton from './BaseButton.vue'

/**
 * Modal built on the native <dialog>: focus trapping, Escape to close and the backdrop come
 * from the platform. `v-model:open` keeps Vue state and the element in sync.
 */
withDefaults(
  defineProps<{
    title: string
    closeLabel: string
    /** `end` slides in from the side as a drawer. */
    placement?: 'center' | 'end'
    /** `alertdialog` for a question the user must answer (confirmations). */
    role?: 'dialog' | 'alertdialog'
    /** `lg` for dialogs with a table or a chart. */
    size?: 'md' | 'lg'
  }>(),
  { placement: 'center', role: 'dialog', size: 'md' },
)

const open = defineModel<boolean>('open', { required: true })
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

function sync(isOpen: boolean) {
  const element = dialog.value
  if (!element) return
  if (isOpen && !element.open) {
    if (typeof element.showModal === 'function') element.showModal()
    else element.setAttribute('open', '')
  } else if (!isOpen && element.open) {
    if (typeof element.close === 'function') element.close()
    else element.removeAttribute('open')
  }
}

onMounted(() => sync(open.value))
watch(open, sync)

/** `close` fires asynchronously: a dialog reopened in the meantime must stay open. */
function onClose() {
  if (!dialog.value?.open) open.value = false
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :class="[`dialog--${placement}`, `dialog--${size}`]"
    :role="role"
    :aria-labelledby="titleId"
    @cancel="open = false"
    @close="onClose"
    @click="onBackdropClick"
  >
    <div class="dialog__card">
      <header class="dialog__header">
        <h2 :id="titleId" class="dialog__title">{{ title }}</h2>
        <BaseButton
          variant="ghost"
          size="sm"
          icon="close"
          icon-only
          :aria-label="closeLabel"
          @click="open = false"
        />
      </header>
      <div class="dialog__body"><slot /></div>
    </div>
  </dialog>
</template>

<style scoped lang="scss">
.dialog {
  width: min(480px, calc(100vw - 2 * var(--space-4)));
  max-height: calc(100dvh - 2 * var(--space-8));
  margin: auto;
  padding: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-raised);

  &::backdrop {
    background: rgb(4 7 16 / 0.6);
    backdrop-filter: blur(4px);
  }
}

.dialog--lg.dialog--center {
  width: min(760px, calc(100vw - 2 * var(--space-4)));
}

.dialog--end {
  width: min(420px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  margin: 0 0 0 auto;
  border-width: 0 0 0 1px;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  animation: slide-in var(--duration-base) var(--easing-standard);
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
  }
}

.dialog__card {
  padding: var(--space-4) var(--space-6) var(--space-6);
}

.dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.dialog__title {
  font-size: var(--font-size-lg);
  text-transform: uppercase;
}
</style>
