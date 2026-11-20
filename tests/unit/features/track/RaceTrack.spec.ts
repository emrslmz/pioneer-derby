import { mount } from '@vue/test-utils'
import { INTERMISSION_MS } from '@/domain/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import HorseRunner from '@/features/track/components/HorseRunner.vue'
import RaceTrack from '@/features/track/components/RaceTrack.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { setReducedMotion } from '../../setup'
import { mountFeature } from '../mount'

afterEach(() => {
  vi.useRealTimers()
  setReducedMotion(false)
})

function setupWithSeed(seed: number) {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  })
  return mountFeature(RaceTrack, { seed })
}

function setup(locale: 'en' | 'tr' = 'en') {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  })
  return mountFeature(RaceTrack, { locale })
}

/** Progress (0–100 %) currently painted on each runner. */
function painted(wrapper: ReturnType<typeof setup>['wrapper']): number[] {
  return wrapper.findAll('[data-testid="runner"]').map((runner) => {
    const match = /translate3d\(([\d.]+)%/.exec(runner.attributes('style') ?? '')
    return match ? Number(match[1]) : 0
  })
}

const frames = async (ms: number) => {
  vi.advanceTimersByTime(ms)
  await nextTick()
}

describe('RaceTrack', () => {
  it('[R6] draws 10 numbered lanes with a finish line, and invites you to generate', () => {
    const { wrapper } = setup()
    const lanes = wrapper.findAll('[data-testid="track-lane"]')
    expect(lanes).toHaveLength(10)
    expect(lanes.map((lane) => lane.get('.lane__number').text())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ])
    expect(wrapper.find('.finish').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="runner"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="track-overlay"]').text()).toContain('No program yet')
  })

  it('[R6] lines up the 10 horses of the current round in lane order, in their own colours', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()

    const runners = wrapper.findAll('[data-testid="runner"]')
    expect(runners.map((r) => Number(r.attributes('data-horse-id')))).toEqual(
      race.currentRound!.horseIds,
    )
    const firstHorse = useHorsesStore().getHorse(race.currentRound!.horseIds[0]!)!
    expect(runners[0]!.get('svg').attributes('style')).toContain(firstHorse.color.hex)
    expect(runners[0]!.text()).toContain(String(firstHorse.id))
    expect(wrapper.get('[data-testid="track-caption"]').text()).toBe('1st Lap – 1200 m')
    const overlay = wrapper.get('[data-testid="track-overlay"]')
    expect(overlay.get('.track__eyebrow').text()).toBe('Ready')
    expect(overlay.get('.track__title').text()).toBe('1st Lap – 1200 m')
    expect(overlay.get('.track__hint').text()).toBe('Press Start or Space to run it.')
  })

  it('[R6] horses visibly move forward while the round runs, using transform only', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    await nextTick()
    expect(painted(wrapper).every((p) => p === 0)).toBe(true)

    race.start()
    await frames(1500)
    const early = painted(wrapper)
    expect(early.every((p) => p > 0 && p < 100)).toBe(true)

    await frames(1500)
    const later = painted(wrapper)
    later.forEach((p, i) => expect(p).toBeGreaterThan(early[i]!))
    for (const runner of wrapper.findAll('[data-testid="runner"]')) {
      expect(runner.attributes('style')).not.toMatch(/left|width/)
    }
  })

  it('[R4] pausing freezes the horses exactly where they are', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    race.start()
    await frames(2000)

    race.pause()
    await nextTick()
    await nextTick()
    const frozen = painted(wrapper)
    await frames(5000)
    expect(painted(wrapper)).toEqual(frozen)
    expect(wrapper.get('[data-testid="track-overlay"] .track__eyebrow').text()).toBe('Paused')
  })

  it('[X13] between rounds the finished round stays on screen with its podium', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    race.start()
    const firstLineUp = race.currentRound!.horseIds
    const winner = race.currentRace!.result.placings[0]!.horseId
    await frames(race.currentRace!.durationMs + 1)
    await nextTick()
    await nextTick()

    expect(race.status).toBe('intermission')
    expect(
      wrapper.findAll('[data-testid="runner"]').map((r) => Number(r.attributes('data-horse-id'))),
    ).toEqual(firstLineUp)
    expect(painted(wrapper).every((p) => p === 100)).toBe(true)
    expect(wrapper.get('.lane--winner [data-testid="runner"]').attributes('data-horse-id')).toBe(
      String(winner),
    )
    const board = wrapper.get('[data-testid="round-result"]')
    expect(board.text()).toContain('1st Lap – 1200 m · Result')
    const rows = board.findAll('[data-testid="result-podium-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain(useHorsesStore().getHorse(winner)!.name)
    expect(board.get('[data-testid="result-next"]').text()).toBe('Next up: 2nd Lap – 1400 m')
    expect(wrapper.get('[data-testid="track-caption"]').text()).toBe('1st Lap – 1200 m')

    // The next round brings the next line-up, back at the start.
    await frames(INTERMISSION_MS + 1)
    await nextTick()
    await nextTick()
    expect(race.status).toBe('running')
    expect(wrapper.find('[data-testid="round-result"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="track-caption"]').text()).toBe('2nd Lap – 1400 m')
  })

  it('[X4] the result board shows how your prediction did', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    const { usePredictionStore } = await import('@/stores/prediction.store')
    const winner = race.currentRace!.result.placings[0]!.horseId
    usePredictionStore().pick(winner)
    race.start()
    await frames(Math.ceil(race.currentRace!.durationMs) + 1)
    await nextTick()
    await nextTick()
    expect(wrapper.get('[data-testid="result-pick"]').text()).toBe('Your pick won: +3 pts')
  })

  it('[X13] shows live standings and commentary while racing', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    expect(wrapper.find('[data-testid="leaderboard"]').exists()).toBe(false)

    race.start()
    await frames(50)
    expect(wrapper.findAll('[data-testid="leaderboard-entry"]')).toHaveLength(10)
    expect(wrapper.get('[data-testid="commentary-line"]').text()).toBe(
      "And they're off in the 1st Lap – 1200 m!",
    )

    await frames(race.currentRace!.result.placings[0]!.timeMs)
    expect(wrapper.get('[data-testid="leaderboard-entry"]').attributes('data-horse-id')).toBe(
      String(race.currentRace!.result.placings[0]!.horseId),
    )
  })

  it('[X13] a photo finish flashes the camera and is stamped on the podium', async () => {
    const { wrapper, race } = setupWithSeed(17)
    race.generateProgram()
    race.start()
    await frames(race.currentRace!.result.placings[0]!.timeMs - 200)
    expect(wrapper.get('[data-testid="commentary-line"]').text()).toBe("It's a photo finish!")
    expect(wrapper.find('[data-testid="photo-flash"]').exists()).toBe(true)

    await frames(Math.ceil(race.currentRace!.durationMs - race.elapsedMs()) + 1)
    await nextTick()
    await nextTick()
    expect(race.status).toBe('intermission')
    expect(wrapper.get('[data-testid="photo-finish"]').text()).toMatch(
      /^Photo finish · won by 0\.\d\ds$/,
    )
  })

  it('[X8] no camera flash under reduced motion', async () => {
    setReducedMotion(true)
    const { wrapper, race } = setupWithSeed(17)
    race.generateProgram()
    race.start()
    await frames(race.currentRace!.result.placings[0]!.timeMs + 20)
    expect(wrapper.find('[data-testid="photo-flash"]').exists()).toBe(false)
  })

  it('[X10] the store does not change while horses move (positions are never written to Pinia)', async () => {
    const { race } = setup()
    race.generateProgram()
    race.start()
    await frames(100)
    const snapshot = JSON.stringify(race.$state)
    await frames(2000)
    expect(JSON.stringify(race.$state)).toBe(snapshot)
  })

  it('[R6] gallops only while running, and never with reduced motion', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    expect(wrapper.find('.runner--galloping').exists()).toBe(false)

    race.start()
    await nextTick()
    expect(wrapper.findAll('.runner--galloping')).toHaveLength(10)

    setReducedMotion(true)
    await nextTick()
    expect(wrapper.find('.runner--galloping').exists()).toBe(false)
  })

  it('[X8] exposes the track as one labelled image; runners are decorative', async () => {
    const { wrapper, race } = setup('tr')
    race.generateProgram()
    await nextTick()
    const track = wrapper.get('[data-testid="race-track"]')
    expect(track.attributes('role')).toBe('img')
    expect(track.attributes('aria-label')).toBe(
      'Yarış pisti — 1. Tur – 1200 m. 10 at, 1. kulvar en üstte; bitiş çizgisi sağda.',
    )
    expect(wrapper.get('svg.runner').attributes('aria-hidden')).toBe('true')
  })

  it('[C6] shows a distance marker every 200 m of the round', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    expect(wrapper.findAll('.track__marker-label').map((m) => m.text())).toEqual([
      '200 m',
      '400 m',
      '600 m',
      '800 m',
      '1000 m',
    ])
  })
})

describe('HorseRunner', () => {
  it('[C2] paints the coat in the horse colour and shows its number', () => {
    const wrapper = mount(HorseRunner, { props: { color: '#1e88e5', number: 7, galloping: false } })
    expect(wrapper.attributes('style')).toContain('--coat: #1e88e5')
    expect(wrapper.get('.runner__number').text()).toBe('7')
    expect(wrapper.classes()).not.toContain('runner--galloping')
  })
})
