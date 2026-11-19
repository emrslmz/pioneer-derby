import { vi } from 'vitest'

/**
 * jsdom has no matchMedia. Tests get a controllable stub: `setViewportWidth(1280)` makes
 * `(min-width: …)` queries match, and `prefers-reduced-motion` follows `setReducedMotion`.
 */
let viewportWidth = 1024
let reducedMotion = false
const lists = new Set<{ query: string; notify: () => void }>()

function evaluate(query: string): boolean {
  const minWidth = /min-width:\s*(\d+)px/.exec(query)
  if (minWidth) return viewportWidth >= Number(minWidth[1])
  if (query.includes('prefers-reduced-motion: reduce')) return reducedMotion
  return false
}

export function setViewportWidth(width: number): void {
  viewportWidth = width
  for (const list of lists) list.notify()
}

export function setReducedMotion(value: boolean): void {
  reducedMotion = value
  for (const list of lists) list.notify()
}

vi.stubGlobal('matchMedia', (query: string) => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const list = {
    get matches() {
      return evaluate(query)
    },
    media: query,
    onchange: null,
    addEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }
  lists.add({
    query,
    notify: () => {
      for (const listener of listeners)
        listener({ matches: evaluate(query), media: query } as MediaQueryListEvent)
    },
  })
  return list
})
