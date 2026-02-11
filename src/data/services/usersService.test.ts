/**
 * Profile Management Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { usersService } from '@/data/services/usersService'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
          order: vi.fn(() => ({ limit: vi.fn() })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn() })),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn() })) },
    auth: { updateUser: vi.fn() },
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/services/usersService', () => ({
  usersService: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    deleteUserAccount: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    updatePrivacySettings: vi.fn(),
  },
}))

describe('Profile Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserProfile', () => {
    test('successfully retrieves user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        home_zipcode: '10001',
      }

      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const result = await usersService.getUserProfile('user-123')

      expect(result.error).toBeNull()
      expect(result.data?.email).toBe('john.doe@example.com')
    })
  })
})
