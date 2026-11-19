import { afterEach, describe, expect, it, vi } from 'vitest'
import { INTERMISSION_MS } from '@/domain/constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import { useHorsesStore } from '@/stores/horses.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { eventNames, msToRoundEnd, setupRace } from './race-helpers'

afterEach(() => vi.useRealTimers())

describe('race store', () => {
  describe('initialize & generate', () => {
    it('[R2] app load shows the horses but no program yet (A2)', () => {
      const race = setupRace(42)

      expect(race.status).toBe('idle')
      expect(useHorsesStore().horses).toEqual(horsesForSeed(42))
      expect(useScheduleStore().hasProgram).toBe(false)
      expect(window.location.search).toBe('?seed=42')
      expect(race.canGenerate).toBe(true)
      expect(race.canToggle).toBe(false)
    })

    it('[X11] without a shared seed a fresh random seed is used', () => {
      const race = setupRace()
      race.initialize()

      expect(race.seed).toEqual(expect.any(Number))
      expect(useHorsesStore().horses).toEqual(horsesForSeed(race.seed!))
      expect(race.currentRound).toBeNull()
      expect(race.currentRace).toBeNull()
    })

    it('[R3] a paused game can be regenerated, which resets all progress', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.advanceTimersByTime(msToRoundEnd(race) + 100)
      race.pause()

      expect(race.generateProgram()).toBe(true)
      expect(race.status).toBe('ready')
      expect(race.completedResults).toEqual([])
      expect(race.currentRoundIndex).toBe(0)
      expect(race.elapsedMs()).toBe(0)
    })

    it('[R3] Generate Program builds 6 rounds from the same seed the first time', () => {
      const race = setupRace(42)

      expect(race.generateProgram()).toBe(true)
      expect(race.status).toBe('ready')
      expect(race.seed).toBe(42)
      expect(useScheduleStore().rounds).toEqual(scheduleForSeed(horsesForSeed(42), 42))
      expect(race.canToggle).toBe(true)
      expect(eventNames()).toEqual(['program_generated'])
    })

    it('[R3] generating again re-rolls horses and program with a new seed', () => {
      const race = setupRace(42)
      race.generateProgram()
      race.generateProgram()

      expect(race.seed).not.toBe(42)
      expect(useHorsesStore().horses).toEqual(horsesForSeed(race.seed!))
      expect(window.location.search).toBe(`?seed=${race.seed}`)
    })

    it('[R3] Generate is disabled while a round is running (A6)', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()

      expect(race.canGenerate).toBe(false)
      expect(race.generateProgram()).toBe(false)
      expect(race.status).toBe('running')
    })

    it('[R4] nothing can be toggled before a program exists', () => {
      const race = setupRace()
      expect(race.toggle()).toBe(false)
      expect(race.start()).toBe(false)
      expect(race.pause()).toBe(false)
      expect(race.resume()).toBe(false)
      expect(race.status).toBe('idle')
    })
  })

  describe('running rounds', () => {
    it('[R4] Start runs the first round only', () => {
      const race = setupRace()
      race.generateProgram()
      race.toggle()

      expect(race.status).toBe('running')
      expect(race.currentRoundIndex).toBe(0)
      expect(race.currentRound?.distance).toBe(1200)
    })

    it('[R5] a result appears only when its round has finished', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()

      vi.advanceTimersByTime(msToRoundEnd(race) - 1)
      expect(race.completedResults).toHaveLength(0)

      vi.advanceTimersByTime(1)
      expect(race.completedResults).toHaveLength(1)
      expect(race.completedResults[0]).toEqual(
        roundRaceForSeed(useScheduleStore().rounds[0]!, useHorsesStore().horses, 42).result,
      )
    })

    it('[R4] after a short intermission the next round starts by itself (A4)', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.advanceTimersByTime(msToRoundEnd(race))

      expect(race.status).toBe('intermission')
      expect(race.currentRound?.distance).toBe(1400)
      expect(race.elapsedMs()).toBe(0)

      vi.advanceTimersByTime(INTERMISSION_MS)
      expect(race.status).toBe('running')
      expect(race.currentRoundIndex).toBe(1)
    })

    it('[R5] runs all 6 rounds in order and publishes 6 results', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.runAllTimers()

      expect(race.status).toBe('finished')
      expect(race.completedResults.map((r) => r.distance)).toEqual([
        1200, 1400, 1600, 1800, 2000, 2200,
      ])
      expect(race.canToggle).toBe(false)
      expect(race.canGenerate).toBe(true)
      expect(eventNames().filter((name) => name === 'round_finished')).toHaveLength(6)
      expect(eventNames().at(-1)).toBe('race_finished')
    })
  })

  describe('pause, resume & speed', () => {
    it('[R4] Pause freezes the race clock and Resume continues from the same spot', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.advanceTimersByTime(2000)

      race.toggle()
      expect(race.status).toBe('paused')
      const frozen = race.elapsedMs()
      expect(frozen).toBeCloseTo(2000)

      vi.advanceTimersByTime(60_000)
      expect(race.elapsedMs()).toBe(frozen)
      expect(race.completedResults).toHaveLength(0)

      race.toggle()
      expect(race.status).toBe('running')
      vi.advanceTimersByTime(msToRoundEnd(race))
      expect(race.completedResults).toHaveLength(1)
      expect(eventNames()).toEqual([
        'program_generated',
        'race_started',
        'race_paused',
        'race_resumed',
        'round_finished',
      ])
    })

    it('[R4] pausing during the intermission holds the next round until Resume', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.advanceTimersByTime(msToRoundEnd(race))

      race.pause()
      vi.advanceTimersByTime(INTERMISSION_MS * 10)
      expect(race.status).toBe('paused')
      expect(race.elapsedMs()).toBe(0)

      race.resume()
      expect(race.status).toBe('running')
      expect(race.currentRoundIndex).toBe(1)
    })

    it('[X10] 4× speed finishes a round four times faster', () => {
      const race = setupRace()
      race.generateProgram()
      race.setSpeed(4)
      race.start()
      const duration = race.currentRace!.durationMs

      vi.advanceTimersByTime(Math.ceil(duration / 4))
      expect(race.completedResults).toHaveLength(1)
    })

    it('[X10] changing speed mid-race keeps the horses where they are', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      vi.advanceTimersByTime(1000)

      const before = race.elapsedMs()
      race.setSpeed(2)
      expect(race.elapsedMs()).toBeCloseTo(before)

      vi.advanceTimersByTime(500)
      expect(race.elapsedMs()).toBeCloseTo(before + 1000)
      race.setSpeed(2)
      expect(eventNames().filter((name) => name === 'speed_changed')).toHaveLength(1)
    })

    it('[X10] the store does not change while a round is running (no per-frame writes)', () => {
      const race = setupRace()
      race.generateProgram()
      race.start()
      const snapshot = JSON.stringify(race.$state)

      vi.advanceTimersByTime(1000)
      expect(JSON.stringify(race.$state)).toBe(snapshot)
      expect(race.elapsedMs()).toBeCloseTo(1000)
    })
  })

  describe('replay', () => {
    it('[X11] Replay runs the exact same program and results again', () => {
      const race = setupRace(7)
      race.generateProgram()
      race.start()
      vi.runAllTimers()
      const firstResults = race.completedResults

      expect(race.replay()).toBe(true)
      expect(race.status).toBe('ready')
      expect(race.seed).toBe(7)
      expect(race.completedResults).toEqual([])

      race.start()
      vi.runAllTimers()
      expect(race.completedResults).toEqual(firstResults)
    })

    it('[X11] Replay is not available before a program exists or during a round', () => {
      const race = setupRace()
      expect(race.replay()).toBe(false)
      race.generateProgram()
      race.start()
      expect(race.replay()).toBe(false)
    })
  })
})
