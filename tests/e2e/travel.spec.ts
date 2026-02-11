import { test, expect } from '@playwright/test'

test.describe('Travel', () => {
  test.describe('authentication', () => {
    test('redirects unauthenticated user to login when visiting travel', async ({ page }) => {
      await page.goto('/portal/travel')
      await expect(page).toHaveURL(/\/portal\/login/)
    })
  })
})
