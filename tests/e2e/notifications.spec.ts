import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Notifications', () => {
  test('redirects unauthenticated user to login when visiting notifications', async ({ page }) => {
    await page.goto(getLink('fan.profile.notifications'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
