import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Huddles', () => {
  test('redirects unauthenticated user to login when visiting huddles', async ({ page }) => {
    await page.goto(getLink('portal.messages'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
