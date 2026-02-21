import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCoachTeamSelection } from './useCoachTeamSelection'
import { useUserContext } from './useUserContext'
import { getTeamsForCoach } from '../data/services/teamsService'
import { createMockTeam } from '../test/factories/team'

// Mock dependencies
vi.mock('./useUserContext')
vi.mock('../data/services/teamsService')

const mockUseUserContext = vi.mocked(useUserContext)
const mockGetTeamsForCoach = vi.mocked(getTeamsForCoach)

const mockContext = {
  userId: 'coach-1',
  orgId: 'org-1',
  email: 'coach@example.com',
}

const mockTeams = [
  createMockTeam({ id: 'team-1', name: 'Team Alpha' }),
  createMockTeam({ id: 'team-2', name: 'Team Beta' }),
  createMockTeam({ id: 'team-3', name: 'Team Gamma' }),
]

describe('useCoachTeamSelection', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
    localStorage.clear()
    
    mockUseUserContext.mockReturnValue({
      context: mockContext,
      isReady: true,
      isLoading: false,
      isAuthenticated: true,
      hasOrganization: true,
    } as any)
  })

  afterEach(() => {
    localStorage.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  )

  describe('team loading', () => {
    test('loads teams from service', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(mockGetTeamsForCoach).toHaveBeenCalledWith(mockContext)
      expect(result.current.teams).toEqual(mockTeams)
      expect(result.current.hasTeams).toBe(true)
    })

    test('handles loading state', () => {
      mockGetTeamsForCoach.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.teams).toEqual([])
    })

    test('handles error state', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ 
        data: [], 
        error: new Error('Failed to load teams') 
      })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.teams).toEqual([])
      expect(result.current.hasTeams).toBe(false)
    })

    test('does not load when context not ready', () => {
      mockUseUserContext.mockReturnValue({
        context: mockContext,
        isReady: false,
        isLoading: true,
        isAuthenticated: true,
        hasOrganization: true,
      } as any)
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      expect(mockGetTeamsForCoach).not.toHaveBeenCalled()
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('team selection initialization', () => {
    test('defaults to first team when no selection', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-1')
      })
    })

    test('loads selection from URL param', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const wrapperWithParams = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?team=team-2']}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </MemoryRouter>
      )
      
      const { result } = renderHook(() => useCoachTeamSelection(), { 
        wrapper: wrapperWithParams 
      })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-2')
      })
    })

    test('loads selection from localStorage', async () => {
      localStorage.setItem('coach_selected_team_id', 'team-3')
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-3')
      })
    })

    test('prefers URL param over localStorage', async () => {
      localStorage.setItem('coach_selected_team_id', 'team-3')
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const wrapperWithParams = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?team=team-2']}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </MemoryRouter>
      )
      
      const { result } = renderHook(() => useCoachTeamSelection(), { 
        wrapper: wrapperWithParams 
      })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-2')
      })
    })

    test('ignores invalid team ID in URL', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const wrapperWithParams = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?team=invalid-team']}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </MemoryRouter>
      )
      
      const { result } = renderHook(() => useCoachTeamSelection(), { 
        wrapper: wrapperWithParams 
      })
      
      await waitFor(() => {
        // Should default to first team
        expect(result.current.selectedTeamId).toBe('team-1')
      })
    })

    test('sets selectedTeamId to null when no teams', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: [], error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBeNull()
        expect(result.current.hasTeams).toBe(false)
      })
    })
  })

  describe('team selection updates', () => {
    test('updates selection via updateTeamSelection', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-1')
      })
      
      result.current.updateTeamSelection('team-2')
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-2')
      })
    })

    test('clears selection when null passed', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-1')
      })
      
      result.current.updateTeamSelection(null)
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBeNull()
      })
    })
  })

  describe('persistence', () => {
    test('saves selection to localStorage', async () => {
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-1')
      })
      
      result.current.updateTeamSelection('team-2')
      
      await waitFor(() => {
        expect(localStorage.getItem('coach_selected_team_id')).toBe('team-2')
      })
    })

    test('removes from localStorage when selection cleared', async () => {
      localStorage.setItem('coach_selected_team_id', 'team-1')
      mockGetTeamsForCoach.mockResolvedValue({ data: mockTeams, error: null })
      
      const { result } = renderHook(() => useCoachTeamSelection(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.selectedTeamId).toBe('team-1')
      })
      
      result.current.updateTeamSelection(null)
      
      await waitFor(() => {
        expect(localStorage.getItem('coach_selected_team_id')).toBeNull()
      })
    })
  })
})
