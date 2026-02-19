import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createCheckoutSession } from '@/data/services/ticketingService'

const mockGetSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/config')>()
  return { ...actual, USE_FAKE_DATA: false, FAKE_DATA_DELAY_MS: 0 }
})

describe('ticketingService checkout semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    })
  })

  test('[TE-E2E-012] duplicate checkout submissions preserve single-order semantics from backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: '/checkout/same', order_id: 'order-single' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = {
      ticketed_event_id: 'event-1',
      purchaser_email: 'fan@example.com',
      items: [{ ticket_type_id: 'type-1', quantity: 1 }],
    }

    const [first, second] = await Promise.all([
      createCheckoutSession(request),
      createCheckoutSession(request),
    ])

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(first.data?.order_id).toBe('order-single')
    expect(second.data?.order_id).toBe('order-single')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('[TE-E2E-021] supports retry after transient checkout failure without corrupting payload', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ checkout_url: '/checkout/retry', order_id: 'order-retry' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const request = {
      ticketed_event_id: 'event-1',
      purchaser_email: 'fan@example.com',
      items: [{ ticket_type_id: 'type-1', quantity: 2 }],
    }

    const failed = await createCheckoutSession(request)
    const recovered = await createCheckoutSession(request)

    expect(failed.data).toBeNull()
    expect(failed.error?.message).toContain('network timeout')
    expect(recovered.error).toBeNull()
    expect(recovered.data?.order_id).toBe('order-retry')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
