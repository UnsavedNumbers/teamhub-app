import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Attendance', () => {
  test('redirects unauthenticated user to login when visiting attendance', async ({ page }) => {
    await page.goto(getLink('admin.attendance'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
