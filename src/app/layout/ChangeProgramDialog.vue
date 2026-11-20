<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseDialog from '@/shared/ui/BaseDialog.vue'

/** Drawing a new program throws the current one away, so it asks first. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()

function confirm() {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    role="alertdialog"
    :title="t('changeProgram.title')"
    :close-label="t('actions.close')"
  >
    <p class="message" data-testid="change-program-message">{{ t('changeProgram.message') }}</p>
    <div class="actions">
      <BaseButton autofocus data-testid="change-program-cancel" @click="open = false">
        {{ t('actions.cancel') }}
      </BaseButton>
      <BaseButton
        variant="primary"
        icon="generate"
        data-testid="change-program-confirm"
        @click="confirm"
      >
        {{ t('changeProgram.confirm') }}
      </BaseButton>
    </div>
  </BaseDialog>
</template>

<style scoped lang="scss">
.message {
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-6);
}
</style>
