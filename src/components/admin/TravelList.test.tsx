import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TravelList from './TravelList'
import { createMockTravelPlan } from '@/test/factories'

describe('TravelList', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultProps = {
    plans: [],
    loading: false,
    page: 1,
    rowsPerPage: 10,
    totalCount: 0,
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
    onRowClick: vi.fn(),
    onEdit: vi.fn(),
    onPublish: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing with empty plans', () => {
      render(<TravelList {...defaultProps} />)
      expect(screen.getByText('No travel plans found')).toBeInTheDocument()
    })

    test('shows loading skeleton when loading', () => {
      render(<TravelList {...defaultProps} loading />)
      const skeletons = document.querySelectorAll('[style*="opacity: 0.5"]')
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    test('renders plan items when plans provided', () => {
      const plans = [
        createMockTravelPlan({ id: '1', title: 'Spring Tournament' }),
        createMockTravelPlan({ id: '2', title: 'Regional Finals' }),
      ]
      render(
        <TravelList
          {...defaultProps}
          plans={plans}
          totalCount={2}
        />
      )
      expect(screen.getByText('Spring Tournament')).toBeInTheDocument()
      expect(screen.getByText('Regional Finals')).toBeInTheDocument()
    })

    test('shows team name when plan has team', () => {
      const plan = createMockTravelPlan({ title: 'Tournament', team: { id: 't1', name: 'U10 Basketball' } })
      render(<TravelList {...defaultProps} plans={[plan]} totalCount={1} />)
      expect(screen.getByText('U10 Basketball')).toBeInTheDocument()
    })

    test('shows Cancelled badge for cancelled plans', () => {
      const plan = createMockTravelPlan({ title: 'Cancelled Trip', status: 'cancelled' })
      render(<TravelList {...defaultProps} plans={[plan]} totalCount={1} />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('calls onRowClick when plan row clicked', async () => {
      const plan = createMockTravelPlan({ id: '1', title: 'Spring Tournament' })
      render(<TravelList {...defaultProps} plans={[plan]} totalCount={1} />)
      await user.click(screen.getByText('Spring Tournament'))
      expect(defaultProps.onRowClick).toHaveBeenCalledWith(plan)
    })
  })

  describe('empty state', () => {
    test('shows empty state message when no plans', () => {
      render(<TravelList {...defaultProps} />)
      expect(screen.getByText('No travel plans found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
    })
  })
})
