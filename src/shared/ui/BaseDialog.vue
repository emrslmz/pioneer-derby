<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'
import BaseButton from './BaseButton.vue'

/**
 * Modal built on the native <dialog>: focus trapping, Escape to close and the backdrop come
 * from the platform. `v-model:open` keeps Vue state and the element in sync.
 */
defineProps<{ title: string; closeLabel: string }>()

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

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :aria-labelledby="titleId"
    @close="open = false"
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
