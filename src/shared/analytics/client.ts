import type { AnalyticsEvent, AnalyticsEventMap, AnalyticsEventName } from './events'

/** Where events go: console, an in-memory log, or a real SDK later — features never know. */
export interface AnalyticsAdapter {
  send(event: AnalyticsEvent): void
}

export interface AnalyticsClient {
  track<K extends AnalyticsEventName>(name: K, payload: AnalyticsEventMap[K]): void
}

export interface AnalyticsClientOptions {
  adapters: readonly AnalyticsAdapter[]
  sessionId?: string
  now?: () => number
}

function createSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now().toString(36)}`
}

export function createAnalyticsClient({
  adapters,
  sessionId = createSessionId(),
  now = Date.now,
}: AnalyticsClientOptions): AnalyticsClient {
  return {
    track(name, payload) {
      const event = { name, payload, timestamp: now(), sessionId } as AnalyticsEvent
      for (const adapter of adapters) {
        try {
          adapter.send(event)
        } catch (error) {
          // A broken adapter must never break the game.
          console.error('[analytics] adapter failed', error)
        }
      }
    },
  }
}
