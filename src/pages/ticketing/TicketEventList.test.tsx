import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TicketEventList from '@/pages/ticketing/TicketEventList'
import { createMockTicketType, createMockTicketedEvent } from '@/test/mocks/ticketing'

const mockGetTicketedEvents = vi.fn()
const mockGetTicketTypesForEvent = vi.fn()

vi.mock('@/data/services', () => ({
  getTicketedEvents: (...args: unknown[]) => mockGetTicketedEvents(...args),
  getTicketTypesForEvent: (...args: unknown[]) => mockGetTicketTypesForEvent(...args),
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
        <TicketEventList />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketEventList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('[TE-E2E-001] renders event discovery card metadata with starting price', async () => {
    const event = createMockTicketedEvent()
    mockGetTicketedEvents.mockResolvedValue([event])
    mockGetTicketTypesForEvent.mockResolvedValue([
      createMockTicketType({ id: 'type-a', price_cents: 1500 }),
      createMockTicketType({ id: 'type-b', price_cents: 3500 }),
    ])

    renderPage()

    expect(await screen.findByText(event.title)).toBeInTheDocument()
    expect(screen.getByText(/Aug/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Starting from/)).toBeInTheDocument()
      expect(screen.getByText('$15.00')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Buy Tickets' })).toBeInTheDocument()
  })

  test('[TE-E2E-002] renders multiple results and links each card to event detail', async () => {
    const eventA = createMockTicketedEvent({ id: 'event-a', title: 'Event A' })
    const eventB = createMockTicketedEvent({ id: 'event-b', title: 'Event B', starts_at: '2026-08-02T19:00:00.000Z' })
    mockGetTicketedEvents.mockResolvedValue([eventA, eventB])
    mockGetTicketTypesForEvent.mockResolvedValue([createMockTicketType()])

    renderPage()

    expect(await screen.findByText('Event A')).toBeInTheDocument()
    expect(screen.getByText('Event B')).toBeInTheDocument()

    const eventALink = screen.getByRole('link', { name: /Event A/i })
    const eventBLink = screen.getByRole('link', { name: /Event B/i })
    expect(eventALink).toHaveAttribute('href', '/portal/tickets/events/event-a')
    expect(eventBLink).toHaveAttribute('href', '/portal/tickets/events/event-b')
  })

  test('[TE-E2E-002] shows empty discovery state when no published events match', async () => {
    mockGetTicketedEvents.mockResolvedValue([])
    mockGetTicketTypesForEvent.mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No upcoming events available')).toBeInTheDocument()
    })
  })
})
