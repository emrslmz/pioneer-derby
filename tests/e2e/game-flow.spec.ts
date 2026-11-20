import { expect, test } from '@playwright/test'
import { FAST, installClock, PROGRAM_AT_8X, ROUND_1_AT_8X } from './clock'

/** The brief end to end: Generate → 6×10 program → Start → results one round at a time. */
test.describe('full game flow', () => {
  test.setTimeout(90_000)

  test('[R2] [R3] the horse list and a 6-round program of 10 horses each', async ({ page }) => {
    await page.goto('/?seed=42')
    const horses = page.getByTestId('horses-panel')
    await expect(horses.locator('tbody tr')).toHaveCount(20)

    await page.getByTestId('generate-button').click()
    const rounds = page.getByTestId('program-round')
    await expect(rounds).toHaveCount(6)
    for (let i = 0; i < 6; i++) await expect(rounds.nth(i).locator('tbody tr')).toHaveCount(10)
    await expect(rounds.first().locator('h3')).toHaveText('1st Lap – 1200 m')
    await expect(rounds.last().locator('h3')).toHaveText('6th Lap – 2200 m')
  })

  test('[R4] [R5] rounds run one at a time and results appear only after each round', async ({
    page,
  }) => {
    await installClock(page)
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await page.getByRole('radio', { name: FAST }).click()
    await page.getByTestId('toggle-button').click()

    const results = page.getByTestId('result-round')
    await expect(results).toHaveCount(0)
    await expect(page.getByTestId('program-round').first()).toHaveAttribute('data-state', 'live')

    // Round 1 finishes → exactly one result block, round 2 becomes current.
    await page.clock.runFor(ROUND_1_AT_8X)
    await expect(results).toHaveCount(1)
    await expect(results.first().locator('h3')).toHaveText('1st Lap – 1200 m')
    await expect(results.first().locator('tbody tr')).toHaveCount(10)
    await expect(page.getByTestId('program-round').first()).toHaveAttribute('data-state', 'done')

    // The rest of the program, still strictly in order.
    await page.clock.runFor(PROGRAM_AT_8X)
    await expect(results).toHaveCount(6)
    await expect(results.locator('h3')).toHaveText([
      '1st Lap – 1200 m',
      '2nd Lap – 1400 m',
      '3rd Lap – 1600 m',
      '4th Lap – 1800 m',
      '5th Lap – 2000 m',
      '6th Lap – 2200 m',
    ])
    await expect(page.getByTestId('race-status')).toContainText('Finished')
    await expect(page.getByTestId('generate-button')).toBeEnabled()
  })

  test('[X11] the same seed produces the same winners', async ({ page, browser }) => {
    const winners = async (target: typeof page) => {
      await installClock(target)
      await target.goto('/?seed=2024')
      await target.getByTestId('generate-button').click()
      await target.getByRole('radio', { name: FAST }).click()
      await target.getByTestId('toggle-button').click()
      await target.clock.runFor(ROUND_1_AT_8X)
      const first = target.getByTestId('result-round').first()
      await expect(first).toBeVisible()
      return first.locator('tbody tr').first().locator('.swatch__label').textContent()
    }

    const other = await browser.newPage()
    expect(await winners(page)).toBe(await winners(other))
    await other.close()
  })
})
