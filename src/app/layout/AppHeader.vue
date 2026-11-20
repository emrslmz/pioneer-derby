<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRaceControls } from '@/features/race/composables/useRaceControls'
import { useLocale } from '@/i18n/useLocale'
import { analytics } from '@/shared/analytics'
import { useShareLink } from '@/shared/composables/useShareLink'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import type { IconName } from '@/shared/ui/icons'
import { useSettingsStore } from '@/stores/settings.store'
import AppLogo from './AppLogo.vue'

defineEmits<{ 'open-shortcuts': [] }>()

const { t } = useI18n()
const controls = useRaceControls()
const { locale, locales, setLocale, lapLabel } = useLocale()
const settings = useSettingsStore()
const { theme } = storeToRefs(settings)

const languageOptions = computed(() =>
  locales.map((value) => ({
    value,
    label: value.toUpperCase(),
    ariaLabel: t(`language.${value}`),
  })),
)

const themeIcons: Record<typeof theme.value, IconName> = {
  system: 'system',
  light: 'sun',
  dark: 'moon',
}

const roundCaption = computed(() => {
  const round = controls.currentRound.value
  if (!round) return t('round.none')
  return `${t('round.progress', {
    current: round.index + 1,
    total: controls.roundCount.value,
  })} · ${lapLabel(round.index, round.distance)}`
})

const { state: shareState, copy } = useShareLink()
async function share() {
  if ((await copy()) === 'copied' && controls.seed.value !== null) {
    analytics.track('link_shared', { seed: controls.seed.value, method: 'clipboard' })
  }
}
const shareMessage = computed(() =>
  shareState.value === 'idle' ? '' : t(`share.${shareState.value}`),
)

const language = computed({ get: () => locale.value, set: setLocale })
</script>

<template>
  <header class="header">
    <div class="header__brand">
      <AppLogo />
      <div class="header__titles">
        <!-- English brand name: keep English casing rules (no Turkish dotted İ). -->
        <h1 class="header__title" lang="en" data-testid="app-title">{{ t('app.title') }}</h1>
        <p class="header__tagline">{{ t('app.tagline') }}</p>
      </div>
    </div>

    <div class="header__status" data-testid="race-status">
      <BaseBadge
        :tone="controls.statusTone.value"
        :pulse="controls.status.value === 'running'"
        :aria-label="`${t('status.label')}: ${controls.statusLabel.value}`"
      >
        {{ controls.statusLabel.value }}
      </BaseBadge>
      <span class="header__round" data-testid="round-caption">{{ roundCaption }}</span>
    </div>

    <div class="header__actions">
      <BaseButton
        data-testid="toggle-button"
        variant="primary"
        :icon="controls.toggleIcon.value"
        shortcut="Space"
        :disabled="!controls.canPrimary.value"
        @click="controls.primary"
      >
        {{ controls.toggleLabel.value }}
      </BaseButton>
    </div>

    <div class="header__utilities">
      <BaseSegmentedControl
        v-model="language"
        data-testid="language-switch"
        size="sm"
        :label="t('language.label')"
        :options="languageOptions"
      />
      <BaseButton
        data-testid="share-button"
        variant="ghost"
        size="sm"
        icon-only
        :icon="shareState === 'copied' ? 'check' : 'share'"
        :aria-label="t('share.button')"
        :title="shareMessage || t('share.button')"
        @click="share"
      />
      <span class="visually-hidden" aria-live="polite" data-testid="share-status">{{
        shareMessage
      }}</span>
      <BaseButton
        data-testid="theme-toggle"
        variant="ghost"
        size="sm"
        icon-only
        :icon="themeIcons[theme]"
        :aria-label="t('theme.toggle', { theme: t(`theme.${theme}`) })"
        :title="t('theme.toggle', { theme: t(`theme.${theme}`) })"
        @click="settings.cycleTheme"
      />
      <BaseButton
        data-testid="shortcuts-button"
        class="header__help"
        variant="ghost"
        size="sm"
        icon="keyboard"
        icon-only
        shortcut="?"
        :aria-label="t('actions.shortcuts')"
        :title="t('actions.shortcuts')"
        @click="$emit('open-shortcuts')"
      />
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: grid;
  grid-template-areas:
    'brand utilities'
    'status status'
    'actions actions';
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-glass);
  backdrop-filter: blur(14px) saturate(140%);

  &::after {
    position: absolute;
    inset: auto 0 -1px;
    height: 2px;
    background: var(--gradient-accent);
    content: '';
    opacity: 0.85;
  }

  @include bp.from(tablet) {
    grid-template-areas:
      'brand status utilities'
      'actions actions actions';
    grid-template-columns: auto 1fr auto;
    padding: var(--space-3) var(--space-6);
  }

  @include bp.from(desktop) {
    grid-template-areas: 'brand status actions utilities';
    grid-template-columns: auto 1fr auto auto;
    height: var(--header-height);
    padding-block: 0;
  }
}

.header__brand {
  display: flex;
  grid-area: brand;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.header__title {
  font-size: var(--font-size-lg);
  letter-spacing: 0.06em;
  text-transform: uppercase;

  @include bp.from(desktop) {
    font-size: var(--font-size-lg);
    line-height: 1;
  }

  // Wide screens have room for the full-size title next to the controls.
  @media (min-width: 1440px) {
    font-size: var(--font-size-xl);
  }
}

.header__tagline {
  display: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);

  @include bp.from(desktop) {
    display: block;
  }
}

.header__status {
  display: flex;
  grid-area: status;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;

  @include bp.from(tablet) {
    justify-content: center;
  }
}

.header__round {
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 600;
  letter-spacing: 0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__actions {
  display: grid;
  grid-area: actions;
  grid-template-columns: 1fr;
  gap: var(--space-2);

  @include bp.from(desktop) {
    display: flex;
  }
}

.header__utilities {
  display: flex;
  grid-area: utilities;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 767px) {
  .header {
    grid-template-areas: 'brand brand' 'status status' 'actions actions' 'utilities utilities';
  }

  .header__utilities {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

.header__help {
  display: none !important;

  @include bp.from(desktop) {
    display: inline-flex !important;
  }
}
</style>
