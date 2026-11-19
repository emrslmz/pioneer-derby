import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { INTERMISSION_MS } from '@/domain/constants'
import { roundRaceForSeed } from '@/domain/game'
import { can, transition, type RaceEvent } from '@/domain/race-machine'
import type { Placing, RaceSpeed, RaceStatus, RoundResult } from '@/domain/types'
import { analytics } from '@/shared/analytics'
import { createRandomSeed, writeSeedToUrl } from '@/shared/utils/seed'
import { useHorsesStore } from './horses.store'
import { useScheduleStore } from './schedule.store'

/**
 * Runs the game: status machine, current round, race clock and results (R4, R5, T1).
 *
 * The clock is stored as checkpoints, not as a value updated every frame (X10, ADR 0002):
 * race time = `elapsedAtCheckpoint + (now − checkpointAt) × speed`. The animation loop reads
 * `elapsedMs()` each frame; the store only changes on real events (start, pause, round end …).
 */
export const useRaceStore = defineStore('race', () => {
  const horsesStore = useHorsesStore()
  const scheduleStore = useScheduleStore()

  const status = ref<RaceStatus>('idle')
  const seed = ref<number | null>(null)
  const currentRoundIndex = ref(0)
  const results = shallowRef<readonly RoundResult[]>([])
  const speed = ref<RaceSpeed>(1)

  const elapsedAtCheckpoint = ref(0)
  const checkpointAt = ref<number | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  // ── Getters ──────────────────────────────────────────────────────────────

  const currentRound = computed(() => scheduleStore.rounds[currentRoundIndex.value] ?? null)

  /** Profiles + result of the current round, derived from the seed (never stored twice). */
  const currentRace = computed(() => {
    const round = currentRound.value
    if (!round || seed.value === null) return null
    return roundRaceForSeed(round, horsesStore.horses, seed.value)
  })

  /** Results of finished rounds only, in round order (R5). */
  const completedResults = computed(() => results.value)
  const isLastRound = computed(() => currentRoundIndex.value >= scheduleStore.roundCount - 1)
  const isClockRunning = computed(() => checkpointAt.value !== null)

  const canGenerate = computed(() => can(status.value, 'GENERATE'))
  const canToggle = computed(() =>
    (['START', 'PAUSE', 'RESUME'] as const).some((event) => can(status.value, event)),
  )
  const canReplay = computed(
    () => seed.value !== null && scheduleStore.hasProgram && canGenerate.value,
  )

  // ── Clock ────────────────────────────────────────────────────────────────

  const now = () => performance.now()

  /** Race time of the current round. Cheap — safe to call every animation frame. */
  function elapsedMs(at: number = now()): number {
    if (checkpointAt.value === null) return elapsedAtCheckpoint.value
    return elapsedAtCheckpoint.value + (at - checkpointAt.value) * speed.value
  }

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function scheduleRoundEnd(): void {
    clearTimer()
    const race = currentRace.value
    if (!race) return
    const remaining = Math.max(0, race.durationMs - elapsedMs())
    // Round up: the result must never be published before the last horse has crossed the line.
    timer = setTimeout(finishRound, Math.ceil(remaining / speed.value))
  }

  function runClock(): void {
    checkpointAt.value = now()
    scheduleRoundEnd()
  }

  function stopClock(): void {
    elapsedAtCheckpoint.value = elapsedMs()
    checkpointAt.value = null
    clearTimer()
  }

  function resetProgress(): void {
    clearTimer()
    currentRoundIndex.value = 0
    results.value = []
    elapsedAtCheckpoint.value = 0
    checkpointAt.value = null
  }

  function send(event: RaceEvent): boolean {
    const next = transition(status.value, event)
    if (next === null) return false
    status.value = next
    return true
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** App load (A2): horses from the URL seed (or a fresh one); no program yet. */
  function initialize(initialSeed: number | null = null): void {
    resetProgress()
    scheduleStore.clear()
    status.value = 'idle'
    useSeed(initialSeed ?? createRandomSeed())
  }

  function useSeed(value: number): void {
    seed.value = value
    horsesStore.generate(value)
    writeSeedToUrl(value)
  }

  /**
   * "Generate Program" (R3). The first program uses the seed the horses came from, so a shared
   * `?seed=` link replays the same game; later clicks re-roll horses and program with a new seed.
   */
  function generateProgram(): boolean {
    if (!can(status.value, 'GENERATE')) return false
    const source = status.value === 'idle' && seed.value !== null ? 'initial' : 'regenerate'
    if (source === 'regenerate') useSeed(createRandomSeed())
    return buildProgram(source)
  }

  /** Same seed, same horses, same program, same results — watch it again (X11). */
  function replay(): boolean {
    if (!canReplay.value) return false
    return buildProgram('regenerate')
  }

  function buildProgram(source: 'initial' | 'regenerate'): boolean {
    const gameSeed = seed.value as number
    resetProgress()
    scheduleStore.generate(horsesStore.horses, gameSeed)
    send('GENERATE')
    analytics.track('program_generated', {
      seed: gameSeed,
      roundCount: scheduleStore.roundCount,
      source,
    })
    return true
  }

  /** R4 — runs the program one round at a time. */
  function start(): boolean {
    if (!send('START')) return false
    resetProgress()
    runClock()
    analytics.track('race_started', { seed: seed.value as number })
    return true
  }

  function pause(): boolean {
    if (!send('PAUSE')) return false
    stopClock()
    analytics.track('race_paused', {
      roundIndex: currentRoundIndex.value,
      elapsedMs: elapsedAtCheckpoint.value,
    })
    return true
  }

  function resume(): boolean {
    if (!send('RESUME')) return false
    runClock()
    analytics.track('race_resumed', {
      roundIndex: currentRoundIndex.value,
      elapsedMs: elapsedAtCheckpoint.value,
    })
    return true
  }

  /** The single Start / Pause button. */
  function toggle(): boolean {
    if (can(status.value, 'START')) return start()
    if (can(status.value, 'PAUSE')) return pause()
    if (can(status.value, 'RESUME')) return resume()
    return false
  }

  /** Called by the round timer: publish the result, then intermission or finish (R5, A4). */
  function finishRound(): void {
    const race = currentRace.value
    if (!race || status.value !== 'running') return

    clearTimer()
    elapsedAtCheckpoint.value = race.durationMs
    checkpointAt.value = null
    results.value = [...results.value, race.result]

    const [winner] = race.result.placings
    analytics.track('round_finished', {
      roundIndex: race.round.index,
      distance: race.round.distance,
      winnerId: (winner as Placing).horseId,
      durationMs: race.durationMs,
    })

    if (isLastRound.value) {
      send('PROGRAM_FINISHED')
      analytics.track('race_finished', {
        seed: seed.value as number,
        rounds: results.value.length,
      })
      return
    }

    send('ROUND_FINISHED')
    currentRoundIndex.value += 1
    elapsedAtCheckpoint.value = 0
    timer = setTimeout(beginNextRound, INTERMISSION_MS / speed.value)
  }

  /** Intermission timer. Pausing clears it, so the transition is always valid here. */
  function beginNextRound(): void {
    send('NEXT_ROUND')
    runClock()
  }

  /** 1× / 2× / 4×. Rebases the clock so the race continues smoothly from the same spot. */
  function setSpeed(next: RaceSpeed): void {
    if (next === speed.value) return
    const previous = speed.value
    if (isClockRunning.value) {
      elapsedAtCheckpoint.value = elapsedMs()
      checkpointAt.value = now()
      speed.value = next
      scheduleRoundEnd()
    } else {
      speed.value = next
    }
    analytics.track('speed_changed', { from: previous, to: next })
  }

  return {
    status,
    seed,
    currentRoundIndex,
    speed,
    currentRound,
    currentRace,
    completedResults,
    isLastRound,
    isClockRunning,
    canGenerate,
    canToggle,
    canReplay,
    elapsedMs,
    initialize,
    generateProgram,
    replay,
    start,
    pause,
    resume,
    toggle,
    setSpeed,
  }
})
