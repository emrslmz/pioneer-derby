import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useShareLink } from '@/shared/composables/useShareLink'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function setup(writeText: (text: string) => Promise<void>) {
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  let api!: ReturnType<typeof useShareLink>
  mount(
    defineComponent({
      setup() {
        api = useShareLink(1000)
        return () => null
      },
    }),
  )
  return api
}

describe('useShareLink', () => {
  it('[X11] copies the link and resets the status after a moment', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    const api = setup(writeText)

    expect(await api.copy('https://example.test/?seed=7')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.test/?seed=7')
    expect(api.state.value).toBe('copied')

    vi.advanceTimersByTime(1000)
    expect(api.state.value).toBe('idle')
  })

  it('[X11] reports a failure when the clipboard is unavailable', async () => {
    const api = setup(() => Promise.reject(new Error('denied')))
    expect(await api.copy('x')).toBe('failed')
  })
})
