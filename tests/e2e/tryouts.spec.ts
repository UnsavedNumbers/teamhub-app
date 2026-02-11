import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Tryouts', () => {
  test('redirects unauthenticated user to login when visiting tryouts', async ({ page }) => {
    await page.goto(getLink('portal.tryouts'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
