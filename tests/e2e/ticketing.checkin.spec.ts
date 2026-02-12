import { expect, test } from '@playwright/test'
import { installTicketingRouteMocks } from './support/ticketingMocks'

async function goToScanner(page: any) {
  await page.goto('/tickets/validate/staff-token')
  await expect(page.getByText('City Championship')).toBeVisible()
}

test.describe('Ticketing Check-In', () => {
  test('[TE-E2E-017] validates unused tickets exactly once on success path', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await goToScanner(page)

    await page.getByPlaceholder('XXXX-XXXX-XXXX').fill('ABCD-1234-EFGH')
    await page.getByRole('button', { name: 'Validate' }).click()

    await expect(page.getByText('Valid Ticket')).toBeVisible()
  })

  test('[TE-E2E-018] rejects second scan attempts with already-used messaging', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await goToScanner(page)

    await page.getByPlaceholder('XXXX-XXXX-XXXX').fill('ALREADYUSED')
    await page.getByRole('button', { name: 'Validate' }).click()

    await expect(page.getByText('Already Used')).toBeVisible()
  })

  test('[TE-E2E-019] blocks invalid tokens with clear rejection reason', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await goToScanner(page)

    await page.getByPlaceholder('XXXX-XXXX-XXXX').fill('INVALID')
    await page.getByRole('button', { name: 'Validate' }).click()

    await expect(page.getByText('Invalid Ticket')).toBeVisible()
  })
})
