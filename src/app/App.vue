<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSE_COUNT } from '@/domain/constants'
import { useRaceControls } from '@/features/race/composables/useRaceControls'
import { useLocale } from '@/i18n/useLocale'
import { useKeyboardShortcuts } from '@/shared/composables/useKeyboardShortcuts'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useSettingsStore } from '@/stores/settings.store'
import AppHeader from './layout/AppHeader.vue'
import KeyboardShortcutsDialog from './layout/KeyboardShortcutsDialog.vue'
import ResponsiveLayout from './layout/ResponsiveLayout.vue'
import StatusAnnouncer from './layout/StatusAnnouncer.vue'

const { t } = useI18n()
const { toggleLocale, lapLabel } = useLocale()
const controls = useRaceControls()
const settings = useSettingsStore()
const { theme } = storeToRefs(settings)
const shortcutsOpen = ref(false)

// Explicit light/dark wins over the system preference (tokens.scss).
watchEffect(() => {
  const root = document.documentElement
  if (theme.value === 'system') delete root.dataset.theme
  else root.dataset.theme = theme.value
})

useKeyboardShortcuts({
  g: () => controls.generate(),
  space: () => controls.toggle(),
  '1': () => controls.setSpeed(1),
  '2': () => controls.setSpeed(2),
  '4': () => controls.setSpeed(4),
  l: toggleLocale,
  t: settings.cycleTheme,
  '?': () => (shortcutsOpen.value = true),
})

// Placeholder until the animated track lands in Phase 5.
const trackHint = computed(() => {
  if (controls.status.value === 'idle') return t('empty.track')
  if (controls.status.value === 'ready') return t('empty.trackReady')
  return ''
})

const trackCaption = computed(() => {
  const round = controls.currentRound.value
  return round ? lapLabel(round.index, round.distance) : ''
})
</script>

<template>
  <a class="skip-link" href="#race-track">{{ t('app.skipToRace') }}</a>
  <AppHeader @open-shortcuts="shortcutsOpen = true" />

  <main class="main">
    <ResponsiveLayout>
      <template #horses>
        <BasePanel
          tone="horses"
          icon="horses"
          :title="t('panels.horses', { count: HORSE_COUNT })"
          scroll
          data-testid="horses-panel"
        >
          <p class="empty">{{ t('empty.horses') }}</p>
        </BasePanel>
      </template>

      <template #track>
        <BasePanel
          id="race-track"
          tone="track"
          icon="track"
          :title="t('panels.track')"
          tabindex="-1"
          data-testid="track-panel"
        >
          <div class="stage">
            <div class="stage__track">
              <p v-if="trackHint" class="stage__hint">{{ trackHint }}</p>
            </div>
            <p v-if="trackCaption" class="stage__caption" data-testid="track-caption">
              {{ trackCaption }}
            </p>
          </div>
        </BasePanel>
      </template>

      <template #program>
        <BasePanel
          tone="program"
          icon="program"
          :title="t('panels.program')"
          scroll
          data-testid="program-panel"
        >
          <p class="empty">{{ t('empty.program') }}</p>
        </BasePanel>
      </template>

      <template #results>
        <BasePanel
          tone="results"
          icon="results"
          :title="t('panels.results')"
          scroll
          data-testid="results-panel"
        >
          <p class="empty">{{ t('empty.results') }}</p>
        </BasePanel>
      </template>
    </ResponsiveLayout>
  </main>

  <KeyboardShortcutsDialog v-model:open="shortcutsOpen" />
  <StatusAnnouncer />
</template>

<style scoped lang="scss">
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

.stage {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.stage__track {
  display: grid;
  flex: 1;
  place-content: center;
  min-height: 260px;
  padding: var(--space-6);
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0 calc(10% - 1px),
      var(--color-track-line) calc(10% - 1px) 10%
    ),
    linear-gradient(180deg, var(--color-track-lane), var(--color-track));
  text-align: center;
}

.stage__hint {
  max-width: 34ch;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-glass);
  color: var(--color-text);
}

.stage__caption {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-finish);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
}

.empty {
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}
</style>
