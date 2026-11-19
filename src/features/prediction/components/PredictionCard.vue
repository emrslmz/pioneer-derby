<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HorseId } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
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
  <section class="prediction" aria-labelledby="prediction-title" data-testid="prediction-card">
    <header class="prediction__header">
      <BaseIcon name="star" :size="18" class="prediction__icon" />
      <h2 id="prediction-title" class="prediction__title">{{ t('prediction.title') }}</h2>
      <span class="prediction__rules">{{ t('prediction.rules') }}</span>
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
        <p class="prediction__question">{{ t('prediction.question', { lap }) }}</p>
        <p v-if="recommendation" class="prediction__tip" data-testid="recommendation">
          {{ recommendationText }}
        </p>
        <RunnerPicker
          v-model="pick"
          :runners="runners"
          :label="t('prediction.pickLabel', { lap })"
          :recommended-id="recommendation?.horseId ?? null"
          :recommended-label="t('prediction.recommended')"
        />
      </div>
      <p v-else class="prediction__hint" data-testid="prediction-locked">
        {{
          currentPick !== null
            ? t('prediction.yourPick', { name: nameOf(currentPick) })
            : t('prediction.noPick')
        }}
        <span class="prediction__muted">{{ t('prediction.locked') }}</span>
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
  display: grid;
  // Grid/flex children default to min-width: auto; without this the picker can't scroll.
  min-width: 0;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
      120deg,
      color-mix(in srgb, var(--color-gold) 12%, transparent),
      transparent 55%
    ),
    var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.prediction__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.prediction__icon {
  color: var(--color-gold);
}

.prediction__title {
  font-size: var(--font-size-lg);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.prediction__rules {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
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
}

.prediction__open {
  min-width: 0;
}

.prediction__question {
  font-weight: 700;
}

.prediction__tip,
.prediction__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.prediction__muted {
  margin-left: var(--space-2);
  color: var(--color-text-subtle);
}

.prediction__outcome:empty {
  display: none;
}
</style>
