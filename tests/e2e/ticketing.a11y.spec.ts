import { expect, test } from '@playwright/test'
import { installTicketingRouteMocks } from './support/ticketingMocks'

async function tabUntil(page: any, check: () => Promise<boolean>, maxTabs = 40) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await check()) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Unable to reach expected control with keyboard navigation')
}

test.describe('Ticketing Accessibility Smoke', () => {
  test('[TE-E2E-020] supports keyboard-only purchase flow through checkout submit', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.goto('/tickets/events/event-1')
    await expect(page.getByText('Ticket Selection')).toBeVisible()

    await tabUntil(
      page,
      async () =>
        (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim())) === 'add',
    )
    await page.keyboard.press('Enter')

    await tabUntil(
      page,
      async () =>
        (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('type'))) === 'email',
    )
    await page.keyboard.type('fan@example.com')

    await tabUntil(
      page,
      async () =>
        (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.includes('Checkout Now'))) ===
        true,
    )
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/tickets\/order\/order-1/)
  })
})
