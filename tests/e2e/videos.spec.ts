import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Videos', () => {
  test('redirects unauthenticated user to login when visiting videos', async ({ page }) => {
    await page.goto(getLink('portal.videos'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
