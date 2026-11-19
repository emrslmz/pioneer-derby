import { describe, expect, it, vi } from 'vitest'
import {
  type AnalyticsEvent,
  createAnalyticsClient,
  createConsoleAdapter,
  createMemoryAdapter,
} from '@/shared/analytics'

describe('analytics', () => {
  it('[X5] sends typed events with timestamp and session id to every adapter', () => {
    const memory = createMemoryAdapter()
    const other = { send: vi.fn<(event: AnalyticsEvent) => void>() }
    const client = createAnalyticsClient({
      adapters: [memory, other],
      sessionId: 'session-1',
      now: () => 1000,
    })

    client.track('race_started', { seed: 42 })

    const expected = {
      name: 'race_started',
      payload: { seed: 42 },
      timestamp: 1000,
      sessionId: 'session-1',
    }
    expect(memory.events).toEqual([expected])
    expect(other.send).toHaveBeenCalledWith(expected)
  })

  it('[X5] a failing adapter never breaks tracking for the others', () => {
    const memory = createMemoryAdapter()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createAnalyticsClient({
      adapters: [
        {
          send: () => {
            throw new Error('offline')
          },
        },
        memory,
      ],
    })

    expect(() => client.track('race_started', { seed: 1 })).not.toThrow()
    expect(memory.events).toHaveLength(1)
    expect(error).toHaveBeenCalled()
  })

  it('[X5] the memory log is bounded, clearable and observable', () => {
    const memory = createMemoryAdapter(2)
    const listener = vi.fn<(event: AnalyticsEvent) => void>()
    const unsubscribe = memory.subscribe(listener)
    const client = createAnalyticsClient({ adapters: [memory] })

    for (const seed of [1, 2, 3]) client.track('race_started', { seed })
    expect(memory.events.map((e) => e.payload)).toEqual([{ seed: 2 }, { seed: 3 }])
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    client.track('race_started', { seed: 4 })
    expect(listener).toHaveBeenCalledTimes(3)

    memory.clear()
    expect(memory.events).toEqual([])
  })

  it('[X5] the console adapter logs the event name and payload', () => {
    const log = vi.fn<(...args: unknown[]) => void>()
    createAnalyticsClient({ adapters: [createConsoleAdapter(log)] }).track('race_started', {
      seed: 5,
    })
    expect(log).toHaveBeenCalledWith('[analytics] race_started', { seed: 5 })
  })
})
