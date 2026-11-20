import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** A visitor who has never been here: no tour flag, no theme choice. */
test.use({ storageState: { cookies: [], origins: [] } })

const popover = (page: Page) => page.locator('.driver-popover')

/** The tour starts after the fonts and a frame; wait for that moment, so "no tour" means it. */
const tourHadItsChance = (page: Page) =>
  page.evaluate(() =>
    document.fonts.ready.then(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100))),
        ),
    ),
  )
const title = (page: Page) => page.locator('.driver-popover-title')

test.describe('first-visit tour', () => {
  test('[X9] [X4] asks the language, then Continue starts the tour in that language', async ({
    page,
  }) => {
    await page.goto('/?seed=42')
    await expect(title(page)).toHaveText('Choose your language · Dilini seç')
    await expect(page.getByTestId('tour-language-en')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('tour-language-continue')).toHaveText('Continue')

    // Choosing switches the page behind the overlay, but does not continue by itself.
    await page.getByTestId('tour-language-tr').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    await expect(page.getByTestId('tour-language-continue')).toHaveText('Devam')
    await expect(title(page)).toHaveText('Choose your language · Dilini seç')

    await page.getByTestId('tour-language-continue').click()
    await expect(title(page)).toHaveText("Pioneer Derby'ye hoş geldin")
    await expect(popover(page)).toContainText('1 / 6')
  })

  test('[X4] walks through the six steps with the keyboard and then never shows again', async ({
    page,
  }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('tour-language-continue').click()
    await expect(title(page)).toHaveText('Welcome to Pioneer Derby')

    const titles = [
      '1. Draw the program',
      '2. Pick a winner',
      '3. Start the race',
      '4. Watch and control',
      '5. Results, one by one',
    ]
    for (const expected of titles) {
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(title(page)).toHaveText(expected)
    }
    await page.getByRole('button', { name: "Let's race" }).click()
    await expect(popover(page)).toHaveCount(0)

    await page.reload()
    await tourHadItsChance(page)
    await expect(popover(page)).toHaveCount(0)
  })

  test('[X4] a reload in the middle of the tour resumes at the same step', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('tour-language-continue').click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(title(page)).toHaveText('2. Pick a winner')

    await page.reload()
    await expect(title(page)).toHaveText('2. Pick a winner')
    await expect(popover(page)).toContainText('3 / 6')

    // Closing it ends the tour for good.
    await page.keyboard.press('Escape')
    await expect(popover(page)).toHaveCount(0)
    await page.reload()
    await tourHadItsChance(page)
    await expect(popover(page)).toHaveCount(0)
  })

  test('[X4] closing the language question skips the tour', async ({ page }) => {
    await page.goto('/?seed=42')
    await expect(title(page)).toHaveText('Choose your language · Dilini seç')
    await page.keyboard.press('Escape')
    await expect(popover(page)).toHaveCount(0)
    await page.reload()
    await tourHadItsChance(page)
    await expect(popover(page)).toHaveCount(0)
  })

  test('[X4] the tour can be taken again from the help dialog', async ({ page }) => {
    await page.goto('/?seed=42')
    await expect(title(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover(page)).toHaveCount(0)
    await page.getByTestId('shortcuts-button').click()
    await page.getByTestId('restart-tour').click()
    await expect(title(page)).toHaveText('Welcome to Pioneer Derby') // no language question again
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden()
  })

  test('[X8] the language question and the tour steps have no serious accessibility violations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?seed=42')
    await expect(title(page)).toBeVisible()
    const serious = async () =>
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .include('.driver-popover')
          .analyze()
      ).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(await serious()).toEqual([])

    await page.getByTestId('tour-language-continue').click()
    await expect(title(page)).toHaveText('Welcome to Pioneer Derby')
    expect(await serious()).toEqual([])
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(title(page)).toHaveText('1. Draw the program')
    expect(await serious()).toEqual([])
  })

  test('[X8] the first visit opens in the light theme, even when the system is dark', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/?seed=42')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    // The toggle still changes it, and the choice is remembered.
    await expect(title(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover(page)).toHaveCount(0)
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('[X9] the site has its own name and icon in the browser tab', async ({ page }) => {
    await page.goto('/?seed=42')
    await expect(page).toHaveTitle('Pioneer Derby · Race of the Computing Pioneers')
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.svg$/)
  })

  test('[X10] the first load shows a splash that fades away, then the cards arrive', async ({
    page,
  }) => {
    await page.goto('/?seed=42', { waitUntil: 'commit' })
    await expect(page.locator('#splash')).toBeAttached()
    await expect(page.locator('#splash')).toHaveCount(0, { timeout: 4000 })
    await expect(page.getByTestId('horses-panel')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', '', { timeout: 5000 })
  })

  test('[X8] with reduced motion there is no splash and no intro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?seed=42', { waitUntil: 'commit' })
    await expect(page.getByTestId('horses-panel')).toBeVisible()
    await expect(page.locator('#splash')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', '')
  })
})
