import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MyTickets from '@/pages/ticketing/MyTickets'
import { createMockTicket, createMockTicketOrder, createMockTicketedEvent } from '@/test/mocks/ticketing'

const mockGetMyTicketOrders = vi.fn()
const mockGetTicketsForOrder = vi.fn()
const mockResendTickets = vi.fn()

vi.mock('@/data/services', () => ({
  getMyTicketOrders: (...args: unknown[]) => mockGetMyTicketOrders(...args),
  getTicketsForOrder: (...args: unknown[]) => mockGetTicketsForOrder(...args),
  resendTickets: (...args: unknown[]) => mockResendTickets(...args),
}))

vi.mock('@/components/ticketing/TicketCard', () => ({
  default: ({ ticket }: { ticket: { id: string } }) => <div data-testid="my-ticket-card">{ticket.id}</div>,
}))

vi.mock('@/utils/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('@/components/common/FullScreenLoader', () => ({
  default: () => <div data-testid="fullscreen-loader" />,
}))

vi.mock('@/utils/routes', () => ({
  useRouteLink: () => '/tickets',
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyTickets />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResendTickets.mockResolvedValue({
      data: { success: true, message: 'Tickets resent', tickets_resent: 1 },
      error: null,
    })
  })

  test('[TE-E2E-022] keeps historical ticket records visible after event completion', async () => {
    const order = createMockTicketOrder({
      id: 'order-historical',
      created_at: '2026-02-01T00:00:00.000Z',
    })
    const ticket = {
      ...createMockTicket({
        id: 'ticket-historical',
        order_id: order.id,
        used_at: '2026-02-15T00:00:00.000Z',
      }),
      ticketed_events: createMockTicketedEvent({
        title: 'Past Championship',
        starts_at: '2026-02-14T19:00:00.000Z',
        ends_at: '2026-02-14T21:00:00.000Z',
      }),
    }

    mockGetMyTicketOrders.mockResolvedValue([order])
    mockGetTicketsForOrder.mockResolvedValue([ticket])

    renderPage()

    expect(await screen.findByText('Past Championship')).toBeInTheDocument()
    expect(screen.getByText(/Order #/)).toBeInTheDocument()
    expect(screen.getAllByTestId('my-ticket-card')).toHaveLength(1)
  })

  test('[TE-E2E-022] shows empty lifecycle state when no records exist', async () => {
    mockGetMyTicketOrders.mockResolvedValue([])
    mockGetTicketsForOrder.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No tickets found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse Events/i })).toHaveAttribute('href', '/tickets')
  })
})
