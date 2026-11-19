import type { AnalyticsAdapter } from './client'
import type { AnalyticsEvent } from './events'

/** Keeps the latest events in memory — feeds the debug panel (`?debug=1`) and tests. */
export interface MemoryAdapter extends AnalyticsAdapter {
  readonly events: readonly AnalyticsEvent[]
  clear(): void
  subscribe(listener: (event: AnalyticsEvent) => void): () => void
}

export function createMemoryAdapter(limit = 200): MemoryAdapter {
  const events: AnalyticsEvent[] = []
  const listeners = new Set<(event: AnalyticsEvent) => void>()

  return {
    get events() {
      return events
    },
    send(event) {
      events.push(event)
      if (events.length > limit) events.splice(0, events.length - limit)
      for (const listener of listeners) listener(event)
    },
    clear() {
      events.length = 0
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Development-only console output. */
export function createConsoleAdapter(log: (...args: unknown[]) => void): AnalyticsAdapter {
  return {
    send(event) {
      log(`[analytics] ${event.name}`, event.payload)
    },
  }
}
