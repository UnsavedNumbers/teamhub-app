import type { Page, Route } from '@playwright/test'

export interface TicketingE2EOptions {
  checkoutShouldFail?: boolean
  resendShouldFail?: boolean
  soldOut?: boolean
}

function fulfillJson(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  })
}

export async function installTicketingRouteMocks(page: Page, options: TicketingE2EOptions = {}) {
  const event = {
    id: 'event-1',
    org_id: 'org-1',
    event_type: 'game',
    title: 'City Championship',
    description: 'Regional finals',
    event_description: 'Regional finals',
    starts_at: '2026-08-01T19:00:00.000Z',
    ends_at: '2026-08-01T21:00:00.000Z',
    timezone: 'America/Los_Angeles',
    venue_name: 'Main Arena',
    venue_address_line1: null,
    venue_address_line2: null,
    venue_city: 'Riverside',
    venue_state: 'CA',
    venue_postal_code: null,
    venue_country: null,
    venue_is_virtual: false,
    venue_virtual_link: null,
    sales_start_at: '2026-01-01T00:00:00.000Z',
    sales_end_at: '2099-01-01T00:00:00.000Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  }

  const ticketTypes = [
    {
      id: 'type-1',
      org_id: 'org-1',
      ticketed_event_id: 'event-1',
      name: 'General Admission',
      description: 'Standard access',
      price_cents: 2500,
      currency: 'usd',
      capacity_total: 100,
      capacity_remaining: options.soldOut ? 0 : 50,
      sales_start_at: null,
      sales_end_at: null,
      sort_order: 0,
      is_active: true,
      seating_mode: 'general_admission',
      seat_map_id: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'type-2',
      org_id: 'org-1',
      ticketed_event_id: 'event-1',
      name: 'VIP',
      description: 'Premium seating',
      price_cents: 7500,
      currency: 'usd',
      capacity_total: 25,
      capacity_remaining: options.soldOut ? 0 : 10,
      sales_start_at: null,
      sales_end_at: null,
      sort_order: 1,
      is_active: true,
      seating_mode: 'general_admission',
      seat_map_id: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
  ]

  await page.route('**/rest/v1/ticketed_events*', async (route) => {
    const request = route.request()
    const accept = request.headers().accept ?? ''
    const url = request.url()

    if (accept.includes('application/vnd.pgrst.object+json') || url.includes('id=eq.event-1')) {
      return fulfillJson(route, event)
    }

    return fulfillJson(route, [event])
  })

  await page.route('**/rest/v1/ticket_types*', async (route) => {
    const request = route.request()
    const accept = request.headers().accept ?? ''

    if (accept.includes('application/vnd.pgrst.object+json')) {
      return fulfillJson(route, ticketTypes[0])
    }

    return fulfillJson(route, ticketTypes)
  })

  await page.route('**/functions/v1/tickets-create-checkout', async (route) => {
    if (options.checkoutShouldFail) {
      return fulfillJson(route, { error: 'Payment declined' }, 400)
    }
    return fulfillJson(route, {
      checkout_url: '/tickets/order/order-1',
      order_id: 'order-1',
    })
  })

  await page.route('**/functions/v1/tickets-get-order-public', async (route) => {
    return fulfillJson(route, {
      order: {
        id: 'order-1',
        status: 'paid',
        total_cents: 5000,
        purchaser_name: 'Fan User',
        purchaser_email: 'fan@example.com',
        created_at: '2026-08-01T19:00:00.000Z',
        items: [
          {
            id: 'item-1',
            quantity: 2,
            unit_price_cents: 2500,
            subtotal_cents: 5000,
            ticket_types: {
              id: 'type-1',
              name: 'General Admission',
              description: 'Standard access',
            },
          },
        ],
        event: {
          id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          venue_name: event.venue_name,
          venue_city: event.venue_city,
          venue_state: event.venue_state,
        },
      },
      tickets: [
        {
          id: 'ticket-1',
          entry_code: 'ABCD1234EFGH',
          status: 'active',
          used_at: null,
          ticket_type: {
            id: 'type-1',
            name: 'General Admission',
            description: 'Standard access',
          },
          event: {
            id: event.id,
            title: event.title,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            venue_name: event.venue_name,
            venue_city: event.venue_city,
            venue_state: event.venue_state,
          },
        },
      ],
    })
  })

  await page.route('**/functions/v1/resend-tickets', async (route) => {
    if (options.resendShouldFail) {
      return fulfillJson(route, { error: 'Delivery failed' }, 400)
    }
    return fulfillJson(route, {
      success: true,
      message: 'Receipt sent',
      tickets_resent: 1,
    })
  })

  await page.route('**/functions/v1/tickets-decrypt-access', async (route) => {
    return fulfillJson(route, {
      id: 'ticket-1',
      entry_code: 'ABCD1234EFGH',
      qr_token: 'qr-token-1',
      status: 'active',
      ticket_type_name: 'General Admission',
      event_id: 'event-1',
      event_name: 'City Championship',
      event_date: '2026-08-01T19:00:00.000Z',
      event_location: 'Main Arena',
      purchaser_name: 'Fan User',
      purchaser_email: 'fan@example.com',
    })
  })

  await page.route('**/functions/v1/tickets-staff-link-exchange', async (route) => {
    return fulfillJson(route, {
      org_id: 'org-1',
      ticketed_event_id: 'event-1',
      event_title: 'City Championship',
      event_starts_at: '2026-08-01T19:00:00.000Z',
      expires_at: '2099-01-01T00:00:00.000Z',
      max_uses: null,
      use_count: 0,
    })
  })

  await page.route('**/functions/v1/tickets-validate-scan', async (route) => {
    const payload = route.request().postDataJSON() as { entry_code?: string; qr_token_raw?: string }
    const token = (payload.entry_code || payload.qr_token_raw || '').replace(/-/g, '').toUpperCase()

    if (token === 'ALREADYUSED') {
      return fulfillJson(route, {
        result: 'already_used',
        message: 'Already scanned',
        used_at: '2026-08-01T18:30:00.000Z',
      })
    }

    if (token === 'INVALID') {
      return fulfillJson(route, { error: 'Invalid token' }, 400)
    }

    return fulfillJson(route, {
      result: 'valid',
      message: 'Validated',
      ticket_type_name: 'General Admission',
      validated_count: 1,
      remaining_capacity: 49,
    })
  })
}
