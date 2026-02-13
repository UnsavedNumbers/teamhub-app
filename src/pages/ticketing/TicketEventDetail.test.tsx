import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TicketEventDetail from '@/pages/ticketing/TicketEventDetail'
import { createMockTicketType, createMockTicketedEvent } from '@/test/mocks/ticketing'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

const mockGetPublicTicketedEventById = vi.fn()
const mockGetPublicTicketTypesForEvent = vi.fn()
const mockCreateCheckoutSession = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/data/services', () => ({
  getPublicTicketedEventById: (...args: unknown[]) => mockGetPublicTicketedEventById(...args),
  getPublicTicketTypesForEvent: (...args: unknown[]) => mockGetPublicTicketTypesForEvent(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  getTicketBannerPublicUrl: (value: string | null | undefined) => value ?? null,
}))

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({ isOffline: false, isOnline: true, retry: vi.fn() }),
}))

vi.mock('@/utils/toast', () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
}))

vi.mock('@/components/ticketing/SeatSelector', () => ({
  default: () => <div data-testid="seat-selector" />,
}))

function renderPage(route = '/tickets/events/event-1') {
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
            <Route path="/tickets/events/:eventId" element={<TicketEventDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </TestWrapper>,
  )
}

describe('TicketEventDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicTicketedEventById.mockResolvedValue(
      createMockTicketedEvent({
        sales_start_at: '2026-01-01T00:00:00.000Z',
        sales_end_at: '2099-01-01T00:00:00.000Z',
      }),
    )
    mockGetPublicTicketTypesForEvent.mockResolvedValue([createMockTicketType()])
    mockCreateCheckoutSession.mockResolvedValue({
      data: { checkout_url: 'https://checkout.test/session', order_id: 'order-1' },
      error: null,
    })
  })

  test('[TE-E2E-003] renders event detail metadata and ticket tiers from direct route', async () => {
    mockGetPublicTicketTypesForEvent.mockResolvedValue([
      createMockTicketType({ name: 'General Admission' }),
      createMockTicketType({ id: 'vip', name: 'VIP', price_cents: 7500 }),
    ])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'City Championship' })).toBeInTheDocument()
    expect(screen.getByText('Regional finals')).toBeInTheDocument()
    expect(screen.getByText(/Main Arena, Riverside CA/)).toBeInTheDocument()
    expect(screen.getByText('General Admission')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
  })

  test('[TE-E2E-004] recalculates subtotal and total when quantities change', async () => {
    mockGetPublicTicketTypesForEvent.mockResolvedValue([
      createMockTicketType({ id: 'ga', name: 'GA', price_cents: 1000 }),
      createMockTicketType({ id: 'vip', name: 'VIP', price_cents: 2500 }),
    ])

    renderPage()

    await screen.findByText('GA')
    const addButtons = screen.getAllByRole('button', { name: 'add' })
    fireEvent.click(addButtons[0])
    fireEvent.click(addButtons[1])

    expect(screen.getAllByText('$35.00').length).toBeGreaterThanOrEqual(2)
  })

  test('[TE-E2E-005] enforces quantity bounds using capacity and zero-floor controls', async () => {
    mockGetPublicTicketTypesForEvent.mockResolvedValue([
      createMockTicketType({ id: 'limited', name: 'Limited', price_cents: 2000, capacity_remaining: 1 }),
    ])

    renderPage()

    await screen.findByText('Limited')
    const addButton = screen.getByRole('button', { name: 'add' })
    const removeButton = screen.getByRole('button', { name: 'remove' })

    fireEvent.click(addButton)
    expect(addButton).toBeDisabled()

    fireEvent.click(removeButton)
    expect(removeButton).toBeDisabled()
  })

  test('[TE-E2E-006] disables purchase controls and shows sold-out messaging', async () => {
    mockGetPublicTicketTypesForEvent.mockResolvedValue([
      createMockTicketType({ capacity_remaining: 0 }),
    ])

    renderPage()

    await screen.findByText('Sold out')
    expect(screen.getByText('This event is sold out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'add' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Checkout Now' })).toBeDisabled()
  })

  test('[TE-E2E-007] enforces guest email validation before enabling checkout', async () => {
    renderPage()

    await screen.findByText('General Admission')
    fireEvent.click(screen.getByRole('button', { name: 'add' }))

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const checkoutButton = screen.getByRole('button', { name: 'Checkout Now' })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(checkoutButton).toBeDisabled()

    fireEvent.change(emailInput, { target: { value: 'fan@example.com' } })
    await waitFor(() => {
      expect(checkoutButton).toBeEnabled()
    })
  })

  test('[TE-E2E-009] surfaces checkout discount errors without clearing selected tickets', async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      data: null,
      error: new Error('Invalid promo code'),
    })

    renderPage()

    await screen.findByText('General Admission')
    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'fan@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Checkout Now' }).closest('form')!)

    expect(await screen.findByText('Invalid promo code')).toBeInTheDocument()
    expect(screen.getAllByText('$25.00').length).toBeGreaterThanOrEqual(2)
    expect(mockShowError).toHaveBeenCalledWith('Invalid promo code')
  })
})
