import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { setReducedMotion, setViewportWidth } from '../../setup'

function withSetup<T>(composable: () => T) {
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => null
      },
    }),
  )
  return { result, wrapper }
}

describe('media query composables', () => {
  afterEach(() => {
    setViewportWidth(1024)
    setReducedMotion(false)
  })

  it('[T2] maps the viewport to mobile / tablet / desktop and reacts to resizes', async () => {
    setViewportWidth(360)
    const { result } = withSetup(useBreakpoint)
    expect(result.value).toBe('mobile')

    setViewportWidth(800)
    await nextTick()
    expect(result.value).toBe('tablet')

    setViewportWidth(1280)
    await nextTick()
    expect(result.value).toBe('desktop')
  })

  it('[X8] reports prefers-reduced-motion', async () => {
    const { result } = withSetup(useReducedMotion)
    expect(result.value).toBe(false)
    setReducedMotion(true)
    await nextTick()
    expect(result.value).toBe(true)
  })

  it('[T2] stops listening when the component unmounts', async () => {
    setViewportWidth(360)
    const { result, wrapper } = withSetup(useBreakpoint)
    wrapper.unmount()
    setViewportWidth(1280)
    await nextTick()
    expect(result.value).toBe('mobile')
  })
})
