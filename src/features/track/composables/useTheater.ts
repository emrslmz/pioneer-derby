import { nextTick, ref, shallowRef, watch, type Ref } from 'vue'

/**
 * "Full screen": the live panel is teleported into a modal <dialog> (the component is not
 * remounted, so the race keeps running). Escape or a click on the backdrop closes it, and focus
 * returns to the control that opened it.
 */
export function useTheater(host: Readonly<Ref<HTMLElement | null>>) {
  const expanded = ref(false)
  const theater = ref<HTMLDialogElement | null>(null)
  const theaterSlot = shallowRef<HTMLElement | null>(null)

  async function open() {
    expanded.value = true
    await nextTick()
    const dialog = theater.value
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
  }

  function close() {
    const dialog = theater.value
    if (dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    expanded.value = false
  }

  function onBackdropClick(event: MouseEvent) {
    if (event.target === theater.value) close()
  }

  watch(expanded, async (isExpanded, wasExpanded) => {
    if (!isExpanded && wasExpanded) {
      await nextTick()
      // Return focus to the control that opened the theater.
      host.value?.querySelector<HTMLElement>('[data-testid="track-expand"]')?.focus()
    }
  })

  return { expanded, theater, theaterSlot, open, close, onBackdropClick }
}
