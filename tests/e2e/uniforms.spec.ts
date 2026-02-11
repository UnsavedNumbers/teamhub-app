import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

test.describe('Uniforms', () => {
  test('redirects unauthenticated user to login when visiting uniforms', async ({ page }) => {
    await page.goto(getLink('portal.uniforms'))
    await expect(page).toHaveURL(/\/portal\/login/)
  })
})
