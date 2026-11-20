<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseDialog from '@/shared/ui/BaseDialog.vue'

const open = defineModel<boolean>('open', { required: true })
defineEmits<{ 'start-tour': [] }>()
const { t } = useI18n()

const shortcuts = [
  { keys: ['G'], label: 'shortcuts.generate' },
  { keys: ['Space'], label: 'shortcuts.toggle' },
  { keys: ['R'], label: 'shortcuts.replay' },
  { keys: ['0', '1', '2', '4', '9'], label: 'shortcuts.speed' },
  { keys: ['L'], label: 'shortcuts.language' },
  { keys: ['T'], label: 'shortcuts.theme' },
  { keys: ['?'], label: 'shortcuts.help' },
  { keys: ['Esc'], label: 'shortcuts.close' },
] as const
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('shortcuts.title')" :close-label="t('actions.close')">
    <p class="intro">{{ t('shortcuts.intro') }}</p>
    <dl class="shortcuts" data-testid="shortcuts-list">
      <div v-for="shortcut in shortcuts" :key="shortcut.label" class="shortcuts__row">
        <dt class="shortcuts__keys">
          <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
        </dt>
        <dd>{{ t(shortcut.label) }}</dd>
      </div>
    </dl>
    <div class="tour">
      <p class="tour__hint">{{ t('shortcuts.tourHint') }}</p>
      <BaseButton icon="play" data-testid="restart-tour" @click="$emit('start-tour')">
        {{ t('shortcuts.tour') }}
      </BaseButton>
    </div>
  </BaseDialog>
</template>

<style scoped lang="scss">
.intro {
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.tour {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.tour__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.shortcuts {
  display: grid;
  gap: var(--space-2);
}

.shortcuts__row {
  display: grid;
  grid-template-columns: 7rem 1fr;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.shortcuts__keys {
  display: flex;
  gap: var(--space-1);
}
</style>
