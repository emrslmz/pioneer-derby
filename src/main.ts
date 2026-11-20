import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/app/App.vue'
import { applyLocale, createAppI18n } from '@/i18n'
import { useRaceStore } from '@/stores/race.store'
import { readSeedFromUrl } from '@/shared/utils/seed'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@/styles/main.scss'

const i18n = createAppI18n()
applyLocale(i18n, i18n.global.locale.value)

const pinia = createPinia()
const app = createApp(App).use(pinia).use(i18n)

// A2: horses exist from the first paint; `?seed=` replays a shared game (X11).
useRaceStore(pinia).initialize(readSeedFromUrl())

app.mount('#app')
