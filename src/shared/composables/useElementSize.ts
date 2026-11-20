import { onScopeDispose, readonly, ref, watch, type Ref } from 'vue'

/**
 * Reactive content size of an element via ResizeObserver. Updates only when the size changes —
 * never polled per frame. Returns 0 × 0 where ResizeObserver is unavailable (jsdom).
 */
export function useElementSize(target: Readonly<Ref<HTMLElement | null>>) {
  const width = ref(0)
  const height = ref(0)
  let observer: ResizeObserver | null = null

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  watch(
    target,
    (element) => {
      stop()
      if (!element || typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(([entry]) => {
        if (!entry) return
        width.value = entry.contentRect.width
        height.value = entry.contentRect.height
      })
      observer.observe(element)
    },
    { immediate: true },
  )

  onScopeDispose(stop)
  return { width: readonly(width), height: readonly(height) }
}
