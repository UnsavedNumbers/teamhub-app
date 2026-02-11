import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Organization Admin', () => {
  test('redirects unauthenticated user to login when visiting admin', async ({ page }) => {
    await page.goto(getLink('admin.dashboard'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
