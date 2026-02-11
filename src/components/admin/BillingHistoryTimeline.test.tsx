import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingHistoryTimeline } from './BillingHistoryTimeline'
import type { BillingEvent } from '@/api/billing'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

const mockEvent: BillingEvent = {
  id: 'evt-1',
  created: 1704067200000,
  type: 'invoice.paid',
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
      render(<BillingHistoryTimeline events={[]} />, { wrapper: TestWrapper })
      expect(screen.getByText(/no events|no billing/i)).toBeTruthy()
    })

    test('renders events when provided', () => {
      render(<BillingHistoryTimeline events={[mockEvent]} />, { wrapper: TestWrapper })
      expect(screen.getByText('Subscription')).toBeInTheDocument()
    })
  })
})
