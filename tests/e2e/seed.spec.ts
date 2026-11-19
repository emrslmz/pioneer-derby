import { expect, test } from '@playwright/test'

test('[X11] a fresh visit gets a shareable ?seed= in the URL', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/[?&]seed=\d+/)
})

test('[X11] a shared ?seed= link is kept so the same game can be replayed', async ({ page }) => {
  await page.goto('/?seed=1234')

  await expect(page.getByTestId('app-title')).toBeVisible()
  await expect(page).toHaveURL(/[?&]seed=1234(&|$)/)
})
