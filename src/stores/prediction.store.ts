import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { scorePrediction, type PredictionScore } from '@/domain/prediction'
import { recommendHorse, type Recommendation } from '@/domain/recommendation'
import type { HorseId } from '@/domain/types'
import { analytics } from '@/shared/analytics'
import { useHorsesStore } from './horses.store'
import { useRaceStore } from './race.store'
import { useScheduleStore } from './schedule.store'

export interface RoundPrediction {
  readonly roundIndex: number
  readonly horseId: HorseId
  readonly followedRecommendation: boolean
  /** Set once the round has finished. */
  readonly score: PredictionScore | null
}

/**
 * X4 — "Predict the winner". One pick per round, open until the round starts (A24).
 * Points: winner 3, podium 1 (A8: points only, no betting language).
 */
export const usePredictionStore = defineStore('prediction', () => {
  const race = useRaceStore()
  const { status, currentRound, completedResults } = storeToRefs(race)
  const { horses } = storeToRefs(useHorsesStore())
  const { rounds } = storeToRefs(useScheduleStore())

  const picks = ref<Record<number, { horseId: HorseId; followedRecommendation: boolean }>>({})

  /** Picks are possible before a round runs: on a fresh program and between rounds. */
  const isOpen = computed(
    () =>
      currentRound.value !== null && (status.value === 'ready' || status.value === 'intermission'),
  )

  const recommendation = computed<Recommendation | null>(() =>
    currentRound.value
      ? recommendHorse(currentRound.value, horses.value, completedResults.value)
      : null,
  )

  const currentPick = computed(() =>
    currentRound.value ? (picks.value[currentRound.value.index]?.horseId ?? null) : null,
  )

  const predictions = computed<RoundPrediction[]>(() =>
    Object.entries(picks.value)
      .map(([index, pick]) => {
        const roundIndex = Number(index)
        const result = completedResults.value.find((r) => r.roundIndex === roundIndex)
        return { roundIndex, ...pick, score: result ? scorePrediction(pick.horseId, result) : null }
      })
      .sort((a, b) => a.roundIndex - b.roundIndex),
  )

  const scored = computed(() => predictions.value.filter((p) => p.score !== null))
  const totalPoints = computed(() =>
    scored.value.reduce((sum, p) => sum + (p.score?.points ?? 0), 0),
  )
  const correctWinners = computed(
    () => scored.value.filter((p) => p.score?.outcome === 'winner').length,
  )

  function pick(horseId: HorseId): boolean {
    const round = currentRound.value
    if (!isOpen.value || !round || !round.horseIds.includes(horseId)) return false
    const followedRecommendation = recommendation.value?.horseId === horseId
    picks.value = { ...picks.value, [round.index]: { horseId, followedRecommendation } }
    analytics.track('prediction_made', { roundIndex: round.index, horseId, followedRecommendation })
    return true
  }

  // A new program (generate or replay) starts a fresh game. Synchronous, so a pick made right
  // after generating can never be wiped by a late reset.
  watch(
    rounds,
    () => {
      picks.value = {}
    },
    { flush: 'sync' },
  )

  // Report each prediction's outcome once its round has finished.
  watch(
    () => completedResults.value.length,
    (count, previous) => {
      for (const result of completedResults.value.slice(previous ?? 0, count)) {
        const prediction = picks.value[result.roundIndex]
        if (!prediction) continue
        const score = scorePrediction(prediction.horseId, result)
        analytics.track('prediction_result', {
          roundIndex: result.roundIndex,
          horseId: prediction.horseId,
          outcome: score.outcome,
          points: score.points,
        })
      }
    },
  )

  return {
    picks,
    isOpen,
    recommendation,
    currentPick,
    predictions,
    totalPoints,
    correctWinners,
    pick,
  }
})
