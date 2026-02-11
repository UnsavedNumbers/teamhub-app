import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventCard from './EventCard'
import { createMockCalendarEvent } from '@/test/factories'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

vi.mock('../portal/SportCardImage', () => ({
  SportCardImage: ({ children }: { children: React.ReactNode }) => <div data-testid="sport-card-image">{children}</div>,
}))

describe('EventCard', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultEvent = createMockCalendarEvent({
    id: '1',
    title: 'Practice',
    type: 'practice',
    start_time: '2026-01-15T10:00:00Z',
    end_time: '2026-01-15T11:00:00Z',
    team: { id: 't1', name: 'Test Team', org_id: 'o1' },
  })

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing with minimal props', () => {
      render(<EventCard event={defaultEvent} />, { wrapper: TestWrapper })
      expect(screen.getAllByText('Practice').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Test Team')).toBeInTheDocument()
    })

    test('displays event type label', () => {
      render(<EventCard event={defaultEvent} />, { wrapper: TestWrapper })
      expect(screen.getAllByText(/practice/i).length).toBeGreaterThanOrEqual(1)
    })

    test('shows Unknown Team when team missing', () => {
      const eventNoTeam = createMockCalendarEvent({ ...defaultEvent, team: undefined })
      render(<EventCard event={eventNoTeam} />, { wrapper: TestWrapper })
      expect(screen.getByText('Unknown Team')).toBeInTheDocument()
    })

    test('shows cancelled badge when event is cancelled', () => {
      const cancelledEvent = createMockCalendarEvent({ ...defaultEvent, is_cancelled: true, cancellation_reason: 'Weather' })
      render(<EventCard event={cancelledEvent} />, { wrapper: TestWrapper })
      expect(screen.getByText(/cancelled/i)).toBeInTheDocument()
      expect(screen.getByText(/Weather/)).toBeInTheDocument()
    })

    test('applies custom className', () => {
      const { container } = render(<EventCard event={defaultEvent} className="custom-class" />, { wrapper: TestWrapper })
      const button = container.querySelector('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('user interactions', () => {
    test('calls onClick when clicked', async () => {
      const onClick = vi.fn()
      render(<EventCard event={defaultEvent} onClick={onClick} />, { wrapper: TestWrapper })
      await user.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('is clickable when onClick provided', async () => {
      const onClick = vi.fn()
      render(<EventCard event={defaultEvent} onClick={onClick} />, { wrapper: TestWrapper })
      const button = screen.getByRole('button')
      await user.click(button)
      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('compact mode', () => {
    test('does not show arrival time and location when compact', () => {
      const eventWithLocation = createMockCalendarEvent({
        ...defaultEvent,
        arrival_time: '2026-01-15T09:45:00Z',
        event_location: { id: 'el1', event_id: '1', venue_name: 'Main Field', address_line1: '123 Main', city: 'Town', state: 'ST', postal_code: '12345', country: 'US', place_id: null, latitude: null, longitude: null, is_tbd: false, is_virtual: false, virtual_link: null, created_at: '', updated_at: '' },
      } as never)
      render(<EventCard event={eventWithLocation} compact />, { wrapper: TestWrapper })
      expect(screen.queryByText(/arrive/i)).not.toBeInTheDocument()
    })
  })
})
