import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`[X8] no serious violations — idle and running, ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.goto('/?seed=42')
      expect(await seriousViolations(page)).toEqual([])

      await page.getByTestId('generate-button').click()
      await page.getByTestId('toggle-button').click()
      expect(await seriousViolations(page)).toEqual([])
    })
  }

  for (const scheme of ['dark', 'light'] as const) {
    test(`[X8] no serious violations with results on screen, ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.goto('/?seed=42')
      await page.getByTestId('generate-button').click()
      await page.getByRole('radio', { name: '4×' }).click()
      await page.getByTestId('toggle-button').click()
      await expect(page.getByTestId('result-round')).toHaveCount(1, { timeout: 10_000 })
      expect(await seriousViolations(page)).toEqual([])
    })
  }

  test('[X8] with reduced motion, content is named the instant it appears', async ({ page }) => {
    // Regression: a reduced-motion rule that only shortened transitions turned them on for every
    // property, so names stayed visibility:hidden for a moment after Generate.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    const names = await page
      .getByTestId('pick-option')
      .evaluateAll((options) =>
        options.map((o) => getComputedStyle(o.querySelector('.short-name__visible')!).visibility),
      )
    expect(names).toEqual(Array(10).fill('visible'))
  })

  test('[X8] mobile layout has no serious violations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/?seed=42')
    expect(await seriousViolations(page)).toEqual([])
  })

  test('[X8] the skip link moves focus to the race track', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to the race' })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page.locator('#race-track')).toBeFocused()
  })
})
