import type {
  PublicOrderResponse,
} from '@/data/services/ticketingService'
import type {
  Ticket,
  TicketOrder,
  TicketType,
  TicketedEvent,
  ValidateScanResponse,
} from '@/types/ticketing'

export function createMockTicketedEvent(overrides: Partial<TicketedEvent> = {}): TicketedEvent {
  return {
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
    sales_start_at: '2026-07-01T00:00:00.000Z',
    sales_end_at: '2026-08-01T18:59:00.000Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createMockTicketType(overrides: Partial<TicketType> = {}): TicketType {
  return {
    id: 'type-1',
    org_id: 'org-1',
    ticketed_event_id: 'event-1',
    name: 'General Admission',
    description: 'Standard access',
    price_cents: 2500,
    currency: 'usd',
    capacity_total: 100,
    capacity_remaining: 42,
    sales_start_at: null,
    sales_end_at: null,
    sort_order: 0,
    is_active: true,
    seating_mode: 'general_admission',
    seat_map_id: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createMockTicketOrder(overrides: Partial<TicketOrder> = {}): TicketOrder {
  return {
    id: 'order-1',
    org_id: 'org-1',
    ticketed_event_id: 'event-1',
    purchaser_user_id: 'user-1',
    purchaser_email: 'fan@example.com',
    purchaser_name: 'Fan User',
    status: 'paid',
    subtotal_cents: 5000,
    tax_cents: 0,
    fees_cents: 0,
    total_cents: 5000,
    stripe_checkout_session_id: 'cs_test_1',
    stripe_payment_intent_id: 'pi_test_1',
    receipt_email_sent_at: '2026-08-01T19:01:00.000Z',
    stripe_connect_account_id: null,
    platform_fee_cents: null,
    org_revenue_cents: null,
    stripe_charge_id: null,
    stripe_application_fee_id: null,
    processed_at: null,
    created_at: '2026-08-01T19:00:00.000Z',
    updated_at: '2026-08-01T19:00:00.000Z',
    ...overrides,
  }
}

export function createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    org_id: 'org-1',
    ticketed_event_id: 'event-1',
    order_id: 'order-1',
    ticket_type_id: 'type-1',
    status: 'active',
    qr_token_hash: 'hash',
    entry_code: 'ABCD1234EFGH',
    used_at: null,
    used_by_user_id: null,
    created_at: '2026-08-01T19:00:00.000Z',
    updated_at: '2026-08-01T19:00:00.000Z',
    ...overrides,
  }
}

export function createMockPublicOrderResponse(
  overrides: Partial<PublicOrderResponse> = {},
): PublicOrderResponse {
  const event = createMockTicketedEvent()
  return {
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
    ...overrides,
  }
}

export function createMockValidateScanResponse(
  overrides: Partial<ValidateScanResponse> = {},
): ValidateScanResponse {
  return {
    result: 'valid',
    message: 'Ticket validated',
    ticket_type_name: 'General Admission',
    validated_count: 1,
    remaining_capacity: 41,
    ...overrides,
  }
}
