import { expect, test } from '@playwright/test'

test('[R1] the app boots and shows its title', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-title')).toHaveText('Pioneer Derby')
})
