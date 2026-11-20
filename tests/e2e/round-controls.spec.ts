import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FAST, ROUND_1_AT_8X } from './clock'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') })
  await page.goto('/?seed=42')
  await page.clock.pauseAt(new Date('2026-11-20T12:00:05Z'))
  await page.getByTestId('generate-button').click()
  await page.getByRole('radio', { name: FAST }).click()
})

test('[R4] [X4] manual advance keeps the next prediction open until Continue', async ({ page }) => {
  // Auto advance is on by default (Start runs the program); switch it off for manual control.
  await expect(page.getByTestId('auto-advance')).toBeChecked()
  await page.getByTestId('auto-advance').uncheck()
  await page.getByTestId('toggle-button').click()
  await page.clock.runFor(ROUND_1_AT_8X + 15_000) // well past the 6 s break: it waits
  await expect(page.getByTestId('result-round')).toHaveCount(1)
  await expect(page.getByTestId('toggle-button')).toContainText('Next round')
  await page.getByTestId('pick-option').first().click()
  await expect(page.getByTestId('pick-option').first()).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('next-round').click()
  await expect(page.getByTestId('race-status')).toContainText('Live')
  await expect(page.getByTestId('track-caption')).toContainText('2nd Lap')
  await expect(page.getByTestId('prediction-locked')).toContainText('Your pick:')
})

test('[R4] auto advance can be enabled and cancelled during the break', async ({ page }) => {
  await page.getByTestId('auto-advance').uncheck()
  await page.getByTestId('toggle-button').click()
  await page.clock.runFor(ROUND_1_AT_8X + 5_000)
  await page.getByTestId('auto-advance').check()
  await page.clock.runFor(1_000)
  await page.getByTestId('auto-advance').uncheck()
  await page.clock.runFor(10_000)
  await expect(page.getByTestId('result-round')).toHaveCount(1)
  await page.getByTestId('auto-advance').check()
  await page.clock.runFor(6_100)
  await expect(page.getByTestId('track-caption')).toContainText('2nd Lap')
  await expect(page.getByTestId('race-status')).toContainText('Live')
})

test('[R6] [X8] theater keeps the live camera and the player controls in one accessible modal', async ({
  page,
}, testInfo) => {
  await page.getByTestId('pick-option').first().click()
  await page.getByTestId('toggle-button').click()
  await page.clock.runFor(4_000)
  const before = await page.getByTestId('map-dot').first().getAttribute('style')
  await page.getByTestId('track-expand').click()
  const dialog = page.getByTestId('track-theater')
  await expect(dialog).toBeVisible()
  const after = await dialog.getByTestId('map-dot').first().getAttribute('style')
  const progress = (style: string) => Number(/translate3d\(([\d.]+)%/.exec(style)![1])
  expect(Math.abs(progress(after!) - progress(before!))).toBeLessThan(0.2)
  await page.clock.runFor(1_000)
  await dialog.getByTestId('player-toggle').click()
  await expect(dialog.getByTestId('track-banner')).toContainText('Paused')
  await expect(dialog.getByTestId('track-play')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('paused-theater.png') })
  // axe schedules its own timers; let time flow again (the race itself is paused).
  await page.clock.resume()
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('track-expand')).toBeFocused()
})

test('[X6] the delivery demo captures a deterministic race and its manual break', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.getByTestId('auto-advance').uncheck()
  await page.getByTestId('pick-option').first().click()
  await page.getByTestId('track-expand').click()
  await page.getByTestId('player-toggle').click()
  for (let frame = 0; frame < 12; frame++) {
    await page.clock.runFor(1_400)
    await page.screenshot({
      path: testInfo.outputPath(`demo-${String(frame).padStart(2, '0')}.png`),
    })
  }
  await expect(page.getByTestId('next-round')).toBeVisible()
})
