import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TicketOrderSuccess from '@/pages/ticketing/TicketOrderSuccess'
import { createMockPublicOrderResponse } from '@/test/mocks/ticketing'

const mockGetPublicOrderWithTickets = vi.fn()
const mockResendTickets = vi.fn()

vi.mock('@/data/services', () => ({
  getPublicOrderWithTickets: (...args: unknown[]) => mockGetPublicOrderWithTickets(...args),
  resendTickets: (...args: unknown[]) => mockResendTickets(...args),
}))

vi.mock('@/components/ticketing/TicketCard', () => ({
  default: ({ ticket }: { ticket: { id: string } }) => <div data-testid="ticket-card">{ticket.id}</div>,
}))

function renderPage(route = '/tickets/order/order-abc123') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/tickets/order/:orderId" element={<TicketOrderSuccess />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketOrderSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicOrderWithTickets.mockResolvedValue(createMockPublicOrderResponse())
    mockResendTickets.mockResolvedValue({
      data: { success: true, message: 'Receipt sent', tickets_resent: 2 },
      error: null,
    })
  })

  test('[TE-E2E-013] renders confirmation summary with order metadata and ticket count', async () => {
    renderPage()

    expect(await screen.findByText('Tickets Confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Your order/)).toBeInTheDocument()
    expect(screen.getAllByTestId('ticket-card')).toHaveLength(1)
  })

  test('[TE-E2E-015] renders ticket access actions from confirmation route', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /View All My Tickets/i })).toHaveAttribute('href', '/portal/account/tickets')
    expect(screen.getByRole('button', { name: /Resend Email/i })).toBeInTheDocument()
  })

  test('[TE-E2E-014] supports resend receipt success and failure outcomes', async () => {
    renderPage()
    const resendButton = await screen.findByRole('button', { name: /Resend Email/i })

    fireEvent.click(resendButton)
    expect(await screen.findByText('Receipt sent')).toBeInTheDocument()

    mockResendTickets.mockResolvedValueOnce({
      data: null,
      error: new Error('Delivery failed'),
    })

    fireEvent.click(screen.getByRole('button', { name: /Resend Email/i }))
    expect(await screen.findByText('Delivery failed')).toBeInTheDocument()
  })
})
