import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useAnimationFrame } from '@/shared/composables/useAnimationFrame'

afterEach(() => vi.useRealTimers())

function setup(initiallyActive: boolean) {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  const active = ref(initiallyActive)
  const onFrame = vi.fn<(now: number) => void>()
  const wrapper = mount(
    defineComponent({
      setup() {
        useAnimationFrame(onFrame, active)
        return () => null
      },
    }),
  )
  return { active, onFrame, wrapper }
}

describe('useAnimationFrame', () => {
  it('[X10] calls back on every frame while active', () => {
    const { onFrame } = setup(true)
    vi.advanceTimersByTime(160)
    expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(9)
  })

  it('[X10] does nothing while inactive and starts / stops with the flag', async () => {
    const { active, onFrame } = setup(false)
    vi.advanceTimersByTime(100)
    expect(onFrame).not.toHaveBeenCalled()

    active.value = true
    await nextTick()
    vi.advanceTimersByTime(100)
    const calls = onFrame.mock.calls.length
    expect(calls).toBeGreaterThan(0)

    active.value = false
    await nextTick()
    vi.advanceTimersByTime(100)
    expect(onFrame).toHaveBeenCalledTimes(calls)
  })

  it('[X10] cancels the loop when the component unmounts', () => {
    const { onFrame, wrapper } = setup(true)
    vi.advanceTimersByTime(50)
    const calls = onFrame.mock.calls.length
    wrapper.unmount()
    vi.advanceTimersByTime(200)
    expect(onFrame).toHaveBeenCalledTimes(calls)
  })
})
