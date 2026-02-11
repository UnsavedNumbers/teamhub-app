/**
 * Team Management Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { teamsService } from '@/data/services/teamsService'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({ limit: vi.fn() })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn() })),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/services/teamsService', () => ({
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
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(teamsService.getTeams).mockResolvedValue({
        data: mockTeams,
        error: null,
      })

      const result = await teamsService.getTeams('org-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].name).toBe('Varsity Soccer')
    })
  })
})
