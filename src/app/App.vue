<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title" data-testid="app-title">{{ t('app.title') }}</h1>
      <p class="app__tagline">{{ t('app.tagline') }}</p>
    </header>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.app {
  min-height: 100dvh;
  padding: var(--space-4);

  @include bp.from(tablet) {
    padding: var(--space-6);
  }
}

.app__title {
  font-size: var(--font-size-xl);
  background: var(--gradient-accent);
  background-clip: text;
  color: transparent;
}

.app__tagline {
  color: var(--color-text-muted);
}
</style>
