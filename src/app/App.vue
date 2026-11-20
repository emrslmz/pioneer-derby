<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { nextTick, onScopeDispose, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import HorseList from '@/features/horses/components/HorseList.vue'
import ProgramPanel from '@/features/program/components/ProgramPanel.vue'
import { useRaceControls } from '@/features/race/composables/useRaceControls'
import ResultsPanel from '@/features/results/components/ResultsPanel.vue'
import ProgramSummaryDialog from '@/features/summary/components/ProgramSummaryDialog.vue'
import PredictionCard from '@/features/prediction/components/PredictionCard.vue'
import RaceTrack from '@/features/track/components/RaceTrack.vue'
import AnalyticsDebugPanel from '@/shared/analytics/AnalyticsDebugPanel.vue'
import { isDebugMode } from '@/shared/utils/debug'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import { useKeyboardShortcuts } from '@/shared/composables/useKeyboardShortcuts'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { useSettingsStore } from '@/stores/settings.store'
import AppFooter from './layout/AppFooter.vue'
import AppHeader from './layout/AppHeader.vue'
import ChangeProgramDialog from './layout/ChangeProgramDialog.vue'
import { startTour } from './tour/startTour'
import KeyboardShortcutsDialog from './layout/KeyboardShortcutsDialog.vue'
import ResponsiveLayout from './layout/ResponsiveLayout.vue'
import StatusAnnouncer from './layout/StatusAnnouncer.vue'

const { t } = useI18n()
const { toggleLocale } = useLocale()
const controls = useRaceControls()
const settings = useSettingsStore()
const { theme } = storeToRefs(settings)
const race = useRaceStore()
const schedule = useScheduleStore()
const shortcutsOpen = ref(false)
const changeProgramOpen = ref(false)

// The summary opens by itself a moment after the last round, so the final result is seen first.
const SUMMARY_DELAY_MS = 1600
const summaryOpen = ref(false)
const summarySource = ref<'auto' | 'manual'>('auto')
let summaryTimer: ReturnType<typeof setTimeout> | null = null
function openSummary(source: 'auto' | 'manual') {
  summarySource.value = source
  summaryOpen.value = true
}
watch(
  () => race.status,
  (status) => {
    if (summaryTimer !== null) clearTimeout(summaryTimer)
    summaryTimer = null
    if (status === 'finished')
      summaryTimer = setTimeout(() => openSummary('auto'), SUMMARY_DELAY_MS)
    else summaryOpen.value = false
  },
)
onScopeDispose(() => summaryTimer !== null && clearTimeout(summaryTimer))
const reducedMotion = useReducedMotion()

/** "Take the tour again" in the help dialog: close it first, so the page underneath is usable. */
async function restartTour() {
  shortcutsOpen.value = false
  await nextTick()
  await startTour({ t, reducedMotion: reducedMotion.value, source: 'manual' })
}

/** The first program is drawn straight away; replacing one asks first (it discards the results). */
function requestProgram() {
  if (!schedule.hasProgram) race.generateProgram()
  else if (race.canGenerate) changeProgramOpen.value = true
}
const debug = isDebugMode()

// Explicit light/dark wins over the system preference (tokens.scss).
watchEffect(() => {
  const root = document.documentElement
  if (theme.value === 'system') delete root.dataset.theme
  else root.dataset.theme = theme.value
})

useKeyboardShortcuts({
  g: requestProgram,
  space: () => controls.primary(),
  r: () => controls.replay(),
  '0': () => controls.setSpeed(0.5),
  '1': () => controls.setSpeed(1),
  '2': () => controls.setSpeed(2),
  '4': () => controls.setSpeed(4),
  '9': () => controls.setSpeed(16),
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
          <PredictionCard />
          <RaceTrack />
        </div>
      </template>

      <template #program>
        <ProgramPanel @change="requestProgram" />
      </template>

      <template #results>
        <ResultsPanel @summary="openSummary('manual')" />
      </template>
    </ResponsiveLayout>
  </main>

  <AppFooter />

  <KeyboardShortcutsDialog v-model:open="shortcutsOpen" @start-tour="restartTour" />
  <ProgramSummaryDialog
    v-model:open="summaryOpen"
    :source="summarySource"
    @replay="race.replay()"
  />
  <ChangeProgramDialog v-model:open="changeProgramOpen" @confirm="race.generateProgram()" />
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
  gap: var(--space-3);
  min-height: 0;

  > :last-child {
    flex: 1;
    min-height: 0;
  }
}
</style>
