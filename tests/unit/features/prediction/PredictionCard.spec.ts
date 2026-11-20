import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { HORSE_COLORS } from '@/domain/constants'
import PredictionCard from '@/features/prediction/components/PredictionCard.vue'
import RunnerPicker from '@/features/prediction/components/RunnerPicker.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'
import { mountFeature } from '../mount'

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

function setup(locale: 'en' | 'tr' = 'en') {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  return mountFeature(PredictionCard, { locale, attachTo: document.body })
}

describe('PredictionCard', () => {
  it('[R3] before a program: one hint line, the game row reserved but inert', async () => {
    const { wrapper, race } = setup()
    const guide = wrapper.get('[data-testid="onboarding"]')
    expect(guide.text()).toBe('Generate a program to start predicting.')
    // The game layer still reserves its space (same card height) but is inert and hidden.
    const game = wrapper.get('.prediction__game')
    expect(game.attributes('inert')).toBeDefined()
    expect(game.classes()).toContain('is-hidden')
    expect(wrapper.findAll('.picker__runner--placeholder')).toHaveLength(10)

    race.generateProgram()
    await nextTick()
    expect(wrapper.get('[data-testid="onboarding"]').attributes('inert')).toBeDefined()
    expect(wrapper.get('.prediction__game').attributes('inert')).toBeUndefined()
    expect(wrapper.get('[data-testid="prediction-score"]').text()).toBe('0 pts')
  })

  it('[X4] offers the 10 runners and explains the recommended horse', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()

    expect(wrapper.text()).toContain('Who wins the 1st Lap – 1200 m?')
    expect(wrapper.findAll('[data-testid="pick-option"]')).toHaveLength(10)
    const tip = usePredictionStore().recommendation!
    const name = useHorsesStore().getHorse(tip.horseId)!.name
    expect(wrapper.get('[data-testid="recommendation"]').text()).toMatch(
      new RegExp(`^Recommended: ${name} — .+\\.$`),
    )
    expect(
      wrapper
        .get(`[data-testid="pick-option"][data-horse-id="${tip.horseId}"]`)
        .find('[data-testid="pick-tip"]')
        .exists(),
    ).toBe(true)

    // One click backs the recommended horse.
    await wrapper.get('[data-testid="pick-tip-button"]').trigger('click')
    expect(usePredictionStore().currentPick).toBe(tip.horseId)
    // Hidden but kept in place, so the card does not change height.
    const tipButton = wrapper.get('[data-testid="pick-tip-button"]')
    expect(tipButton.classes()).toContain('is-hidden')
    expect(tipButton.attributes('disabled')).toBeDefined()
  })

  it('[X9] joins reasons with the locale list format', async () => {
    const { wrapper, race } = setup('tr')
    race.generateProgram()
    await nextTick()
    expect(wrapper.get('[data-testid="recommendation"]').text()).toContain('Önerimiz:')
  })

  it('[X4] picking a runner stores the prediction; it locks when the round starts', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    const option = wrapper.findAll('[data-testid="pick-option"]')[4]!
    await option.trigger('click')
    expect(option.attributes('aria-checked')).toBe('true')
    const horseId = Number(option.attributes('data-horse-id'))
    expect(usePredictionStore().currentPick).toBe(horseId)

    race.start()
    await nextTick()
    // While the round runs, the same grid stays in place: locked, with the pick still marked.
    const radios = wrapper.findAll('[data-testid="pick-option"]')
    expect(radios).toHaveLength(10)
    expect(radios.every((r) => r.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.get('[aria-checked="true"]').attributes('data-horse-id')).toBe(String(horseId))
    const name = useHorsesStore().getHorse(horseId)!.name
    expect(wrapper.get('[data-testid="prediction-locked"]').text()).toContain(`Your pick: ${name}`)
    expect(wrapper.get('[data-testid="prediction-locked"]').text()).toContain(
      'Scored when the round ends.',
    )
  })

  it('[X4] shows the outcome and the running score after each round', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    await nextTick()
    const winner = race.currentRace!.result.placings[0]!.horseId
    usePredictionStore().pick(winner)
    race.start()
    vi.advanceTimersByTime(race.currentRace!.durationMs + 1)
    await nextTick()

    const name = useHorsesStore().getHorse(winner)!.name
    expect(wrapper.get('[data-testid="prediction-outcome"]').text()).toBe(
      `1st Lap – 1200 m: ${name} won! +3 pts`,
    )
    expect(wrapper.get('[data-testid="prediction-outcome"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('[data-testid="prediction-score"]').text()).toBe('3 pts')
  })

  it('[X4] sums up the game when the program finishes', async () => {
    const { wrapper, race } = setup()
    race.generateProgram()
    race.start()
    race.setAutoAdvance(true)
    vi.runAllTimers()
    await nextTick()
    expect(wrapper.get('[data-testid="prediction-final"]').text()).toBe(
      'Final score: 0 points · 0 of 6 winners called.',
    )
  })
})

describe('RunnerPicker', () => {
  const runners = [1, 2, 3].map((id) => ({
    id,
    name: `Horse ${id}`,
    color: HORSE_COLORS[id]!,
    condition: 50,
  }))

  it('[X8] is a radio group navigable with arrow keys', async () => {
    const wrapper = mount(RunnerPicker, {
      attachTo: document.body,
      props: {
        runners,
        label: 'Your pick',
        recommendedId: 2,
        recommendedLabel: 'Tip',
        modelValue: null,
        'onUpdate:modelValue': (value: number | null) => wrapper.setProps({ modelValue: value }),
      },
    })
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Your pick')
    const radios = () => wrapper.findAll('[role="radio"]')
    expect(radios().map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(radios()[1]!.find('[data-testid="pick-tip"]').text()).toBe('Tip')

    await radios()[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe(2)
    expect(document.activeElement?.textContent).toContain('Horse 2')

    await radios()[1]!.trigger('keydown', { key: 'Tab' })
    expect(wrapper.props('modelValue')).toBe(2)
  })

  it('[X4] does nothing when disabled', async () => {
    const wrapper = mount(RunnerPicker, {
      props: {
        runners,
        label: 'x',
        recommendedId: null,
        recommendedLabel: 'Tip',
        modelValue: 1,
        disabled: true,
      },
    })
    await wrapper.findAll('[role="radio"]')[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
