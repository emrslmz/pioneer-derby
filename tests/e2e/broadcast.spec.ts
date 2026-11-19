import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('broadcast layer', () => {
  test('[X13] live standings and commentary follow the race', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByTestId('toggle-button').click()

    await expect(page.getByTestId('leaderboard-entry')).toHaveCount(10)
    await expect(page.getByTestId('commentary-line')).toHaveText(
      "And they're off in the 1st Lap – 1200 m!",
    )
    await expect(page.getByTestId('commentary-line')).toContainText('Halfway', { timeout: 10_000 })
  })

  test('[X13] between rounds the podium of the finished round is shown', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: '4×' }).click()
    await page.getByTestId('toggle-button').click()

    const podium = page.getByTestId('podium')
    await expect(podium).toBeVisible({ timeout: 10_000 })
    await expect(podium).toContainText('1st Lap – 1200 m — result')
    await expect(podium).toContainText('Next up: 2nd Lap – 1400 m')
    await expect(page.locator('.lane--winner')).toHaveCount(1)
    // The commentary names the same winner as the results table.
    const winner = await page
      .getByTestId('result-round')
      .first()
      .locator('tbody tr')
      .first()
      .locator('.swatch__label')
      .textContent()
    await expect(page.getByTestId('commentary-line')).toHaveText(
      `${winner} wins the 1st Lap – 1200 m!`,
    )
  })

  test('[X13] a photo finish is called and stamped', async ({ page }) => {
    // Seed 17 has a photo finish in the first round.
    await page.goto('/?seed=17')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: '4×' }).click()
    await page.getByTestId('toggle-button').click()
    await expect(page.getByTestId('photo-finish')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('photo-finish')).toContainText('Photo finish')
  })

  test('[X8] podium, leaderboard and ticker have no serious accessibility violations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?seed=17')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: '4×' }).click()
    await page.getByTestId('toggle-button').click()
    await expect(page.getByTestId('podium')).toBeVisible({ timeout: 10_000 })
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
