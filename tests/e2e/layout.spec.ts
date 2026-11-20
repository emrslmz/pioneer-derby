import { expect, test } from '@playwright/test'

test.describe('first visit', () => {
  test('[R3] a new visitor is guided to Generate Program', async ({ page }) => {
    await page.goto('/?seed=42')
    const guide = page.getByTestId('onboarding')
    await expect(guide).toBeVisible()
    await expect(guide).toContainText('Generate a program to start predicting.')
    // Generate lives where the program will appear, not in the header.
    await expect(page.locator('header').getByTestId('generate-button')).toHaveCount(0)
    await expect(page.getByTestId('program-panel').getByTestId('generate-button')).toBeVisible()
    await expect(page.getByTestId('results-panel')).toContainText('No results yet')

    await page.getByTestId('track-generate').click()
    await expect(page.getByTestId('race-status')).toContainText('Ready')
    await expect(guide).toBeHidden()
    await expect(page.getByTestId('pick-option')).toHaveCount(10)
  })

  test('[R4] slow motion: 0.5× is available', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByRole('radio', { name: '0.5×' }).click()
    await expect(page.getByRole('radio', { name: '0.5×' })).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('header & controls', () => {
  test('[R3] [R4] Generate Program then Start / Pause from the header', async ({ page }) => {
    await page.goto('/?seed=42')
    const toggle = page.getByTestId('toggle-button')

    await expect(toggle).toBeDisabled()
    await page.getByTestId('generate-button').click()
    await expect(page.getByTestId('race-status')).toContainText('Ready')
    await expect(page.getByTestId('round-caption')).toHaveText('Round 1 of 6 · 1st Lap – 1200 m')

    await toggle.click()
    await expect(page.getByTestId('race-status')).toContainText('Live')
    await expect(page.getByTestId('change-program-button')).toBeDisabled()

    await toggle.click()
    await expect(page.getByTestId('race-status')).toContainText('Paused')
    await expect(toggle).toContainText('Resume')
  })

  test('[R3] changing the program asks for confirmation first', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    const firstHorse = page.getByTestId('program-round').first().locator('tbody tr').first()
    const before = await firstHorse.textContent()

    await page.getByTestId('change-program-button').click()
    const dialog = page.getByRole('alertdialog', { name: 'Change the program?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('change-program-cancel')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(firstHorse).toHaveText(before!)

    await page.keyboard.press('g')
    await dialog.getByTestId('change-program-confirm').click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('race-status')).toContainText('Ready')
    await expect(firstHorse).not.toHaveText(before!)
  })

  test('[X8] the race can be driven from the keyboard alone', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.locator('body').click()

    await page.keyboard.press('g')
    await expect(page.getByTestId('race-status')).toContainText('Ready')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('race-status')).toContainText('Live')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('race-status')).toContainText('Paused')

    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('[X9] the chosen language survives a reload', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: 'Türkçe' }).click()
    await expect(page.getByTestId('generate-button')).toContainText('Program Oluştur')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')

    await page.reload()
    await expect(page.getByTestId('generate-button')).toContainText('Program Oluştur')
  })

  test('[X8] the theme toggle switches to an explicit light theme and persists', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('responsive layout', () => {
  for (const { name, width, height } of [
    { name: 'mobile', width: 360, height: 740 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`[T2] ${name}: no horizontal page scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/?seed=42')
      await page.getByTestId('generate-button').click()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('[T2] mobile: the bottom tab bar switches sections', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    const tabbar = page.getByRole('navigation', { name: 'Race sections' })
    await expect(tabbar).toBeVisible()
    await tabbar.getByRole('tab', { name: 'Results' }).click()
    await expect(page.getByTestId('results-panel')).toBeVisible()
  })
})
