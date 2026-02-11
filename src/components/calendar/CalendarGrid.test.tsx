import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarGrid from './CalendarGrid'
import { createMockCalendarEvent } from '@/test/factories'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

describe('CalendarGrid', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultProps = {
    events: [],
    eventSports: {},
    viewMode: 'month' as const,
    currentDate: new Date(2026, 0, 15),
    onEventClick: vi.fn(),
    onDateChange: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing with minimal props', () => {
      render(<CalendarGrid {...defaultProps} />, { wrapper: TestWrapper })
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
    })

    test('renders month view with day headers', () => {
      render(<CalendarGrid {...defaultProps} viewMode="month" />, { wrapper: TestWrapper })
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    test('renders events in agenda view', () => {
      const events = [
        createMockCalendarEvent({ id: '1', title: 'Practice', start_time: '2026-01-15T10:00:00Z', end_time: '2026-01-15T11:00:00Z' }),
        createMockCalendarEvent({ id: '2', title: 'Game', start_time: '2026-01-15T14:00:00Z', end_time: '2026-01-15T16:00:00Z', type: 'game' }),
      ]
      render(<CalendarGrid {...defaultProps} events={events} viewMode="agenda" currentDate={new Date(2026, 0, 15)} />, { wrapper: TestWrapper })
      // EventCard shows both type badge and title; Practice/Game appear in both
      expect(screen.getAllByText('Practice').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Game').length).toBeGreaterThanOrEqual(1)
    })

    test('applies custom eventsPerPage', () => {
      const events = Array.from({ length: 20 }, (_, i) =>
        createMockCalendarEvent({ id: `e${i}`, title: `Event ${i}`, start_time: `2026-01-${15 + Math.floor(i / 3)}T10:00:00Z`, end_time: `2026-01-${15 + Math.floor(i / 3)}T11:00:00Z` })
      )
      render(<CalendarGrid {...defaultProps} events={events} viewMode="agenda" eventsPerPage={5} currentPage={1} onPageChange={vi.fn()} />, { wrapper: TestWrapper })
      expect(screen.getByText('Event 0')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onDateChange when day cell clicked in month view', async () => {
      const onDateChange = vi.fn()
      render(<CalendarGrid {...defaultProps} onDateChange={onDateChange} />, { wrapper: TestWrapper })
      const day15 = screen.getByText('15')
      await user.click(day15)
      expect(onDateChange).toHaveBeenCalled()
      expect(onDateChange.mock.calls[0][0]).toBeInstanceOf(Date)
      expect(onDateChange.mock.calls[0][0].getDate()).toBe(15)
    })

    test('calls onEventClick when event clicked in month view', async () => {
      const event = createMockCalendarEvent({ id: '1', title: 'Practice', start_time: '2026-01-15T10:00:00Z', end_time: '2026-01-15T11:00:00Z' })
      const onEventClick = vi.fn()
      render(<CalendarGrid {...defaultProps} events={[event]} onEventClick={onEventClick} currentDate={new Date(2026, 0, 15)} />, { wrapper: TestWrapper })
      const eventEl = screen.getByText(/Practice/)
      await user.click(eventEl)
      expect(onEventClick).toHaveBeenCalledWith(event)
    })

    test('calls onPageChange when pagination button clicked in agenda view', async () => {
      const events = Array.from({ length: 15 }, (_, i) =>
        createMockCalendarEvent({ id: `e${i}`, title: `Event ${i}`, start_time: `2026-01-${15 + i}T10:00:00Z`, end_time: `2026-01-${15 + i}T11:00:00Z` })
      )
      const onPageChange = vi.fn()
      render(<CalendarGrid {...defaultProps} events={events} viewMode="agenda" eventsPerPage={5} currentPage={1} onPageChange={onPageChange} />, { wrapper: TestWrapper })
      const nextButton = screen.getByRole('button', { name: /chevron_right|next/i })
      await user.click(nextButton)
      expect(onPageChange).toHaveBeenCalledWith(2)
    })
  })

  describe('conditional states', () => {
    test('shows "+N more" when day has more than 3 events in month view', () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockCalendarEvent({ id: `e${i}`, title: `Event ${i}`, start_time: '2026-01-15T10:00:00Z', end_time: '2026-01-15T11:00:00Z' })
      )
      render(<CalendarGrid {...defaultProps} events={events} currentDate={new Date(2026, 0, 15)} />, { wrapper: TestWrapper })
      expect(screen.getByText('+2 more')).toBeInTheDocument()
    })

    test('disables prev button on first page', () => {
      const events = Array.from({ length: 15 }, (_, i) =>
        createMockCalendarEvent({ id: `e${i}`, title: `Event ${i}`, start_time: `2026-01-${15 + i}T10:00:00Z`, end_time: `2026-01-${15 + i}T11:00:00Z` })
      )
      render(<CalendarGrid {...defaultProps} events={events} viewMode="agenda" eventsPerPage={5} currentPage={1} onPageChange={vi.fn()} />, { wrapper: TestWrapper })
      const prevButton = screen.getByRole('button', { name: /chevron_left|prev/i })
      expect(prevButton).toBeDisabled()
    })
  })
})
