import { onScopeDispose, readonly, ref, type Ref } from 'vue'

/** Reactive `matchMedia`. Returns `false` where media queries are unavailable (SSR, old jsdom). */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false)
  const media = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined
  if (!media) return readonly(matches)

  matches.value = media.matches
  const update = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }
  media.addEventListener('change', update)
  onScopeDispose(() => media.removeEventListener('change', update))

  return readonly(matches)
}

/** `prefers-reduced-motion: reduce` — animations must respect it (CLAUDE.md, X8). */
export function useReducedMotion(): Readonly<Ref<boolean>> {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
