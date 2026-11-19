import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/app/App.vue'
import { createAppI18n, type AppLocale } from '@/i18n'
import { useRaceStore } from '@/stores/race.store'

/** Mounts the whole app the way main.ts does, with a fixed seed. */
export function mountApp({ locale = 'en' as AppLocale, seed = 42 } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useRaceStore(pinia).initialize(seed)
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [pinia, createAppI18n(locale)] },
  })
  return { wrapper, race: useRaceStore(pinia) }
}
