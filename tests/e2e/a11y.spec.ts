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
