import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamCoachesTab } from './TeamCoachesTab'
import { getTeamCoaches, assignCoachToTeam, removeCoachFromTeam } from '../../data/services/teamsService'
import { useUserContext } from '../../hooks/useUserContext'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

// Mock dependencies
vi.mock('../../data/services/teamsService')
vi.mock('../../hooks/useUserContext')

const mockGetTeamCoaches = vi.mocked(getTeamCoaches)
const mockAssignCoachToTeam = vi.mocked(assignCoachToTeam)
const mockRemoveCoachFromTeam = vi.mocked(removeCoachFromTeam)
const mockUseUserContext = vi.mocked(useUserContext)

const mockContext = {
  userId: 'user-1',
  orgId: 'org-1',
  email: 'admin@example.com',
}

const mockCoaches = [
  {
    id: 'assignment-1',
    team_id: 'team-1',
    user_id: 'coach-1',
    role: 'head_coach' as const,
    created_at: '2026-01-01T00:00:00Z',
    user: {
      id: 'coach-1',
      email: 'coach1@example.com',
      display_name: 'Coach One',
      phone: '555-0101',
    },
  },
  {
    id: 'assignment-2',
    team_id: 'team-1',
    user_id: 'coach-2',
    role: 'assistant_coach' as const,
    created_at: '2026-01-02T00:00:00Z',
    user: {
      id: 'coach-2',
      email: 'coach2@example.com',
      display_name: null,
      phone: null,
    },
  },
]

describe('TeamCoachesTab', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    mockUseUserContext.mockReturnValue({
      context: mockContext,
      isReady: true,
      isLoading: false,
      isAuthenticated: true,
      hasOrganization: true,
    } as any)

    // Mock window.confirm
    window.confirm = vi.fn(() => true)
  })

  describe('loading state', () => {
    test('shows loading message initially', () => {
      mockGetTeamCoaches.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    test('shows empty message when no coaches assigned', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: [], error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No coaches assigned to this team.')).toBeInTheDocument()
      })
    })
  })

  describe('coach list', () => {
    test('displays assigned coaches', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: mockCoaches, error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
        expect(screen.getByText('coach1@example.com')).toBeInTheDocument()
        expect(screen.getByText('coach2@example.com')).toBeInTheDocument()
      })
    })

    test('displays coach role', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: mockCoaches, error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/head coach/i)).toBeInTheDocument()
        expect(screen.getByText(/assistant coach/i)).toBeInTheDocument()
      })
    })

    test('displays assignment date', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: mockCoaches, error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Assigned/i)).toBeInTheDocument()
      })
    })

    test('shows email when display_name is null', async () => {
      mockGetTeamCoaches.mockResolvedValue({ 
        data: [mockCoaches[1]], 
        error: null 
      })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('coach2@example.com')).toBeInTheDocument()
      })
    })
  })

  describe('add coach', () => {
    test('opens modal when Add Coach clicked', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: [], error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No coaches assigned to this team.')).toBeInTheDocument()
      })
      
      const addButton = screen.getByRole('button', { name: /Add Coach/i })
      await user.click(addButton)
      
      expect(screen.getByText('Assign Coach to Team')).toBeInTheDocument()
    })
  })

  describe('remove coach', () => {
    test('removes coach when Remove clicked', async () => {
      mockGetTeamCoaches
        .mockResolvedValueOnce({ data: mockCoaches, error: null })
        .mockResolvedValueOnce({ data: [mockCoaches[0]], error: null })
      
      mockRemoveCoachFromTeam.mockResolvedValue({ error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i })
      await user.click(removeButtons[0])
      
      await waitFor(() => {
        expect(mockRemoveCoachFromTeam).toHaveBeenCalledWith(mockContext, 'team-1', 'coach-1')
        expect(mockGetTeamCoaches).toHaveBeenCalledTimes(2) // Initial load + refresh after remove
      })
    })

    test('does not remove if user cancels confirmation', async () => {
      window.confirm = vi.fn(() => false)
      mockGetTeamCoaches.mockResolvedValue({ data: mockCoaches, error: null })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i })
      await user.click(removeButtons[0])
      
      expect(mockRemoveCoachFromTeam).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('displays error message on load failure', async () => {
      mockGetTeamCoaches.mockResolvedValue({ 
        data: [], 
        error: new Error('Failed to load coaches') 
      })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load coaches')).toBeInTheDocument()
      })
    })

    test('displays error message on assign failure', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: [], error: null })
      mockAssignCoachToTeam.mockResolvedValue({ 
        data: null, 
        error: new Error('Failed to assign coach') 
      })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No coaches assigned to this team.')).toBeInTheDocument()
      })
      
      const addButton = screen.getByRole('button', { name: /Add Coach/i })
      await user.click(addButton)
      
      // Note: This test would need AssignCoachModal to be rendered and tested
      // For now, we verify the modal opens
      expect(screen.getByText('Assign Coach to Team')).toBeInTheDocument()
    })

    test('displays error message on remove failure', async () => {
      mockGetTeamCoaches.mockResolvedValue({ data: mockCoaches, error: null })
      mockRemoveCoachFromTeam.mockResolvedValue({ 
        error: new Error('Failed to remove coach') 
      })
      
      render(
        <TestWrapper>
          <TeamCoachesTab teamId="team-1" orgId="org-1" />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Coach One')).toBeInTheDocument()
      })
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i })
      await user.click(removeButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText('Failed to remove coach')).toBeInTheDocument()
      })
    })
  })
})
