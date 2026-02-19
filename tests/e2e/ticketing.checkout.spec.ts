import { expect, test } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { installTicketingRouteMocks } from './support/ticketingMocks'

async function prepareCheckout(page: any) {
  await page.goto(getLink('portal.ticketEventDetail', { eventId: 'event-1' }))
  await expect(page.getByText('Ticket Selection')).toBeVisible()
  await page.getByRole('button', { name: 'add' }).first().click()
}

test.describe('Ticketing Checkout Journeys', () => {
  test('[TE-E2E-001][TE-E2E-002] discovers published events and opens detail routes from cards', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.goto(getLink('portal.tickets'))

    await expect(page.getByRole('heading', { name: 'Upcoming Events' })).toBeVisible()
    await expect(page.getByText('City Championship')).toBeVisible()
    await expect(page.getByText('$25.00').first()).toBeVisible()

    await page.getByRole('link', { name: /City Championship/i }).click()
    await expect(page).toHaveURL(/\/tickets\/events\/event-1/)
  })

  test('[TE-E2E-003][TE-E2E-004][TE-E2E-005][TE-E2E-007] validates detail metadata, totals, and guest field requirements', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.goto(getLink('portal.ticketEventDetail', { eventId: 'event-1' }))

    await expect(page.getByRole('heading', { name: 'City Championship' })).toBeVisible()
    await expect(page.getByText('General Admission')).toBeVisible()
    await expect(page.getByText('VIP')).toBeVisible()

    await page.getByRole('button', { name: 'add' }).first().click()
    await expect(page.getByText('$25.00').first()).toBeVisible()

    const checkoutButton = page.getByRole('button', { name: 'Checkout Now' })
    await expect(checkoutButton).toBeDisabled()

    const emailInput = page.getByPlaceholder('your@email.com')
    await emailInput.fill('invalid-email')
    await emailInput.blur()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()

    await emailInput.fill('fan@example.com')
    await expect(checkoutButton).toBeEnabled()
  })

  test('[TE-E2E-006] blocks checkout on sold-out inventory with disabled purchase controls', async ({ page }) => {
    await installTicketingRouteMocks(page, { soldOut: true })
    await page.goto(getLink('portal.ticketEventDetail', { eventId: 'event-1' }))

    await expect(page.getByText('Sold out').first()).toBeVisible()
    await expect(page.getByText('Tickets are sold out for this event.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'add' }).first()).toBeDisabled()
  })

  test('[TE-E2E-009] keeps checkout flow stable when promo validation fails', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.route('**/functions/v1/tickets-create-checkout', async (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid promo code' }),
      }),
    )

    await prepareCheckout(page)
    await page.getByPlaceholder('your@email.com').fill('fan@example.com')
    await page.getByRole('button', { name: 'Checkout Now' }).click()

    await expect(page.getByText('Invalid promo code').first()).toBeVisible()
    await expect(page).toHaveURL(/\/tickets\/events\/event-1/)
  })

  test('[TE-E2E-008][TE-E2E-010][TE-E2E-013] completes authenticated-like checkout happy path to confirmation', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await prepareCheckout(page)
    await page.getByPlaceholder('your@email.com').fill('fan@example.com')
    await page.getByRole('button', { name: 'Checkout Now' }).click()

    await expect(page).toHaveURL(/\/tickets\/order\/order-1/)
    await expect(page.getByText('Tickets Confirmed')).toBeVisible()
    await expect(page.getByText(/Your order/)).toBeVisible()
  })

  test('[TE-E2E-011] surfaces payment failures without navigating away from checkout', async ({ page }) => {
    await installTicketingRouteMocks(page, { checkoutShouldFail: true })
    await prepareCheckout(page)
    await page.getByPlaceholder('your@email.com').fill('fan@example.com')
    await page.getByRole('button', { name: 'Checkout Now' }).click()

    await expect(page.getByText('Payment declined').first()).toBeVisible()
    await expect(page).toHaveURL(/\/tickets\/events\/event-1/)
  })

  test('[TE-E2E-012][TE-E2E-021] prevents duplicate outcomes across repeated submit and refresh', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await prepareCheckout(page)
    await page.getByPlaceholder('your@email.com').fill('fan@example.com')

    const checkoutButton = page.getByRole('button', { name: 'Checkout Now' })
    await checkoutButton.dblclick()

    await expect(page).toHaveURL(/\/tickets\/order\/order-1/)
    await page.reload()
    await expect(page.getByText('Tickets Confirmed')).toBeVisible()
  })
})
