import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventFilters from './EventFilters'
import type { CalendarFilters } from '@/types/calendar'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

describe('EventFilters', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultFilters: CalendarFilters = {
    childIds: [],
    teamIds: [],
    eventTypes: [],
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 1, 28),
    showCancelled: false,
  }

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing', () => {
      render(<EventFilters {...defaultProps} />, { wrapper: TestWrapper })
      expect(screen.getByText(/filters/i)).toBeInTheDocument()
    })

    test('shows filter count badge when filters applied', () => {
      render(<EventFilters {...defaultProps} filters={{ ...defaultFilters, eventTypes: ['game'], showCancelled: true }} />, { wrapper: TestWrapper })
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    test('expands filter panel when header clicked', async () => {
      render(<EventFilters {...defaultProps} />, { wrapper: TestWrapper })
      await user.click(screen.getByText(/filters/i))
      expect(screen.getByText(/all event types/i)).toBeInTheDocument()
      expect(screen.getByText(/show cancelled events/i)).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onFiltersChange when event type toggled', async () => {
      const onFiltersChange = vi.fn()
      render(<EventFilters {...defaultProps} onFiltersChange={onFiltersChange} />, { wrapper: TestWrapper })
      await user.click(screen.getByText(/filters/i))
      const gameButton = screen.getByRole('button', { name: /game/i })
      await user.click(gameButton)
      expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ eventTypes: ['game'] }))
    })

    test('calls onFiltersChange when show cancelled toggled', async () => {
      const onFiltersChange = vi.fn()
      render(<EventFilters {...defaultProps} onFiltersChange={onFiltersChange} />, { wrapper: TestWrapper })
      await user.click(screen.getByText(/filters/i))
      const checkbox = screen.getByRole('checkbox', { name: /show cancelled/i })
      await user.click(checkbox)
      expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ showCancelled: true }))
    })

    test('clears filters when clear button clicked', async () => {
      const onFiltersChange = vi.fn()
      render(<EventFilters {...defaultProps} filters={{ ...defaultFilters, eventTypes: ['game'], showCancelled: true }} onFiltersChange={onFiltersChange} />, { wrapper: TestWrapper })
      await user.click(screen.getByText(/filters/i))
      await user.click(screen.getByText(/clear filters/i))
      expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ eventTypes: [], showCancelled: false }))
    })

    test('removes event type when already selected type clicked', async () => {
      const onFiltersChange = vi.fn()
      render(<EventFilters {...defaultProps} filters={{ ...defaultFilters, eventTypes: ['game'] }} onFiltersChange={onFiltersChange} />, { wrapper: TestWrapper })
      await user.click(screen.getByText(/filters/i))
      const gameButton = screen.getByRole('button', { name: /game/i })
      await user.click(gameButton)
      expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ eventTypes: [] }))
    })
  })
})
