import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Travel', () => {
  test.describe('authentication', () => {
    test('redirects unauthenticated user to login when visiting travel', async ({ page }) => {
      await page.goto(getLink('portal.travel'))
      await expect(page).toHaveURL(/\/portal\/login/)
    })
  })
})
