import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TicketAccess from '@/pages/ticketing/TicketAccess'
import { createMockTicket } from '@/test/mocks/ticketing'

const mockGetTicketsByAccessToken = vi.fn()

vi.mock('@/data/services', () => ({
  getTicketsByAccessToken: (...args: unknown[]) => mockGetTicketsByAccessToken(...args),
}))

vi.mock('@/components/ticketing/TicketCard', () => ({
  default: ({ ticket }: { ticket: { id: string } }) => <div data-testid="access-ticket">{ticket.id}</div>,
}))

function renderPage(route = '/tickets/access/token-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/tickets/access/:token" element={<TicketAccess />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('[TE-E2E-015] loads ticket access link and renders scannable ticket cards', async () => {
    mockGetTicketsByAccessToken.mockResolvedValue([
      {
        ...createMockTicket(),
        ticketed_events: { id: 'event-1', title: 'City Championship' },
      },
    ])

    renderPage()

    expect(await screen.findByText('Your Tickets')).toBeInTheDocument()
    expect(screen.getAllByTestId('access-ticket')).toHaveLength(1)
  })

  test('[TE-E2E-015] shows invalid access message for expired or bad links', async () => {
    mockGetTicketsByAccessToken.mockRejectedValue(new Error('Invalid access token'))

    renderPage('/tickets/access/expired-token')

    expect(await screen.findByText('Invalid or expired access link')).toBeInTheDocument()
    expect(screen.getByText('Please check your email for a valid ticket link.')).toBeInTheDocument()
  })
})
