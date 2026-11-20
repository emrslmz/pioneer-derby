<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RaceStatus, RoundRace } from '@/domain/types'
import BaseButton from '@/shared/ui/BaseButton.vue'
import RoundResultBoard from './RoundResultBoard.vue'

/**
 * What sits over the picture, beside it (not inside the labelled image), so that the text and the
 * buttons stay reachable for assistive technology: the "drawing the program" veil, the photo-finish
 * flash, the idle / ready / paused card and, between rounds, the result board.
 */
defineProps<{
  displayRace: RoundRace | null
  seed: number | null
  status: RaceStatus
  flash: boolean
  /** Idle, ready or paused mid-round: a card with its own action. */
  overlay: { eyebrow: string; title: string; hint: string } | null
  showingFinished: boolean
  photoFinish: boolean
  autoAdvance: boolean
  nextLap: string
}>()
defineEmits<{ generate: []; toggle: []; nextRound: [] }>()

const { t } = useI18n()
</script>

<template>
  <!-- The same "drawing the program" moment as in the Program panel, over the track:
         whichever Generate button was pressed, the track shows it too. CSS only. -->
  <div
    v-if="displayRace"
    :key="seed ?? 0"
    class="track__loading"
    aria-hidden="true"
    data-testid="track-loading"
  >
    <span class="track__spinner" />
    <span class="track__loading-text">{{ t('program.drawing') }}</span>
  </div>

  <div v-if="flash" class="track__flash" aria-hidden="true" data-testid="photo-flash" />

  <div v-if="overlay" class="track__overlay" data-testid="track-overlay">
    <div class="track__message" data-testid="track-banner">
      <p v-if="overlay.eyebrow" class="track__eyebrow">{{ overlay.eyebrow }}</p>
      <p class="track__title">{{ overlay.title }}</p>
      <p class="track__hint">{{ overlay.hint }}</p>
      <BaseButton
        v-if="status === 'idle'"
        variant="primary"
        icon="generate"
        shortcut="G"
        class="track__cta"
        data-testid="track-generate"
        @click="$emit('generate')"
      >
        {{ t('onboarding.cta') }}
      </BaseButton>
      <BaseButton
        v-else
        variant="primary"
        icon="play"
        class="track__cta"
        data-testid="track-play"
        @click="$emit('toggle')"
      >
        {{ t(status === 'paused' ? 'actions.resume' : 'actions.start') }}
      </BaseButton>
    </div>
  </div>
  <div v-if="showingFinished && displayRace" class="track__overlay track__overlay--result">
    <RoundResultBoard
      :result="displayRace.result"
      :photo-finish="photoFinish"
      :finished="status === 'finished'"
      :auto-advance="autoAdvance && status === 'intermission'"
    >
      <template #next>
        <span data-testid="result-next">{{ nextLap }}</span>
        <BaseButton
          v-if="status === 'intermission'"
          :variant="autoAdvance ? 'secondary' : 'primary'"
          size="sm"
          icon="play"
          data-testid="next-round"
          @click="$emit('nextRound')"
        >
          {{ t(autoAdvance ? 'actions.startNow' : 'actions.nextRound') }}
        </BaseButton>
        <BaseButton
          v-else-if="status === 'paused'"
          variant="primary"
          size="sm"
          icon="play"
          data-testid="track-play"
          @click="$emit('toggle')"
        >
          {{ t('actions.resume') }}
        </BaseButton>
      </template>
    </RoundResultBoard>
  </div>
</template>

<style scoped lang="scss">
.track__overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  pointer-events: none;
}

.track__overlay--result {
  // Keep the horses at the finish line (right) in view.
  justify-items: start;
  padding-left: calc(2rem + var(--space-4));
}

// The board has buttons (Start now, Resume) and may scroll: unlike the overlay, it takes the pointer.
.track__overlay--result > * {
  pointer-events: auto;
}

.track__message {
  display: grid;
  gap: var(--space-1);
  max-width: min(34ch, 100%);
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--track-card-line);
  border-radius: var(--radius-lg);
  background: var(--track-card-bg);
  color: var(--track-white);
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 32px var(--track-shadow);
}

.track__cta {
  justify-self: center;
  margin-top: var(--space-2);
  // The overlay ignores the pointer so horses stay hoverable; the button must not.
  pointer-events: auto;
}

.track__eyebrow {
  color: var(--color-gold);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.track__title {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1.1;
}

.track__hint {
  color: var(--track-card-text);
  font-size: var(--font-size-sm);
}

// Camera flash for a photo finish (skipped under reduced motion).
.track__flash {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: var(--track-white);
  opacity: 0;
  pointer-events: none;
  animation: flash 700ms ease-out;
}

@keyframes flash {
  10% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
  }
}

// "Drawing the program": a veil over the track that lifts by itself (never blocks the pointer).
.track__loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  background: var(--track-veil-bg);
  color: var(--track-white);
  pointer-events: none;
  animation: track-veil 1000ms ease forwards;
}

.track__spinner {
  width: 38px;
  height: 38px;
  border: 4px solid var(--track-card-line);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: track-spin 700ms linear infinite;
}

.track__loading-text {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@keyframes track-veil {
  0%,
  65% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes track-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .track__loading {
    display: none;
  }
}
</style>
