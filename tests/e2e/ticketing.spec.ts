import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Ticketing', () => {
  test('redirects unauthenticated user to login when visiting tickets', async ({ page }) => {
    await page.goto(getLink('portal.myTickets'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
