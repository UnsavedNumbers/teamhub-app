import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MyTickets from '@/pages/ticketing/MyTickets'
import { createMockTicket, createMockTicketOrder, createMockTicketedEvent } from '@/test/mocks/ticketing'

const mockGetMyTicketOrders = vi.fn()
const mockGetTicketsForOrder = vi.fn()
const mockResendTickets = vi.fn()
const mockRequestTicketWalletPass = vi.fn()

vi.mock('@/data/services', () => ({
  getMyTicketOrders: (...args: unknown[]) => mockGetMyTicketOrders(...args),
  getTicketsForOrder: (...args: unknown[]) => mockGetTicketsForOrder(...args),
  resendTickets: (...args: unknown[]) => mockResendTickets(...args),
  requestTicketWalletPass: (...args: unknown[]) => mockRequestTicketWalletPass(...args),
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

vi.mock('@/components/portal/PortalLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="portal-layout">{children}</div>,
}))

vi.mock('@/components/portal/Typography', () => ({
  PageTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}))

vi.mock('@/utils/routes', () => ({
  useRouteLink: () => '/portal/tickets',
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
    mockRequestTicketWalletPass.mockResolvedValue({
      data: {
        wallet_type: 'google',
        action: 'open',
        url: 'https://pay.google.com/mock-pass',
        is_fallback: false,
      },
      error: null,
    })
    vi.stubGlobal('open', vi.fn())
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
    expect(screen.getByText(/1 Order/)).toBeInTheDocument()
    expect(screen.getAllByTestId('my-ticket-card')).toHaveLength(1)
  })

  test('groups same-event tickets into one swipeable carousel with mobile entry actions', async () => {
    const event = createMockTicketedEvent({
      id: 'event-grouped',
      title: 'Regional Finals',
      starts_at: '2026-04-20T18:00:00.000Z',
    })

    const orderOne = createMockTicketOrder({
      id: 'order-group-1',
      ticketed_event_id: event.id,
      created_at: '2026-03-01T00:00:00.000Z',
    })
    const orderTwo = createMockTicketOrder({
      id: 'order-group-2',
      ticketed_event_id: event.id,
      created_at: '2026-03-02T00:00:00.000Z',
    })

    const ticketOne = {
      ...createMockTicket({ id: 'ticket-group-1', order_id: orderOne.id, ticketed_event_id: event.id }),
      ticketed_events: event,
    }
    const ticketTwo = {
      ...createMockTicket({ id: 'ticket-group-2', order_id: orderTwo.id, ticketed_event_id: event.id }),
      ticketed_events: event,
      seat_info: { section: 'GA', row: '5', seat: '13' },
    }

    mockGetMyTicketOrders.mockResolvedValue([orderOne, orderTwo])
    mockGetTicketsForOrder.mockImplementation(async (orderId: string) => {
      if (orderId === orderOne.id) return [ticketOne]
      if (orderId === orderTwo.id) return [ticketTwo]
      return []
    })

    renderPage()

    expect(await screen.findByText('Regional Finals')).toBeInTheDocument()
    expect(screen.getByText('Ticket 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Ticket 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add to Google Wallet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add to Apple Wallet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Print Ticket/i })).toBeInTheDocument()
    expect(screen.getAllByTestId('my-ticket-card')).toHaveLength(2)
  })

  test('opens wallet pass link when Add to Google Wallet is clicked', async () => {
    const user = userEvent.setup()
    const event = createMockTicketedEvent({
      id: 'event-wallet',
      title: 'Wallet Matchup',
      starts_at: '2026-04-21T18:30:00.000Z',
    })
    const order = createMockTicketOrder({
      id: 'order-wallet',
      ticketed_event_id: event.id,
    })
    const ticket = {
      ...createMockTicket({
        id: 'ticket-wallet',
        order_id: order.id,
        ticketed_event_id: event.id,
        entry_code: 'WALLET123456',
      }),
      ticketed_events: event,
    }

    mockGetMyTicketOrders.mockResolvedValue([order])
    mockGetTicketsForOrder.mockResolvedValue([ticket])

    renderPage()

    await screen.findByText('Wallet Matchup')
    await user.click(screen.getByRole('button', { name: /Add to Google Wallet/i }))

    expect(mockRequestTicketWalletPass).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: 'ticket-wallet',
        wallet_type: 'google',
        entry_code: 'WALLET123456',
      }),
    )
    expect(window.open).toHaveBeenCalledWith('https://pay.google.com/mock-pass', '_blank', 'noopener,noreferrer')
  })

  test('[TE-E2E-022] shows empty lifecycle state when no records exist', async () => {
    mockGetMyTicketOrders.mockResolvedValue([])
    mockGetTicketsForOrder.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No tickets found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse Events/i })).toHaveAttribute('href', '/portal/tickets')
  })
})
