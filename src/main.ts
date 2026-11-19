import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/app/App.vue'
import { applyLocale, createAppI18n } from '@/i18n'
import '@/styles/main.scss'

const i18n = createAppI18n()
applyLocale(i18n, i18n.global.locale.value)

createApp(App).use(createPinia()).use(i18n).mount('#app')
