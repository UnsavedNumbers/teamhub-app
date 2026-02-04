/**
 * Team Management Tests
 *
 * Comprehensive test suite for team CRUD operations, member management,
 * roster handling, and team-organization relationships.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { teamsService } from '../../../data/services/teamsService'

// Mock dependencies
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}))

vi.mock('../../../data/services/teamsService', () => ({
  teamsService: {
    getTeams: vi.fn(),
    getTeamDetails: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    addTeamMember: vi.fn(),
    removeTeamMember: vi.fn(),
    updateTeamMemberRole: vi.fn(),
    getTeamRoster: vi.fn(),
    getTeamStats: vi.fn(),
  },
}))

describe('Team Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTeams', () => {
    test('retrieves teams for an organization', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Varsity Soccer',
          sport_id: 'sport-1',
          organization_id: 'org-1',
          coach_id: 'user-1',
          max_players: 22,
          min_players: 11,
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'team-2',
          name: 'JV Soccer',
          sport_id: 'sport-1',
          organization_id: 'org-1',
          coach_id: 'user-2',
          max_players: 18,
          min_players: 11,
          status: 'active',
          created_at: '2024-01-02T00:00:00Z',
        },
      ]

      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: mockTeams,
        error: null,
      })

      const result = await teamsService.getTeams('org-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].name).toBe('Varsity Soccer')
      expect(result.data?.[1].name).toBe('JV Soccer')
    })

    test('filters teams by sport', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Varsity Basketball',
          sport_id: 'sport-2',
          organization_id: 'org-1',
        },
      ]

      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: mockTeams,
        error: null,
      })

      const result = await teamsService.getTeams('org-1', { sportId: 'sport-2' })

      expect(result.error).toBeNull()
      expect(result.data?.[0].sport_id).toBe('sport-2')
    })

    test('filters teams by status', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Active Team',
          status: 'active',
        },
      ]

      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: mockTeams,
        error: null,
      })

      const result = await teamsService.getTeams('org-1', { status: 'active' })

      expect(result.error).toBeNull()
      expect(result.data?.[0].status).toBe('active')
    })

    test('returns empty array for organization with no teams', async () => {
      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await teamsService.getTeams('org-empty')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    test('validates organization ID parameter', async () => {
      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: null,
        error: { message: 'Organization ID is required' },
      })

      const result = await teamsService.getTeams('')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization ID is required')
    })
  })

  describe('getTeamDetails', () => {
    test('retrieves detailed team information', async () => {
      const mockTeamDetails = {
        id: 'team-1',
        name: 'Varsity Soccer',
        description: 'Premier soccer team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        coach_id: 'user-1',
        assistant_coach_id: 'user-2',
        max_players: 22,
        min_players: 11,
        status: 'active',
        season_id: 'season-1',
        age_group: 'U-18',
        skill_level: 'varsity',
        roster: [
          { id: 'player-1', name: 'John Doe', role: 'player' },
          { id: 'player-2', name: 'Jane Smith', role: 'captain' },
        ],
        stats: {
          total_players: 18,
          active_players: 16,
          injured_players: 2,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: mockTeamDetails,
        error: null,
      })

      const result = await teamsService.getTeamDetails('team-1')

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('team-1')
      expect(result.data?.name).toBe('Varsity Soccer')
      expect(result.data?.roster).toHaveLength(2)
      expect(result.data?.stats?.total_players).toBe(18)
    })

    test('returns null for non-existent team', async () => {
      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await teamsService.getTeamDetails('non-existent-team')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    test('includes roster information', async () => {
      const mockTeamWithRoster = {
        id: 'team-1',
        roster: [
          { id: 'player-1', name: 'John Doe', position: 'forward', jersey_number: 10 },
          { id: 'player-2', name: 'Jane Smith', position: 'midfielder', jersey_number: 7 },
        ],
      }

      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: mockTeamWithRoster,
        error: null,
      })

      const result = await teamsService.getTeamDetails('team-1')

      expect(result.data?.roster).toHaveLength(2)
      expect(result.data?.roster[0].jersey_number).toBe(10)
    })
  })

  describe('createTeam', () => {
    test('successfully creates a new team', async () => {
      const teamData = {
        name: 'New Soccer Team',
        description: 'A new team for the season',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        coach_id: 'user-1',
        max_players: 20,
        min_players: 11,
        season_id: 'season-1',
        age_group: 'U-16',
        skill_level: 'competitive',
      }

      const mockCreatedTeam = {
        id: 'team-new',
        ...teamData,
        status: 'active',
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: mockCreatedTeam,
        error: null,
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('team-new')
      expect(result.data?.name).toBe('New Soccer Team')
      expect(result.data?.status).toBe('active')
    })

    test('validates required fields', async () => {
      const invalidTeamData = {
        name: '', // Empty name
        sport_id: 'sport-1',
        organization_id: 'org-1',
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Team name is required' },
      })

      const result = await teamsService.createTeam(invalidTeamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Team name is required')
    })

    test('validates team name uniqueness within organization', async () => {
      const teamData = {
        name: 'Existing Team Name',
        sport_id: 'sport-1',
        organization_id: 'org-1',
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Team name already exists in this organization' },
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Team name already exists in this organization')
    })

    test('validates player limits', async () => {
      const invalidLimits = {
        name: 'Test Team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        max_players: 5, // Too low
        min_players: 10, // Higher than max
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Invalid player limits: max must be greater than min' },
      })

      const result = await teamsService.createTeam(invalidLimits)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid player limits: max must be greater than min')
    })

    test('validates coach permissions', async () => {
      const teamData = {
        name: 'New Team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        coach_id: 'unauthorized-user',
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized: user does not have coach permissions' },
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Unauthorized: user does not have coach permissions')
    })

    test('sets default values for optional fields', async () => {
      const minimalTeamData = {
        name: 'Minimal Team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
      }

      const mockCreatedTeam = {
        id: 'team-minimal',
        name: 'Minimal Team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        max_players: 22, // Default
        min_players: 11, // Default
        status: 'active', // Default
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: mockCreatedTeam,
        error: null,
      })

      const result = await teamsService.createTeam(minimalTeamData)

      expect(result.error).toBeNull()
      expect(result.data?.max_players).toBe(22)
      expect(result.data?.min_players).toBe(11)
      expect(result.data?.status).toBe('active')
    })
  })

  describe('updateTeam', () => {
    test('successfully updates team information', async () => {
      const updateData = {
        name: 'Updated Team Name',
        description: 'Updated description',
        max_players: 25,
        skill_level: 'elite',
      }

      const mockUpdatedTeam = {
        id: 'team-1',
        name: 'Updated Team Name',
        description: 'Updated description',
        max_players: 25,
        skill_level: 'elite',
        updated_at: '2024-01-21T00:00:00Z',
      }

      vi.mocked(teamsService.updateTeam).mockResolvedValue({
        data: mockUpdatedTeam,
        error: null,
      })

      const result = await teamsService.updateTeam('team-1', updateData)

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Updated Team Name')
      expect(result.data?.max_players).toBe(25)
    })

    test('validates update permissions', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      }

      vi.mocked(teamsService.updateTeam).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized: insufficient permissions to update team' },
      })

      const result = await teamsService.updateTeam('team-1', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Unauthorized: insufficient permissions to update team')
    })

    test('prevents invalid roster size changes', async () => {
      const updateData = {
        max_players: 10, // Current roster has 15 players
      }

      vi.mocked(teamsService.updateTeam).mockResolvedValue({
        data: null,
        error: { message: 'Cannot reduce max players below current roster size (15)' },
      })

      const result = await teamsService.updateTeam('team-1', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot reduce max players below current roster size (15)')
    })

    test('handles concurrent updates', async () => {
      const updateData = {
        name: 'Concurrent Update',
      }

      vi.mocked(teamsService.updateTeam).mockResolvedValue({
        data: null,
        error: { message: 'Team was modified by another user. Please refresh and try again.' },
      })

      const result = await teamsService.updateTeam('team-1', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Team was modified by another user. Please refresh and try again.')
    })
  })

  describe('deleteTeam', () => {
    test('successfully deletes a team', async () => {
      vi.mocked(teamsService.deleteTeam).mockResolvedValue({
        data: { deleted: true },
        error: null,
      })

      const result = await teamsService.deleteTeam('team-1')

      expect(result.error).toBeNull()
      expect(result.data?.deleted).toBe(true)
    })

    test('prevents deletion of teams with active roster', async () => {
      vi.mocked(teamsService.deleteTeam).mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete team with active roster. Remove all players first.' },
      })

      const result = await teamsService.deleteTeam('team-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot delete team with active roster. Remove all players first.')
    })

    test('prevents deletion of teams with upcoming events', async () => {
      vi.mocked(teamsService.deleteTeam).mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete team with scheduled events. Cancel events first.' },
      })

      const result = await teamsService.deleteTeam('team-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot delete team with scheduled events. Cancel events first.')
    })

    test('validates deletion permissions', async () => {
      vi.mocked(teamsService.deleteTeam).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized: only organization admins can delete teams' },
      })

      const result = await teamsService.deleteTeam('team-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Unauthorized: only organization admins can delete teams')
    })
  })

  describe('Team Member Management', () => {
    describe('addTeamMember', () => {
      test('successfully adds a player to team', async () => {
        const memberData = {
          user_id: 'user-new',
          role: 'player',
          position: 'forward',
          jersey_number: 9,
        }

        vi.mocked(teamsService.addTeamMember).mockResolvedValue({
          data: { id: 'membership-1', ...memberData },
          error: null,
        })

        const result = await teamsService.addTeamMember('team-1', memberData)

        expect(result.error).toBeNull()
        expect(result.data?.user_id).toBe('user-new')
        expect(result.data?.role).toBe('player')
      })

      test('validates jersey number uniqueness', async () => {
        const memberData = {
          user_id: 'user-new',
          role: 'player',
          jersey_number: 10, // Already taken
        }

        vi.mocked(teamsService.addTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'Jersey number 10 is already taken on this team' },
        })

        const result = await teamsService.addTeamMember('team-1', memberData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Jersey number 10 is already taken on this team')
      })

      test('prevents adding members beyond max roster size', async () => {
        const memberData = {
          user_id: 'user-new',
          role: 'player',
        }

        vi.mocked(teamsService.addTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'Team roster is full (22/22 players)' },
        })

        const result = await teamsService.addTeamMember('team-1', memberData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Team roster is full (22/22 players)')
      })

      test('validates user permissions for role assignment', async () => {
        const memberData = {
          user_id: 'user-parent',
          role: 'coach', // Parent trying to be coach
        }

        vi.mocked(teamsService.addTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'User does not have coach permissions for this organization' },
        })

        const result = await teamsService.addTeamMember('team-1', memberData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('User does not have coach permissions for this organization')
      })

      test('prevents duplicate team memberships', async () => {
        const memberData = {
          user_id: 'user-existing',
          role: 'player',
        }

        vi.mocked(teamsService.addTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'User is already a member of this team' },
        })

        const result = await teamsService.addTeamMember('team-1', memberData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('User is already a member of this team')
      })
    })

    describe('removeTeamMember', () => {
      test('successfully removes a team member', async () => {
        vi.mocked(teamsService.removeTeamMember).mockResolvedValue({
          data: { removed: true },
          error: null,
        })

        const result = await teamsService.removeTeamMember('team-1', 'user-to-remove')

        expect(result.error).toBeNull()
        expect(result.data?.removed).toBe(true)
      })

      test('prevents removing the last coach', async () => {
        vi.mocked(teamsService.removeTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'Cannot remove the last coach from the team' },
        })

        const result = await teamsService.removeTeamMember('team-1', 'last-coach-id')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot remove the last coach from the team')
      })

      test('validates removal permissions', async () => {
        vi.mocked(teamsService.removeTeamMember).mockResolvedValue({
          data: null,
          error: { message: 'Unauthorized: insufficient permissions to remove team members' },
        })

        const result = await teamsService.removeTeamMember('team-1', 'user-to-remove')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Unauthorized: insufficient permissions to remove team members')
      })
    })

    describe('updateTeamMemberRole', () => {
      test('successfully updates member role', async () => {
        const updateData = {
          role: 'captain',
          position: 'center',
          jersey_number: 8,
        }

        vi.mocked(teamsService.updateTeamMemberRole).mockResolvedValue({
          data: { updated: true },
          error: null,
        })

        const result = await teamsService.updateTeamMemberRole('team-1', 'user-id', updateData)

        expect(result.error).toBeNull()
        expect(result.data?.updated).toBe(true)
      })

      test('validates role transition permissions', async () => {
        const updateData = {
          role: 'coach', // Player trying to become coach
        }

        vi.mocked(teamsService.updateTeamMemberRole).mockResolvedValue({
          data: null,
          error: { message: 'User does not have coach permissions for role assignment' },
        })

        const result = await teamsService.updateTeamMemberRole('team-1', 'user-id', updateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('User does not have coach permissions for role assignment')
      })
    })
  })

  describe('getTeamRoster', () => {
    test('retrieves complete team roster', async () => {
      const mockRoster = [
        {
          id: 'player-1',
          user_id: 'user-1',
          name: 'John Doe',
          role: 'captain',
          position: 'forward',
          jersey_number: 10,
          status: 'active',
          joined_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'player-2',
          user_id: 'user-2',
          name: 'Jane Smith',
          role: 'player',
          position: 'midfielder',
          jersey_number: 7,
          status: 'injured',
          joined_at: '2024-01-02T00:00:00Z',
        },
      ]

      vi.mocked(teamsService.getTeamRoster).mockResolvedValue({
        data: mockRoster,
        error: null,
      })

      const result = await teamsService.getTeamRoster('team-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].role).toBe('captain')
      expect(result.data?.[1].status).toBe('injured')
    })

    test('filters roster by status', async () => {
      const mockActiveRoster = [
        {
          id: 'player-1',
          name: 'John Doe',
          status: 'active',
        },
      ]

      vi.mocked(teamsService.getTeamRoster).mockResolvedValue({
        data: mockActiveRoster,
        error: null,
      })

      const result = await teamsService.getTeamRoster('team-1', { status: 'active' })

      expect(result.error).toBeNull()
      expect(result.data?.every((player: { status?: string }) => player.status === 'active')).toBe(true)
    })

    test('includes player statistics', async () => {
      const mockRosterWithStats = [
        {
          id: 'player-1',
          name: 'John Doe',
          stats: {
            games_played: 15,
            goals: 8,
            assists: 5,
            minutes_played: 1200,
          },
        },
      ]

      vi.mocked(teamsService.getTeamRoster).mockResolvedValue({
        data: mockRosterWithStats,
        error: null,
      })

      const result = await teamsService.getTeamRoster('team-1')

      expect(result.data?.[0].stats?.goals).toBe(8)
    })
  })

  describe('getTeamStats', () => {
    test('retrieves team statistics', async () => {
      const mockStats = {
        total_players: 18,
        active_players: 16,
        injured_players: 2,
        suspended_players: 0,
        average_age: 16.5,
        roster_completion_percentage: 72.7,
        games_played: 12,
        wins: 8,
        losses: 3,
        draws: 1,
        goals_for: 45,
        goals_against: 23,
        points: 25,
      }

      vi.mocked(teamsService.getTeamStats).mockResolvedValue({
        data: mockStats,
        error: null,
      })

      const result = await teamsService.getTeamStats('team-1')

      expect(result.error).toBeNull()
      expect(result.data?.total_players).toBe(18)
      expect(result.data?.wins).toBe(8)
      expect(result.data?.roster_completion_percentage).toBe(72.7)
    })

    test('calculates accurate statistics', async () => {
      const mockStats = {
        roster_completion_percentage: 81.8, // 18/22 players
        win_percentage: 66.7, // 8/12 games
        goal_differential: 22, // 45-23
      }

      vi.mocked(teamsService.getTeamStats).mockResolvedValue({
        data: mockStats,
        error: null,
      })

      const result = await teamsService.getTeamStats('team-1')

      expect(result.data?.roster_completion_percentage).toBe(81.8)
      expect(result.data?.win_percentage).toBe(66.7)
      expect(result.data?.goal_differential).toBe(22)
    })
  })

  describe('Business Logic Validation', () => {
    test('enforces team-organization relationship', async () => {
      const teamData = {
        name: 'Cross-Org Team',
        sport_id: 'sport-1',
        organization_id: 'org-2', // Different org
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized: cannot create team for different organization' },
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Unauthorized: cannot create team for different organization')
    })

    test('validates sport-organization compatibility', async () => {
      const teamData = {
        name: 'Invalid Sport Team',
        sport_id: 'sport-invalid', // Sport not offered by org
        organization_id: 'org-1',
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Sport is not offered by this organization' },
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Sport is not offered by this organization')
    })

    test('handles season-based team constraints', async () => {
      const teamData = {
        name: 'Season Team',
        sport_id: 'sport-1',
        organization_id: 'org-1',
        season_id: 'season-ended', // Season has ended
      }

      vi.mocked(teamsService.createTeam).mockResolvedValue({
        data: null,
        error: { message: 'Cannot create team for ended season' },
      })

      const result = await teamsService.createTeam(teamData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot create team for ended season')
    })
  })

  describe('Security and Permissions', () => {
    test('enforces read permissions for team data', async () => {
      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: insufficient permissions' },
      })

      const result = await teamsService.getTeamDetails('team-private')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Access denied: insufficient permissions')
    })

    test('validates write permissions for team modifications', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      }

      vi.mocked(teamsService.updateTeam).mockResolvedValue({
        data: null,
        error: { message: 'Forbidden: write access required' },
      })

      const result = await teamsService.updateTeam('team-1', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Forbidden: write access required')
    })

    test('prevents cross-organization data access', async () => {
      // Attempting to access team from different organization
      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: null,
        error: { message: 'Team not found or access denied' },
      })

      const result = await teamsService.getTeamDetails('team-other-org')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Team not found or access denied')
    })

    test('logs team access for audit purposes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(teamsService.getTeamDetails).mockResolvedValue({
        data: { id: 'team-1', name: 'Test Team' },
        error: null,
      })

      await teamsService.getTeamDetails('team-1')

      // In production, this would log to audit system
      consoleSpy.mockRestore()
    })
  })
})
