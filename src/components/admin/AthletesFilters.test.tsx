import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AthletesFilters from './AthletesFilters'
import type { AthletesFilters as AthletesFiltersType } from './AthletesFilters'

describe('AthletesFilters', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultFilters: AthletesFiltersType = {
    search: '',
    teamIds: [],
    sportIds: [],
    programIds: [],
    levelIds: [],
    seasonIds: [],
    genders: [],
  }

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    teams: [{ id: 't1', name: 'Team A' }],
    sports: [{ id: 's1', name: 'Basketball' }],
    programs: [],
    levels: [],
    seasons: [],
    onClearAll: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing', () => {
      render(<AthletesFilters {...defaultProps} />)
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    test('shows search input with placeholder', () => {
      render(<AthletesFilters {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search athletes...')).toBeInTheDocument()
    })

    test('shows team and sport filter buttons', () => {
      render(<AthletesFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Team A' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Basketball' })).toBeInTheDocument()
    })

    test('shows gender options', () => {
      render(<AthletesFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Male' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Female' })).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onFiltersChange when search changes', async () => {
      render(<AthletesFilters {...defaultProps} />)
      await user.type(screen.getByPlaceholderText('Search athletes...'), 'x')
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'x' })
      )
    })

    test('calls onFiltersChange when team toggle clicked', async () => {
      render(<AthletesFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: 'Team A' }))
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ teamIds: ['t1'] })
      )
    })

    test('calls onClearAll when Clear All clicked', async () => {
      render(
        <AthletesFilters {...defaultProps} filters={{ ...defaultFilters, search: 'test' }} />
      )
      await user.click(screen.getByRole('button', { name: 'Clear All Filters' }))
      expect(defaultProps.onClearAll).toHaveBeenCalledTimes(1)
    })
  })
})
