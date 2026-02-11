import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Payments', () => {
  test('redirects unauthenticated user to login when visiting payments', async ({ page }) => {
    await page.goto(getLink('portal.payments'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
