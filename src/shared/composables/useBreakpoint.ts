import { computed, type ComputedRef } from 'vue'
import { useMediaQuery } from './useMediaQuery'

/** Mirrors `src/styles/breakpoints.scss` — keep both in sync. */
export const BREAKPOINTS = { tablet: 768, desktop: 1280 } as const

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Mobile-first layout tier (docs/ARCHITECTURE.md §7). */
export function useBreakpoint(): ComputedRef<Breakpoint> {
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`)
  return computed(() => (isDesktop.value ? 'desktop' : isTablet.value ? 'tablet' : 'mobile'))
}
