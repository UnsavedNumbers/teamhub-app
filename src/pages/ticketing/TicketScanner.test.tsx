import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { forwardRef } from 'react'
import TicketScanner from '@/pages/ticketing/TicketScanner'
import { TestWrapper } from '@/test/helpers/renderWithProviders'
import { createMockValidateScanResponse } from '@/test/mocks/ticketing'

const mockGetTicketedEvents = vi.fn()
const mockValidateTicketScan = vi.fn()
const mockExchangeStaffLink = vi.fn()
const mockQueueValidation = vi.fn()

vi.mock('@/data/services', () => ({
  getTicketedEvents: (...args: unknown[]) => mockGetTicketedEvents(...args),
  validateTicketScan: (...args: unknown[]) => mockValidateTicketScan(...args),
  exchangeStaffLink: (...args: unknown[]) => mockExchangeStaffLink(...args),
}))

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({ isOffline: false, isOnline: true, retry: vi.fn() }),
}))

vi.mock('@/features/tickets/hooks/useMemoryMonitor', () => ({
  useMemoryMonitor: () => ({ showWarning: false, heapSize: null, dismissWarning: vi.fn() }),
}))

vi.mock('@/features/tickets/utils/offlineQueue', () => ({
  queueValidation: (...args: unknown[]) => mockQueueValidation(...args),
}))

vi.mock('@/components/ticketing/QRCodeScanner', () => ({
  QRCodeScanner: forwardRef((props: { onScan: (value: string) => void }, _ref) => (
    <button type="button" onClick={() => props.onScan('QR-TOKEN-123')} data-testid="qr-mock">
      Scan
    </button>
  )),
}))

vi.mock('@/components/ticketing/ValidationResultBanner', () => ({
  ValidationResultBanner: ({ result }: { result: { status?: string; result?: string; message?: string } }) => (
    <div data-testid="validation-banner">
      {'status' in result ? result.status : result.result}
      {result.message ? `:${result.message}` : ''}
    </div>
  ),
}))

vi.mock('@/components/ticketing/OrderContextPanel', () => ({
  OrderContextPanel: () => <div data-testid="order-context-panel" />,
}))

function renderPage(route = '/portal/tickets/validate/staff-token') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <TestWrapper>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/portal/tickets/validate/:token" element={<TicketScanner />} />
            <Route path="/" element={<div>home</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </TestWrapper>,
  )
}

describe('TicketScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    mockGetTicketedEvents.mockResolvedValue([])
    mockExchangeStaffLink.mockResolvedValue({
      data: {
        org_id: 'org-1',
        ticketed_event_id: 'event-1',
        event_title: 'City Championship',
        event_starts_at: '2026-08-01T19:00:00.000Z',
        expires_at: '2026-08-02T00:00:00.000Z',
        max_uses: null,
        use_count: 0,
      },
      error: null,
    })
  })

  test('[TE-E2E-017] validates a valid ticket and increments session counters', async () => {
    mockValidateTicketScan.mockResolvedValue({
      data: createMockValidateScanResponse({ result: 'valid', validated_count: 1 }),
      error: null,
    })

    renderPage()

    const input = await screen.findByPlaceholderText('XXXX-XXXX-XXXX')
    fireEvent.change(input, { target: { value: 'ABCD-1234-EFGH' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByTestId('validation-banner')).toHaveTextContent('valid')
    expect(mockValidateTicketScan).toHaveBeenCalledWith(
      {
        ticketed_event_id: 'event-1',
        entry_code: 'ABCD1234EFGH',
      },
      'staff-token',
    )
  })

  test('[TE-E2E-018] rejects reuse attempts with already-used result', async () => {
    mockValidateTicketScan.mockResolvedValue({
      data: createMockValidateScanResponse({ result: 'already_used', message: 'Already scanned' }),
      error: null,
    })

    renderPage()

    const input = await screen.findByPlaceholderText('XXXX-XXXX-XXXX')
    fireEvent.change(input, { target: { value: 'ABCD-1234-EFGH' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByTestId('validation-banner')).toHaveTextContent('already_used:Already scanned')
  })

  test('[TE-E2E-019] rejects invalid tokens and shows invalid reason messaging', async () => {
    mockValidateTicketScan.mockResolvedValue({
      data: createMockValidateScanResponse({ result: 'invalid', message: 'Token not found' }),
      error: null,
    })

    renderPage()

    const input = await screen.findByPlaceholderText('XXXX-XXXX-XXXX')
    fireEvent.change(input, { target: { value: 'ZZZZ-9999-ZZZZ' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByTestId('validation-banner')).toHaveTextContent('invalid:Token not found')
  })
})
