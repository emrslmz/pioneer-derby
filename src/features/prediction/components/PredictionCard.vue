<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HorseId } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import RunnerPicker from './RunnerPicker.vue'

/**
 * X4 — the engagement layer: pick a winner before each round, see a recommended horse with the
 * reasons behind it, and collect points. Points only — no odds, no money (A8).
 */
const { t, locale } = useI18n()
const { lapLabel, ordinal } = useLocale()
const prediction = usePredictionStore()
const { isOpen, recommendation, currentPick, predictions, totalPoints, correctWinners } =
  storeToRefs(prediction)
const { status, currentRound } = storeToRefs(useRaceStore())
const { roundCount } = storeToRefs(useScheduleStore())
const horsesStore = useHorsesStore()

const lap = computed(() =>
  currentRound.value ? lapLabel(currentRound.value.index, currentRound.value.distance) : '',
)

const runners = computed(() =>
  (currentRound.value?.horseIds ?? []).flatMap((id) => horsesStore.getHorse(id) ?? []),
)

const nameOf = (id: HorseId | null | undefined) =>
  (id != null && horsesStore.getHorse(id)?.name) || ''

const recommendationText = computed(() => {
  const tip = recommendation.value
  if (!tip) return ''
  const reasons = new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(
    tip.reasons.map((code) => t(`prediction.reasons.${code}`)),
  )
  return t('prediction.recommendation', { name: nameOf(tip.horseId), reasons })
})

const pick = computed({
  get: () => currentPick.value,
  set: (horseId: HorseId | null) => {
    if (horseId !== null) prediction.pick(horseId)
  },
})

/** Feedback for the most recently scored round. */
const lastOutcome = computed(() => {
  const latest = [...predictions.value].reverse().find((p) => p.score !== null)
  if (!latest?.score) return null
  const round = useScheduleStore().rounds[latest.roundIndex]
  return {
    outcome: latest.score.outcome,
    text: t(`prediction.outcome.${latest.score.outcome}`, {
      lap: round ? lapLabel(round.index, round.distance) : '',
      name: nameOf(latest.horseId),
      ordinal: ordinal(latest.score.position ?? 0),
      points: latest.score.points,
    }),
  }
})

const outcomeTone = { winner: 'success', podium: 'info', miss: 'neutral' } as const
</script>

<template>
  <section
    class="prediction"
    :class="{ 'prediction--open': isOpen, 'prediction--waiting': isOpen && currentPick === null }"
    aria-labelledby="prediction-title"
    data-testid="prediction-card"
  >
    <header class="prediction__header">
      <span class="prediction__badge" aria-hidden="true"><BaseIcon name="star" :size="16" /></span>
      <h2 id="prediction-title" class="prediction__title">{{ t('prediction.title') }}</h2>
      <span v-if="isOpen && currentPick === null" class="prediction__cta">
        {{ t('prediction.makePick') }}
      </span>
      <span
        class="prediction__score"
        :aria-label="t('prediction.score', { points: totalPoints, correct: correctWinners })"
        data-testid="prediction-score"
      >
        {{ t('prediction.points', { points: totalPoints }) }}
      </span>
    </header>

    <p v-if="status === 'idle'" class="prediction__hint">{{ t('prediction.idle') }}</p>

    <p v-else-if="status === 'finished'" class="prediction__hint" data-testid="prediction-final">
      {{
        t('prediction.final', { points: totalPoints, correct: correctWinners, rounds: roundCount })
      }}
    </p>

    <template v-else>
      <div v-if="isOpen" class="prediction__open">
        <div class="prediction__ask">
          <p class="prediction__question">{{ t('prediction.question', { lap }) }}</p>
          <span class="prediction__rules">{{ t('prediction.rules') }}</span>
        </div>
        <div v-if="recommendation" class="prediction__tip">
          <p data-testid="recommendation">{{ recommendationText }}</p>
          <BaseButton
            v-if="currentPick !== recommendation.horseId"
            size="sm"
            icon="star"
            data-testid="pick-tip-button"
            @click="pick = recommendation.horseId"
          >
            {{ t('prediction.pickTip') }}
          </BaseButton>
        </div>
        <RunnerPicker
          v-model="pick"
          :runners="runners"
          :label="t('prediction.pickLabel', { lap })"
          :recommended-id="recommendation?.horseId ?? null"
          :recommended-label="t('prediction.recommended')"
        />
      </div>
      <p v-else class="prediction__locked" data-testid="prediction-locked">
        <strong>{{
          currentPick !== null
            ? t('prediction.yourPick', { name: nameOf(currentPick) })
            : t('prediction.noPick')
        }}</strong>
        <span class="prediction__muted">
          {{ currentPick !== null ? t('prediction.pending') : t('prediction.locked') }}
        </span>
      </p>
    </template>

    <p class="prediction__outcome" aria-live="polite" data-testid="prediction-outcome">
      <BaseBadge v-if="lastOutcome" :tone="outcomeTone[lastOutcome.outcome]">
        {{ lastOutcome.text }}
      </BaseBadge>
    </p>
  </section>
</template>

<style scoped lang="scss">
.prediction {
  position: relative;
  display: grid;
  gap: var(--space-2);
  // Grid/flex children default to min-width: auto; this keeps the card inside its column.
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-gold) 18%, var(--color-surface)),
        var(--color-surface) 60%
      )
      padding-box,
    linear-gradient(120deg, var(--color-gold), var(--color-accent)) border-box;
  box-shadow: var(--shadow-panel);
}

// Draw attention while a pick is still possible and none was made.
.prediction--waiting {
  animation: invite 2.4s ease-in-out infinite;
}

@keyframes invite {
  50% {
    box-shadow:
      var(--shadow-panel),
      0 0 0 4px color-mix(in srgb, var(--color-gold) 35%, transparent);
  }
}

.prediction__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.prediction__badge {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-gold);
  color: #1a1a1a;
}

.prediction__title {
  font-size: var(--font-size-lg);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.prediction__cta {
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.prediction__score {
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--gradient-accent);
  color: var(--color-accent-contrast);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.prediction__open {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.prediction__ask {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
}

.prediction__question {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.1;
}

.prediction__rules {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.prediction__tip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.prediction__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.prediction__locked {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
}

.prediction__muted {
  color: var(--color-text-muted);
}

.prediction__outcome:empty {
  display: none;
}
</style>
