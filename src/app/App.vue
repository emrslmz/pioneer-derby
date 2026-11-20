<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import HorseList from '@/features/horses/components/HorseList.vue'
import ProgramPanel from '@/features/program/components/ProgramPanel.vue'
import { useRaceControls } from '@/features/race/composables/useRaceControls'
import ResultsPanel from '@/features/results/components/ResultsPanel.vue'
import PredictionCard from '@/features/prediction/components/PredictionCard.vue'
import RaceTrack from '@/features/track/components/RaceTrack.vue'
import AnalyticsDebugPanel from '@/shared/analytics/AnalyticsDebugPanel.vue'
import { isDebugMode } from '@/shared/utils/debug'
import { useLocale } from '@/i18n/useLocale'
import { useKeyboardShortcuts } from '@/shared/composables/useKeyboardShortcuts'
import { useSettingsStore } from '@/stores/settings.store'
import AppHeader from './layout/AppHeader.vue'
import KeyboardShortcutsDialog from './layout/KeyboardShortcutsDialog.vue'
import ResponsiveLayout from './layout/ResponsiveLayout.vue'
import StatusAnnouncer from './layout/StatusAnnouncer.vue'

const { t } = useI18n()
const { toggleLocale } = useLocale()
const controls = useRaceControls()
const settings = useSettingsStore()
const { theme } = storeToRefs(settings)
const shortcutsOpen = ref(false)
const debug = isDebugMode()

// Explicit light/dark wins over the system preference (tokens.scss).
watchEffect(() => {
  const root = document.documentElement
  if (theme.value === 'system') delete root.dataset.theme
  else root.dataset.theme = theme.value
})

useKeyboardShortcuts({
  g: () => controls.generate(),
  space: () => controls.primary(),
  r: () => controls.replay(),
  '0': () => controls.setSpeed(0.5),
  '1': () => controls.setSpeed(1),
  '2': () => controls.setSpeed(2),
  '4': () => controls.setSpeed(4),
  l: toggleLocale,
  t: settings.cycleTheme,
  '?': () => (shortcutsOpen.value = true),
})
</script>

<template>
  <a class="skip-link" href="#race-track">{{ t('app.skipToRace') }}</a>
  <AppHeader @open-shortcuts="shortcutsOpen = true" />

  <main class="main">
    <ResponsiveLayout>
      <template #horses>
        <HorseList />
      </template>

      <template #track>
        <div class="race-stage">
          <RaceTrack>
            <template #prediction><PredictionCard /></template>
          </RaceTrack>
        </div>
      </template>

      <template #program>
        <ProgramPanel />
      </template>

      <template #results>
        <ResultsPanel />
      </template>
    </ResponsiveLayout>
  </main>

  <KeyboardShortcutsDialog v-model:open="shortcutsOpen" />
  <StatusAnnouncer />
  <AnalyticsDebugPanel v-if="debug" />
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.skip-link {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: calc(var(--z-header) + 1);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-weight: 700;
  transform: translateY(-200%);

  &:focus {
    transform: none;
  }
}

.main {
  min-width: 0;
}

.race-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;

  gap: var(--layout-gap);
  min-height: 0;

  > :last-child {
    flex: 1;
    min-height: 0;
  }
}
</style>
