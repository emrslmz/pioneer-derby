import { onScopeDispose, watch, type Ref } from 'vue'

/**
 * Runs `onFrame` on every animation frame while `active` is true, and stops on scope disposal.
 * Generic on purpose: it knows nothing about races, stores or Vue rendering.
 */
export function useAnimationFrame(onFrame: (now: number) => void, active: Readonly<Ref<boolean>>) {
  let handle: number | null = null

  const loop = (now: number) => {
    onFrame(now)
    handle = requestAnimationFrame(loop)
  }

  const stop = () => {
    if (handle !== null) cancelAnimationFrame(handle)
    handle = null
  }

  watch(
    active,
    (isActive) => {
      stop()
      if (isActive) handle = requestAnimationFrame(loop)
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return { stop }
}
