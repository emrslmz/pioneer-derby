import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FAST, installClock, ROUND_1_AT_FAST, runUntil } from './clock'

test.describe('broadcast layer', () => {
  test('[X13] live standings and commentary follow the race', async ({ page }) => {
    await installClock(page)
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByTestId('toggle-button').click()

    await expect(page.getByTestId('leaderboard-entry')).toHaveCount(10)
    await expect(page.getByTestId('commentary-line')).toHaveText(
      "And they're off in the 1st Lap – 1200 m!",
    )
    const line = page.getByTestId('commentary-line')
    await runUntil(page, async () => ((await line.textContent()) ?? '').includes('Halfway'))
  })

  test('[X13] between rounds the podium of the finished round is shown', async ({ page }) => {
    await installClock(page)
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    await page.clock.runFor(ROUND_1_AT_FAST)

    const board = page.getByTestId('round-result')
    await expect(board).toBeVisible()
    await expect(board).toContainText('1st Lap – 1200 m · Result')
    await expect(board.getByTestId('result-podium-row')).toHaveCount(3)
    await expect(board.getByTestId('result-next')).toHaveText('Next up: 2nd Lap – 1400 m')
    await expect(page.locator('.track__number--winner')).toHaveCount(1)
    // The board names the same winner as the results table.
    const winner = await board
      .getByTestId('result-podium-row')
      .first()
      .locator('.board__name')
      .textContent()
    await expect(page.getByTestId('result-round').first()).toContainText(winner!)
  })

  test('[X13] a photo finish is called and stamped', async ({ page }) => {
    // Seed 17 has a photo finish in the first round.
    await installClock(page)
    await page.goto('/?seed=17')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    await page.clock.runFor(ROUND_1_AT_FAST)
    await expect(page.getByTestId('photo-finish')).toBeVisible()
    await expect(page.getByTestId('photo-finish')).toContainText('Photo finish')
  })

  test('[X8] podium, leaderboard and ticker have no serious accessibility violations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await installClock(page)
    await page.goto('/?seed=17')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()
    await page.clock.runFor(ROUND_1_AT_FAST)
    await expect(page.getByTestId('round-result')).toBeVisible()
    await page.getByTestId('toggle-button').click()

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
