import { onScopeDispose, readonly, ref } from 'vue'

export type ShareState = 'idle' | 'copied' | 'failed'

/** Copies a link to the clipboard and reports the outcome for a short while (X11). */
export function useShareLink(resetAfterMs = 3000) {
  const state = ref<ShareState>('idle')
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(url: string = globalThis.location?.href ?? ''): Promise<ShareState> {
    try {
      await globalThis.navigator.clipboard.writeText(url)
      state.value = 'copied'
    } catch {
      state.value = 'failed'
    }
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => (state.value = 'idle'), resetAfterMs)
    return state.value
  }

  onScopeDispose(() => {
    if (timer !== null) clearTimeout(timer)
  })

  return { state: readonly(state), copy }
}
