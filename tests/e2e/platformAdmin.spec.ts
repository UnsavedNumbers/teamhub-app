import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Platform Admin', () => {
  test('redirects unauthenticated user to login when visiting platform admin', async ({ page }) => {
    await page.goto(getLink('platformAdmin.dashboard'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
