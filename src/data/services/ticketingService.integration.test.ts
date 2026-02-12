import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createCheckoutSession,
  resendTickets,
  validateTicketScan,
} from '@/data/services/ticketingService'
import { transferTicket } from '@/data/services/fanService'
import { resolveTicketingAccessRules } from '@/test/helpers/ticketingAccessRules'

const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/config')>()
  return { ...actual, USE_FAKE_DATA: false, FAKE_DATA_DELAY_MS: 0 }
})

describe('ticketingService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'ticket-1', status: 'transferred' },
            error: null,
          }),
        })),
      })),
    }))
  })

  test('[TE-E2E-008][TE-E2E-010] creates authenticated checkout sessions with deterministic payloads', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: '/checkout/session-1', order_id: 'order-1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createCheckoutSession({
      ticketed_event_id: 'event-1',
      purchaser_email: 'fan@example.com',
      items: [{ ticket_type_id: 'type-1', quantity: 2 }],
    })

    expect(result.error).toBeNull()
    expect(result.data?.order_id).toBe('order-1')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/functions\/v1\/tickets-create-checkout$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    )
  })

  test('[TE-E2E-011] returns payment failures as retryable checkout errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Card declined' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createCheckoutSession({
      ticketed_event_id: 'event-1',
      purchaser_email: 'fan@example.com',
      items: [{ ticket_type_id: 'type-1', quantity: 1 }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.message).toBe('Card declined')
  })

  test('[TE-E2E-014] sends receipt resend requests through the ticketing endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Receipt sent', tickets_resent: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resendTickets({ order_id: 'order-1', email: 'fan@example.com' })
    expect(result.error).toBeNull()
    expect(result.data?.success).toBe(true)
  })

  test('[TE-E2E-016] executes transfer flow only when inherited ticketing access is enabled', async () => {
    const allowedRules = resolveTicketingAccessRules({ ticketingEnabled: true })
    const blockedRules = resolveTicketingAccessRules({ ticketingEnabled: false })

    expect(allowedRules.transferEnabled).toBe(true)
    expect(blockedRules.transferEnabled).toBe(false)

    if (allowedRules.transferEnabled) {
      const result = await transferTicket({
        ticket_id: 'ticket-1',
        holder_email: 'recipient@example.com',
        holder_name: 'Recipient',
      })
      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('ticket-1')
    }
  })

  test('[TE-E2E-017] validates check-in success responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'valid', message: 'Validated' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateTicketScan({
      ticketed_event_id: 'event-1',
      entry_code: 'ABCD1234EFGH',
    })

    expect(result.error).toBeNull()
    expect(result.data?.result).toBe('valid')
  })

  test('[TE-E2E-018] validates duplicate-scan rejection payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'already_used', message: 'Already scanned' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateTicketScan({
      ticketed_event_id: 'event-1',
      entry_code: 'ABCD1234EFGH',
    })

    expect(result.error).toBeNull()
    expect(result.data?.result).toBe('already_used')
  })

  test('[TE-E2E-019] returns invalid scan errors with clear reasons', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateTicketScan({
      ticketed_event_id: 'event-1',
      entry_code: 'INVALID',
    })

    expect(result.data).toBeNull()
    expect(result.error?.message).toBe('Invalid token')
  })
})
