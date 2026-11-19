import { createConsoleAdapter, createMemoryAdapter, type MemoryAdapter } from './adapters'
import { createAnalyticsClient, type AnalyticsAdapter, type AnalyticsClient } from './client'

export type { AnalyticsAdapter, AnalyticsClient } from './client'
export type { AnalyticsEvent, AnalyticsEventMap, AnalyticsEventName } from './events'
export { createAnalyticsClient } from './client'
export { createConsoleAdapter, createMemoryAdapter, type MemoryAdapter } from './adapters'

/** The app-wide event log (debug panel reads it). */
export const analyticsLog: MemoryAdapter = createMemoryAdapter()

const adapters: AnalyticsAdapter[] = [analyticsLog]
if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
  // eslint-disable-next-line no-console -- the console adapter is the one sanctioned logger
  adapters.push(createConsoleAdapter(console.debug))
}

/** Default client used by the stores; tests read `analyticsLog` to assert on events. */
export const analytics: AnalyticsClient = createAnalyticsClient({ adapters })
