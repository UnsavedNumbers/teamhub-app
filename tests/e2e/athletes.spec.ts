import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Athletes', () => {
  test('redirects unauthenticated user to login when visiting athletes', async ({ page }) => {
    await page.goto(getLink('portal.athletes'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
