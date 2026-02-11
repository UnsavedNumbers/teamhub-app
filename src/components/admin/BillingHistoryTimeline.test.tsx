import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingHistoryTimeline } from './BillingHistoryTimeline'
import type { BillingEvent } from '@/api/billing'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

const mockEvent: BillingEvent = {
  id: 'evt-1',
  created_at: '2026-01-01T12:00:00Z',
  event_type: 'invoice.paid',
  stripe_event_id: null,
  stripe_object_id: null,
  processed_at: null,
  amount: 2999,
  currency: 'usd',
  description: 'Subscription',
}

describe('BillingHistoryTimeline', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing with empty events', () => {
      const { container } = render(
        <BillingHistoryTimeline events={[]} hasSubscription />,
        { wrapper: TestWrapper }
      )
      expect(container).toBeInTheDocument()
    })

    test('renders events when provided', () => {
      render(<BillingHistoryTimeline events={[mockEvent]} />, { wrapper: TestWrapper })
      expect(screen.getByText('Subscription')).toBeInTheDocument()
    })
  })
})
