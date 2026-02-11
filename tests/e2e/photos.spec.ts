import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Photos', () => {
  test('redirects unauthenticated user to login when visiting photos', async ({ page }) => {
    await page.goto(getLink('portal.photos'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
