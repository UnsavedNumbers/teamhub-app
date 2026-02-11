import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TravelFilters from './TravelFilters'
import type { TravelFilters as TravelFiltersType } from '@/types/travelManagement'

describe('TravelFilters', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultFilters: TravelFiltersType = {
    search: '',
    teamIds: [],
    status: [],
    dateFrom: '',
    dateTo: '',
  }

  const defaultTeams = [
    { id: 'team-1', name: 'U10 Basketball' },
    { id: 'team-2', name: 'U12 Soccer' },
  ]

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    teams: defaultTeams,
    onClearAll: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing with minimal props', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    test('shows filter panel header with Filters text', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    test('shows search input with placeholder', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search plans...')).toBeInTheDocument()
    })

    test('shows status filter buttons', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Draft' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelled' })).toBeInTheDocument()
    })

    test('shows team filter buttons when teams provided', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'U10 Basketball' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'U12 Soccer' })).toBeInTheDocument()
    })

    test('shows active filter count badge when filters applied', () => {
      render(
        <TravelFilters
          {...defaultProps}
          filters={{ ...defaultFilters, search: 'test', status: ['draft'] }}
        />
      )
      // activeFilterCount = search.length + teamIds.length + status.length + (dateFrom?1:0) + (dateTo?1:0) = 4+0+1+0+0 = 5
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onFiltersChange when search input changes', async () => {
      render(<TravelFilters {...defaultProps} />)
      const searchInput = screen.getByPlaceholderText('Search plans...')
      await user.type(searchInput, 'x')
      expect(defaultProps.onFiltersChange).toHaveBeenCalled()
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'x' })
      )
    })

    test('calls onFiltersChange when status toggle clicked', async () => {
      render(<TravelFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: 'Draft' }))
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['draft'] })
      )
    })

    test('calls onFiltersChange when team toggle clicked', async () => {
      render(<TravelFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: 'U10 Basketball' }))
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ teamIds: ['team-1'] })
      )
    })

    test('calls onClearAll when Clear All Filters clicked', async () => {
      render(
        <TravelFilters
          {...defaultProps}
          filters={{ ...defaultFilters, search: 'test' }}
        />
      )
      await user.click(screen.getByRole('button', { name: 'Clear All Filters' }))
      expect(defaultProps.onClearAll).toHaveBeenCalledTimes(1)
    })

    test('filter panel is expandable and collapsible', async () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search plans...')).toBeVisible()
      const header = screen.getByText('Filters').closest('div')
      if (header) {
        await user.click(header)
      }
      expect(screen.queryByPlaceholderText('Search plans...')).not.toBeInTheDocument()
      if (header) {
        await user.click(header)
      }
      expect(screen.getByPlaceholderText('Search plans...')).toBeVisible()
    })
  })

  describe('conditional states', () => {
    test('shows Clear All when filters are active', () => {
      render(
        <TravelFilters
          {...defaultProps}
          filters={{ ...defaultFilters, search: 'test' }}
        />
      )
      expect(screen.getByRole('button', { name: 'Clear All Filters' })).toBeVisible()
    })

    test('hides Clear All when no filters active', () => {
      render(<TravelFilters {...defaultProps} />)
      expect(screen.queryByRole('button', { name: 'Clear All Filters' })).not.toBeInTheDocument()
    })
  })
})
