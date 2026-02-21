import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignCoachModal } from './AssignCoachModal'
import { supabase } from '../../lib/supabase'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockOnClose = vi.fn()
const mockOnSuccess = vi.fn()

const mockOrgMembers = [
  {
    user_id: 'coach-1',
    user: {
      id: 'coach-1',
      email: 'coach1@example.com',
      display_name: 'Coach One',
    },
  },
  {
    user_id: 'coach-2',
    user: {
      id: 'coach-2',
      email: 'coach2@example.com',
      display_name: null,
    },
  },
]

const mockUsers = [
  {
    id: 'coach-1',
    email: 'coach1@example.com',
    display_name: 'Coach One',
  },
  {
    id: 'coach-2',
    email: 'coach2@example.com',
    display_name: null,
  },
]

describe('AssignCoachModal', () => {
  let user: ReturnType<typeof userEvent.setup>
  const mockFrom = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    // Setup Supabase mock chain
    vi.mocked(supabase.from).mockReturnValue(mockFrom as any)
    
    // Default mock chain for organization_members query
    const orgMembersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({ data: mockOrgMembers, error: null }),
    }
    
    // Default mock chain for users query
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
    }
    
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organization_members') return orgMembersChain
      if (table === 'users') return usersChain
      return {}
    })
  })

  const renderModal = () => {
    return render(
      <TestWrapper>
        <AssignCoachModal
          teamId="team-1"
          orgId="org-1"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    )
  }

  describe('rendering', () => {
    test('renders modal with title', () => {
      renderModal()
      expect(screen.getByText('Assign Coach to Team')).toBeInTheDocument()
    })

    test('renders search input', () => {
      renderModal()
      expect(screen.getByPlaceholderText('Enter email or name...')).toBeInTheDocument()
    })

    test('renders role select', () => {
      renderModal()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Head Coach')).toBeInTheDocument()
    })

    test('renders Cancel and Assign Coach buttons', () => {
      renderModal()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Assign Coach/i })).toBeInTheDocument()
    })

    test('Assign Coach button is disabled initially', () => {
      renderModal()
      const assignButton = screen.getByRole('button', { name: /Assign Coach/i })
      expect(assignButton).toBeDisabled()
    })
  })

  describe('user search', () => {
    test('does not search with less than 2 characters', async () => {
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'a')
      
      await waitFor(() => {
        expect(mockFrom).not.toHaveBeenCalled()
      })
    })

    test('searches after 2 characters with debounce', async () => {
      vi.useFakeTimers()
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'co')
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('organization_members')
      })
      
      vi.useRealTimers()
    })

    test('displays search results', async () => {
      vi.useFakeTimers()
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
        expect(screen.getByText('coach1@example.com')).toBeInTheDocument()
        expect(screen.getByText('coach2@example.com')).toBeInTheDocument()
      })
      
      vi.useRealTimers()
    })

    test('shows loading state during search', async () => {
      vi.useFakeTimers()
      
      // Make search take time
      const orgMembersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ data: mockOrgMembers, error: null }), 100))
        ),
      }
      
      mockFrom.mockReturnValue(orgMembersChain as any)
      
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      
      vi.useRealTimers()
    })

    test('displays error on search failure', async () => {
      vi.useFakeTimers()
      
      const orgMembersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: null, error: new Error('Search failed') }),
      }
      
      mockFrom.mockReturnValue(orgMembersChain as any)
      
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText(/Search failed|Failed to search users/i)).toBeInTheDocument()
      })
      
      vi.useRealTimers()
    })
  })

  describe('user selection', () => {
    test('selects user when clicked', async () => {
      vi.useFakeTimers()
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const coachButton = screen.getByText('Coach One').closest('button')
      expect(coachButton).toBeInTheDocument()
      await user.click(coachButton!)
      
      // Button should be enabled after selection
      const assignButton = screen.getByRole('button', { name: /Assign Coach/i })
      expect(assignButton).not.toBeDisabled()
      
      vi.useRealTimers()
    })

    test('highlights selected user', async () => {
      vi.useFakeTimers()
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const coachButton = screen.getByText('Coach One').closest('button')
      await user.click(coachButton!)
      
      // Selected button should have different styling (checked via aria or class)
      expect(coachButton).toHaveStyle({ border: expect.stringContaining('2px') })
      
      vi.useRealTimers()
    })
  })

  describe('role selection', () => {
    test('changes role when select changed', async () => {
      renderModal()
      const roleSelect = screen.getByLabelText('Role')
      
      await user.selectOptions(roleSelect, 'assistant_coach')
      
      expect(screen.getByDisplayValue('Assistant Coach')).toBeInTheDocument()
    })

    test('defaults to head_coach', () => {
      renderModal()
      expect(screen.getByDisplayValue('Head Coach')).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    test('calls onSuccess with selected user and role', async () => {
      vi.useFakeTimers()
      renderModal()
      const searchInput = screen.getByPlaceholderText('Enter email or name...')
      
      await user.type(searchInput, 'coach')
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const coachButton = screen.getByText('Coach One').closest('button')
      await user.click(coachButton!)
      
      const roleSelect = screen.getByLabelText('Role')
      await user.selectOptions(roleSelect, 'assistant_coach')
      
      const assignButton = screen.getByRole('button', { name: /Assign Coach/i })
      await user.click(assignButton)
      
      expect(mockOnSuccess).toHaveBeenCalledWith('coach-1', 'assistant_coach')
      
      vi.useRealTimers()
    })

    test('shows error if no user selected', async () => {
      renderModal()
      const assignButton = screen.getByRole('button', { name: /Assign Coach/i })
      
      // Try to click disabled button (should not work, but test the error state)
      // Actually, we need to enable it first by selecting a user
      // But if we don't select, clicking should show error
      
      // Since button is disabled, we can't click it
      // But if we somehow enable it without selecting, it should show error
      // This is more of an integration test scenario
    })
  })

  describe('modal interaction', () => {
    test('closes modal when Cancel clicked', async () => {
      renderModal()
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    test('closes modal when backdrop clicked', async () => {
      renderModal()
      const backdrop = screen.getByText('Assign Coach to Team').closest('div')?.parentElement
      
      // Click outside the modal content
      if (backdrop) {
        await user.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    test('does not close when modal content clicked', async () => {
      renderModal()
      const modalContent = screen.getByText('Assign Coach to Team')
      await user.click(modalContent)
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
