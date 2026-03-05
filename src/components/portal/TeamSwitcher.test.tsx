import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TeamSwitcher } from './TeamSwitcher'
import type { Team } from '@/data/types/organization'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

const STORAGE_KEY = 'coach_selected_team_id'

const mockTeams: Team[] = [
  { id: 'team-1', name: 'Team Alpha', org_id: 'org-1', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'team-2', name: 'Team Beta', org_id: 'org-1', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'team-3', name: 'Team Gamma', org_id: 'org-1', created_at: '2026-01-01', updated_at: '2026-01-01' },
]

describe('TeamSwitcher', () => {
  let user: ReturnType<typeof userEvent.setup>
  const mockOnTeamChange = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const renderTeamSwitcher = (teams: Team[], selectedTeamId: string | null = null, initialSearchParams = '') => {
    return render(
      <MemoryRouter initialEntries={[`/?${initialSearchParams}`]}>
        <TestWrapper>
          <TeamSwitcher
            selectedTeamId={selectedTeamId}
            onTeamChange={mockOnTeamChange}
            teams={teams}
          />
        </TestWrapper>
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    test('renders nothing when no teams', () => {
      const { container } = renderTeamSwitcher([])
      expect(container.firstChild).toBeNull()
    })

    test('renders team name without dropdown when only one team', () => {
      renderTeamSwitcher([mockTeams[0]])
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    test('renders dropdown button when multiple teams', () => {
      renderTeamSwitcher(mockTeams)
      const button = screen.getByRole('button', { name: /Team/ })
      expect(button).toBeInTheDocument()
    })

    test('shows "Select Team" when no team selected', () => {
      renderTeamSwitcher(mockTeams, null)
      expect(screen.getByText('Select Team')).toBeInTheDocument()
    })

    test('shows selected team name', () => {
      renderTeamSwitcher(mockTeams, 'team-2')
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })
  })

  describe('team selection', () => {
    test('defaults to first team when no selection', async () => {
      renderTeamSwitcher(mockTeams)
      await waitFor(() => {
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-1')
      })
    })

    test('loads selection from URL param', async () => {
      renderTeamSwitcher(mockTeams, null, 'team=team-2')
      await waitFor(() => {
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-2')
      })
    })

    test('loads selection from localStorage when URL param missing', async () => {
      localStorage.setItem(STORAGE_KEY, 'team-3')
      renderTeamSwitcher(mockTeams)
      await waitFor(() => {
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-3')
      })
    })

    test('prefers URL param over localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'team-3')
      renderTeamSwitcher(mockTeams, null, 'team=team-2')
      await waitFor(() => {
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-2')
        expect(mockOnTeamChange).not.toHaveBeenCalledWith('team-3')
      })
    })

    test('opens dropdown when button clicked', async () => {
      renderTeamSwitcher(mockTeams, 'team-1')
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(screen.getByText('All Teams')).toBeInTheDocument()
      expect(screen.getAllByText('Team Alpha').length).toBeGreaterThan(0)
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
      expect(screen.getByText('Team Gamma')).toBeInTheDocument()
    })

    test('selects team from dropdown', async () => {
      renderTeamSwitcher(mockTeams, 'team-1')
      const button = screen.getByRole('button')
      await user.click(button)
      
      const teamBetaButton = screen.getByText('Team Beta').closest('button')
      expect(teamBetaButton).toBeInTheDocument()
      await user.click(teamBetaButton!)
      
      expect(mockOnTeamChange).toHaveBeenCalledWith('team-2')
    })

    test('selects "All Teams" option', async () => {
      renderTeamSwitcher(mockTeams, 'team-1')
      const button = screen.getByRole('button')
      await user.click(button)
      
      const allTeamsButton = screen.getByText('All Teams').closest('button')
      expect(allTeamsButton).toBeInTheDocument()
      await user.click(allTeamsButton!)
      
      expect(mockOnTeamChange).toHaveBeenCalledWith(null)
    })

    test('closes dropdown after selection', async () => {
      renderTeamSwitcher(mockTeams, 'team-1')
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(screen.getByText('All Teams')).toBeInTheDocument()
      
      const teamBetaButton = screen.getByText('Team Beta').closest('button')
      await user.click(teamBetaButton!)
      
      await waitFor(() => {
        expect(screen.queryByText('All Teams')).not.toBeInTheDocument()
      })
    })
  })

  describe('persistence', () => {
    test('saves selection to localStorage', async () => {
      renderTeamSwitcher(mockTeams, 'team-2')
      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe('team-2')
      })
    })

    test('removes from localStorage when selection cleared', async () => {
      localStorage.setItem(STORAGE_KEY, 'team-1')
      renderTeamSwitcher(mockTeams, null)
      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      })
    })
  })

  describe('edge cases', () => {
    test('ignores invalid team ID in URL', async () => {
      renderTeamSwitcher(mockTeams, null, 'team=invalid-team')
      await waitFor(() => {
        // Should default to first team
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-1')
      })
    })

    test('ignores invalid team ID in localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-team')
      renderTeamSwitcher(mockTeams)
      await waitFor(() => {
        // Should default to first team
        expect(mockOnTeamChange).toHaveBeenCalledWith('team-1')
      })
    })

    test('handles team removal gracefully', () => {
      const { rerender } = renderTeamSwitcher(mockTeams, 'team-2')
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
      
      // Remove team-2 from list
      rerender(
        <MemoryRouter>
          <TestWrapper>
            <TeamSwitcher
              selectedTeamId="team-2"
              onTeamChange={mockOnTeamChange}
              teams={mockTeams.filter(t => t.id !== 'team-2')}
            />
          </TestWrapper>
        </MemoryRouter>
      )
      
      // Should show "Select Team" or default to first available
      expect(screen.queryByText('Team Beta')).not.toBeInTheDocument()
    })
  })
})
