import { expect, test } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { installTicketingRouteMocks } from './support/ticketingMocks'

test.describe('Ticketing Access and Lifecycle', () => {
  test('[TE-E2E-014] verifies receipt resend happy and fail outcomes', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.goto(getLink('portal.ticketOrderSuccess', { orderId: 'order-1' }))

    await page.getByRole('button', { name: /Resend Email/i }).click()
    await expect(page.getByText('Receipt sent')).toBeVisible()

    await page.unroute('**/functions/v1/resend-tickets')
    await page.route('**/functions/v1/resend-tickets', async (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Delivery failed' }),
      }),
    )

    await page.getByRole('button', { name: /Resend Email/i }).click()
    await expect(page.getByText('Delivery failed')).toBeVisible()
  })

  test('[TE-E2E-015] provides ticket access from confirmation and encrypted link paths', async ({ page }) => {
    await installTicketingRouteMocks(page)

    await page.goto(getLink('portal.ticketOrderSuccess', { orderId: 'order-1' }))
    await expect(page.getByText('Tickets Confirmed')).toBeVisible()

    await page.goto('/tickets/access?t=fake-payload')
    await expect(page.getByText('City Championship')).toBeVisible()
    await expect(page.getByText(/ABCD-1234-EFGH/)).toBeVisible()
  })

  test('[TE-E2E-016] enforces transfer gating by keeping guest ticket-access surfaces non-transferable', async ({ page }) => {
    await installTicketingRouteMocks(page)

    await page.goto(getLink('portal.ticketOrderSuccess', { orderId: 'order-1' }))
    await expect(page.getByText('Tickets Confirmed')).toBeVisible()
    await expect(page.getByRole('button', { name: /Transfer Ticket/i })).toHaveCount(0)

    await page.goto('/tickets/access?t=fake-payload')
    await expect(page.getByRole('button', { name: /Transfer Ticket/i })).toHaveCount(0)
  })

  test('[TE-E2E-022] keeps completed-event ticket history visible after event date passes', async ({ page }) => {
    await installTicketingRouteMocks(page)
    await page.unroute('**/functions/v1/tickets-get-order-public')
    await page.route('**/functions/v1/tickets-get-order-public', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            id: 'order-1',
            status: 'paid',
            total_cents: 5000,
            purchaser_name: 'Fan User',
            purchaser_email: 'fan@example.com',
            created_at: '2025-08-01T19:00:00.000Z',
            items: [
              {
                id: 'item-1',
                quantity: 1,
                unit_price_cents: 5000,
                subtotal_cents: 5000,
                ticket_types: { id: 'type-1', name: 'General Admission', description: 'Standard access' },
              },
            ],
            event: {
              id: 'event-1',
              title: 'City Championship',
              starts_at: '2025-08-01T19:00:00.000Z',
              ends_at: '2025-08-01T21:00:00.000Z',
              venue_name: 'Main Arena',
              venue_city: 'Riverside',
              venue_state: 'CA',
            },
          },
          tickets: [
            {
              id: 'ticket-1',
              entry_code: 'ABCD1234EFGH',
              status: 'used',
              used_at: '2025-08-01T19:15:00.000Z',
              ticket_type: { id: 'type-1', name: 'General Admission', description: 'Standard access' },
              event: {
                id: 'event-1',
                title: 'City Championship',
                starts_at: '2025-08-01T19:00:00.000Z',
                ends_at: '2025-08-01T21:00:00.000Z',
                venue_name: 'Main Arena',
                venue_city: 'Riverside',
                venue_state: 'CA',
              },
            },
          ],
        }),
      }),
    )

    await page.goto(getLink('portal.ticketOrderSuccess', { orderId: 'order-1' }))
    await expect(page.getByText('Tickets Confirmed')).toBeVisible()
    await expect(page.getByText(/City Championship/)).toBeVisible()
  })
})
