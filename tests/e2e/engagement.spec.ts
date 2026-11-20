import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FAST, installClock, PROGRAM_AT_FAST, ROUND_1_AT_FAST } from './clock'

test.describe('engagement layer', () => {
  test.setTimeout(90_000)

  test('[X4] pick the winner, see the tip, and score points', async ({ page }) => {
    await installClock(page)
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()

    const card = page.getByTestId('prediction-card')
    await expect(card).toContainText('Who wins the 1st Lap – 1200 m?')
    await expect(page.getByTestId('recommendation')).toContainText('Recommended:')
    await expect(page.getByTestId('pick-option')).toHaveCount(10)

    // Back the recommended horse.
    const tip = page.getByTestId('pick-option').filter({ hasText: 'Tip' })
    await tip.click()
    await expect(tip).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    await expect(page.getByTestId('prediction-locked')).toContainText('Your pick:')
    await page.clock.runFor(ROUND_1_AT_FAST)
    await expect(page.getByTestId('prediction-outcome')).toContainText('1st Lap – 1200 m:')
    await expect(page.getByTestId('prediction-score')).toHaveText(/^\d+ pts$/)
  })

  test('[X4] the prediction card keeps the same height in every state (no layout shift)', async ({
    page,
  }) => {
    // No intro animation: a card scaled in mid-animation would measure a different height.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') })
    await page.goto('/?seed=42')
    await page.clock.pauseAt(new Date('2026-11-20T12:00:05Z'))
    const card = page.getByTestId('prediction-card')
    const height = async () => (await card.boundingBox())!.height

    const idle = await height()
    await page.getByTestId('generate-button').click()
    const ready = await height()
    await page.getByTestId('pick-tip-button').click()
    const picked = await height()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    await page.clock.runFor(3_000)
    const running = await height()
    await page.clock.runFor(ROUND_1_AT_FAST - 3_000) // into the break, with an outcome
    await expect(page.getByTestId('round-result')).toBeVisible()
    const intermission = await height()

    expect([ready, picked, running, intermission]).toEqual([idle, idle, idle, idle])
  })

  test('[R2] hovering a shortened horse name shows the full name in a tooltip', async ({
    page,
  }) => {
    await page.goto('/?seed=42')
    const name = page.getByTestId('horse-name').first()
    await name.hover()
    // The bubble is aria-hidden (the full name is already in the accessible name), so find it by test id.
    const tooltip = page.getByTestId('tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toHaveText(/^\S+ .+$/)
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
  })

  test('[X12] horse statistics open from the list and close with Escape', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('horse-name').first().click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('stat-roundsRun')).toHaveText('0')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('[X11] the share button copies a link that replays the same game', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/?seed=31337')
    await page.getByTestId('share-button').click()
    await expect(page.getByTestId('share-status')).toContainText('Link copied')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toMatch(/[?&]seed=31337/)
  })

  test('[X11] Replay reruns the finished program with identical results', async ({ page }) => {
    await installClock(page)
    await page.goto('/?seed=5')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    const results = page.getByTestId('result-round')
    await page.clock.runFor(PROGRAM_AT_FAST)
    await expect(results).toHaveCount(6)
    const first = await results.locator('.swatch__label').allTextContents()

    await expect(page.getByTestId('toggle-button')).toContainText('Replay')
    await page.getByTestId('toggle-button').click()
    await expect(results).toHaveCount(0)
    await page.getByTestId('toggle-button').click()
    await page.clock.runFor(PROGRAM_AT_FAST)
    await expect(results).toHaveCount(6)
    await expect(results.locator('.swatch__label')).toHaveText(first)
  })

  test('[X5] ?debug=1 shows the live analytics stream', async ({ page }) => {
    await page.goto('/?seed=42&debug=1')
    const panel = page.getByTestId('debug-panel')
    await expect(panel).toBeVisible()
    await page.getByTestId('generate-button').click()
    await expect(panel.getByTestId('debug-event').first()).toContainText('program_generated')
  })

  test('[X8] the engagement layer has no serious accessibility violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByTestId('horse-name').first().click()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
  })
})
