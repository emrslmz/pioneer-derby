import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { createAppI18n, type AppLocale } from '@/i18n'
import { useRaceStore } from '@/stores/race.store'

/** Mounts a feature component with a fresh Pinia (seeded game) and i18n. */
export function mountFeature<C extends Component>(
  component: C,
  {
    locale = 'en' as AppLocale,
    seed = 42,
    ...options
  }: ComponentMountingOptions<C> & {
    locale?: AppLocale
    seed?: number
  } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const race = useRaceStore(pinia)
  race.initialize(seed)
  // Real time (1×), so race time equals fake-timer time; the 2× default is tested in the store.
  race.$patch({ speed: 1 })
  const wrapper = mount(component, {
    ...options,
    global: { plugins: [pinia, createAppI18n(locale)] },
  } as ComponentMountingOptions<C>)
  return { wrapper, race }
}
