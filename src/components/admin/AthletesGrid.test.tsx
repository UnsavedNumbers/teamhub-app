import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AthletesGrid from './AthletesGrid'
import type { AthleteCardData } from './AthletesGrid'

describe('AthletesGrid', () => {
  let user: ReturnType<typeof userEvent.setup>

  const mockAthlete: AthleteCardData = {
    id: 'a1',
    first_name: 'John',
    last_name: 'Doe',
    birthdate: '2010-05-15',
    gender: 'male',
    primary_sport: { id: 's1', name: 'Basketball' },
    primary_team: { id: 't1', name: 'Team A' },
  }

  const defaultProps = {
    athletes: [],
    loading: false,
    page: 1,
    rowsPerPage: 10,
    totalCount: 0,
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
    onAthleteClick: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    viewMode: 'grid' as const,
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders empty state when no athletes', () => {
      render(<AthletesGrid {...defaultProps} />)
      expect(screen.getByText('No athletes found')).toBeInTheDocument()
    })

    test('shows loading skeleton when loading', () => {
      render(<AthletesGrid {...defaultProps} loading />)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    test('renders athlete cards when athletes provided', () => {
      render(
        <AthletesGrid {...defaultProps} athletes={[mockAthlete]} totalCount={1} viewMode="grid" />
      )
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    test('shows sport and team info', () => {
      render(
        <AthletesGrid {...defaultProps} athletes={[mockAthlete]} totalCount={1} viewMode="grid" />
      )
      expect(screen.getByText('Basketball')).toBeInTheDocument()
      expect(screen.getByText('Team A')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onAthleteClick when athlete card clicked', async () => {
      render(
        <AthletesGrid {...defaultProps} athletes={[mockAthlete]} totalCount={1} viewMode="grid" />
      )
      await user.click(screen.getByText('John Doe'))
      expect(defaultProps.onAthleteClick).toHaveBeenCalledWith(mockAthlete)
    })
  })
})
