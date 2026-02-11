import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Fan', () => {
  test('redirects unauthenticated user to login when visiting fan home', async ({ page }) => {
    await page.goto(getLink('fan.home'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
