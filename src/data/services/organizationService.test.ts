/**
 * Organization Management Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getOrganizationDetails } from '@/data/services/organizationService'

const mockOrgData = {
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  org_type: 'club',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockOrgData, error: null })

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle, single: vi.fn() })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        })),
      })),
    })),
    rpc: vi.fn(),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })) })) },
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', () => ({ USE_FAKE_DATA: false }))

vi.mock('@/data/fake/organizationFakeService', () => ({}))

describe('Organization Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaybeSingle.mockResolvedValue({ data: mockOrgData, error: null })
  })

  describe('getOrganizationDetails', () => {
    test('successfully retrieves organization details', async () => {
      const result = await getOrganizationDetails('org-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })
  })
})
