import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { FAST, installClock, PROGRAM_AT_FAST } from './clock'

/** Plays a whole program (with the recommended horse picked in round 1) and waits for the summary. */
async function finishProgram(page: Page) {
  await installClock(page)
  await page.goto('/?seed=42')
  await page.getByTestId('generate-button').click()
  await page.getByTestId('pick-tip-button').click()
  await page.getByRole('radio', { name: FAST }).click()
  await page.getByTestId('toggle-button').click()
  await page.clock.runFor(PROGRAM_AT_FAST)
}

test.describe('program summary', () => {
  test('[X13] opens after the sixth round with the champion, a chart and every round winner', async ({
    page,
  }) => {
    await finishProgram(page)
    const summary = page.getByTestId('program-summary')
    await expect(summary).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Program summary' })).toBeVisible()
    await expect(page.getByTestId('summary-champion')).toContainText('wins')
    await expect(page.getByTestId('summary-chart-row').first()).toBeVisible()
    await expect(page.getByTestId('summary-rounds').locator('tbody tr')).toHaveCount(6)
    await expect(page.getByTestId('summary-score')).toContainText('/ 18')

    // The champion in the card is the first horse of the chart.
    const champion = await page
      .getByTestId('summary-champion')
      .locator('.champion__name')
      .textContent()
    const first = await page
      .getByTestId('summary-chart-row')
      .first()
      .locator('.short-name__visible')
      .textContent()
    expect(champion!.startsWith(first!.split(' ')[0]!)).toBe(true)
  })

  test('[X13] closes with Escape, reopens from the Results panel, and replays from the dialog', async ({
    page,
  }) => {
    await finishProgram(page)
    await expect(page.getByTestId('program-summary')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('program-summary')).toBeHidden()

    await page.getByTestId('summary-open').click()
    await expect(page.getByTestId('program-summary')).toBeVisible()
    await page.getByTestId('summary-replay').click()
    await expect(page.getByTestId('program-summary')).toBeHidden()
    await expect(page.getByTestId('race-status')).toContainText('Ready')
    await expect(page.getByTestId('summary-open')).toHaveCount(0)
  })

  test('[X8] has no serious accessibility violations, on desktop and on a phone', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await finishProgram(page)
    await expect(page.getByTestId('program-summary')).toBeVisible()
    const serious = async () =>
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .include('dialog[open]')
          .analyze()
      ).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(await serious()).toEqual([])

    await page.setViewportSize({ width: 390, height: 844 })
    expect(await serious()).toEqual([])
  })

  test('[T2] fits a phone without sideways scrolling and keeps the buttons in reach', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await finishProgram(page)
    const dialog = page.locator('dialog[open]')
    await expect(dialog).toBeVisible()
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByTestId('summary-replay')).toBeInViewport()
  })
})
