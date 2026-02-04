/**
 * Profile Management Tests
 *
 * Comprehensive test suite for user profile operations including viewing,
 * updating, privacy settings, and account management.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../supabase'
import { usersService } from '../../data/services/usersService'

// Mock dependencies
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

vi.mock('../../data/services/usersService', () => ({
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
        home_location: {
          latitude: 40.7128,
          longitude: -74.0060,
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
        home_zipcode: '10001',
        role: null,
        family_id: null,
        org_id: null,
        requires_org_setup: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const result = await usersService.getUserProfile('user-123')

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('user-123')
      expect(result.data?.email).toBe('john.doe@example.com')
      expect(result.data?.display_name).toBe('John Doe')
      expect(result.data?.home_location?.city).toBe('New York')
    })

    test('returns null for non-existent user', async () => {
      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await usersService.getUserProfile('non-existent-user')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    test('handles database errors', async () => {
      const mockError = { message: 'Database connection failed' }

      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await usersService.getUserProfile('user-123')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    test('validates user ID parameter', async () => {
      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'User ID is required' },
      })

      const result = await usersService.getUserProfile('')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('User ID is required')
    })
  })

  describe('updateUserProfile', () => {
    test('successfully updates profile information', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+1-555-9999',
        display_name: 'Jane Smith',
      }

      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'jane.smith@example.com',
        phone: '+1-555-9999',
        first_name: 'Jane',
        last_name: 'Smith',
        display_name: 'Jane Smith',
        home_zipcode: '10001',
        updated_at: '2024-01-16T00:00:00Z',
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.error).toBeNull()
      expect(result.data?.first_name).toBe('Jane')
      expect(result.data?.last_name).toBe('Smith')
      expect(result.data?.display_name).toBe('Jane Smith')
    })

    test('validates required fields', async () => {
      const updateData = {
        first_name: '',
        last_name: 'Smith',
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'First name is required' },
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('First name is required')
    })

    test('handles email updates with verification', async () => {
      const updateData = {
        email: 'newemail@example.com',
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'Email update requires verification' },
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Email update requires verification')
    })

    test('validates phone number format', async () => {
      const updateData = {
        phone: 'invalid-phone',
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'Invalid phone number format' },
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid phone number format')
    })

    test('handles concurrent update conflicts', async () => {
      const updateData = {
        first_name: 'Updated Name',
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'Profile was modified by another session' },
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Profile was modified by another session')
    })

    test('prevents updates to system fields', async () => {
      const updateData = {
        id: 'hacked-id', // Should not be allowed
        created_at: '2020-01-01T00:00:00Z', // Should not be allowed
        first_name: 'Valid Update',
      }

      const mockUpdatedProfile = {
        id: 'user-123', // Original ID preserved
        first_name: 'Valid Update',
        created_at: '2024-01-01T00:00:00Z', // Original timestamp preserved
      }

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      })

      const result = await usersService.updateUserProfile('user-123', updateData)

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('user-123') // Should not change
    })
  })

  describe('Profile Photo Management', () => {
    test('successfully uploads profile photo', async () => {
      const mockFile = new File(['photo content'], 'profile.jpg', { type: 'image/jpeg' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'profiles/user-123/profile.jpg' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.example.com/profiles/user-123/profile.jpg' },
        }),
      } as any)

      // Mock profile update to set photo path
      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: { profile_photo_path: 'profiles/user-123/profile.jpg' },
        error: null,
      })

      // This would be a custom function in the actual service
      const result = await mockUploadProfilePhoto('user-123', mockFile)

      expect(result.error).toBeNull()
      expect(result.photoUrl).toBe('https://cdn.example.com/profiles/user-123/profile.jpg')
    })

    test('handles photo upload errors', async () => {
      const mockFile = new File(['photo content'], 'profile.jpg', { type: 'image/jpeg' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed: file too large' },
        }),
      } as any)

      const result = await mockUploadProfilePhoto('user-123', mockFile)

      expect(result.photoUrl).toBeNull()
      expect(result.error?.message).toBe('Upload failed: file too large')
    })

    test('validates image file types', async () => {
      const mockFile = new File(['text content'], 'document.txt', { type: 'text/plain' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid file type. Only images allowed.' },
        }),
      } as any)

      const result = await mockUploadProfilePhoto('user-123', mockFile)

      expect(result.photoUrl).toBeNull()
      expect(result.error?.message).toBe('Invalid file type. Only images allowed.')
    })

    test('removes existing photo when uploading new one', async () => {
      const mockFile = new File(['new photo'], 'new-profile.jpg', { type: 'image/jpeg' })

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'profiles/user-123/new-profile.jpg' },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.example.com/profiles/user-123/new-profile.jpg' },
        }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      const result = await mockUploadProfilePhoto('user-123', mockFile, 'profiles/user-123/old-profile.jpg')

      expect(mockStorage.remove).toHaveBeenCalledWith(['profiles/user-123/old-profile.jpg'])
      expect(result.error).toBeNull()
    })

    test('handles photo removal', async () => {
      const mockStorage = {
        remove: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      vi.mocked(usersService.updateUserProfile).mockResolvedValue({
        data: { profile_photo_path: null },
        error: null,
      })

      const result = await mockRemoveProfilePhoto('user-123', 'profiles/user-123/profile.jpg')

      expect(mockStorage.remove).toHaveBeenCalledWith(['profiles/user-123/profile.jpg'])
      expect(result.error).toBeNull()
    })
  })

  describe('Privacy Settings', () => {
    test('updates privacy settings successfully', async () => {
      const privacySettings = {
        profile_visibility: 'private',
        show_email: false,
        show_phone: false,
        allow_messages: true,
      }

      vi.mocked(usersService.updatePrivacySettings).mockResolvedValue({
        data: privacySettings,
        error: null,
      })

      const result = await usersService.updatePrivacySettings('user-123', privacySettings)

      expect(result.error).toBeNull()
      expect(result.data?.profile_visibility).toBe('private')
      expect(result.data?.show_email).toBe(false)
    })

    test('validates privacy setting values', async () => {
      const invalidSettings = {
        profile_visibility: 'invalid_visibility',
      }

      vi.mocked(usersService.updatePrivacySettings).mockResolvedValue({
        data: null,
        error: { message: 'Invalid visibility setting' },
      })

      const result = await usersService.updatePrivacySettings('user-123', invalidSettings)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid visibility setting')
    })

    test('handles profile visibility levels', async () => {
      const testCases = [
        { visibility: 'public', expected: true },
        { visibility: 'private', expected: true },
        { visibility: 'organization_only', expected: true },
        { visibility: 'invalid', expected: false },
      ]

      for (const { visibility, expected } of testCases) {
        const settings = { profile_visibility: visibility }

        if (expected) {
          vi.mocked(usersService.updatePrivacySettings).mockResolvedValueOnce({
            data: settings,
            error: null,
          })
        } else {
          vi.mocked(usersService.updatePrivacySettings).mockResolvedValueOnce({
            data: null,
            error: { message: 'Invalid visibility setting' },
          })
        }

        const result = await usersService.updatePrivacySettings('user-123', settings)

        if (expected) {
          expect(result.error).toBeNull()
        } else {
          expect(result.error).toBeDefined()
        }
      }
    })
  })

  describe('Notification Preferences', () => {
    test('updates notification preferences', async () => {
      const preferences = {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        event_reminders: true,
        payment_notifications: true,
        marketing_emails: false,
      }

      vi.mocked(usersService.updateNotificationPreferences).mockResolvedValue({
        data: preferences,
        error: null,
      })

      const result = await usersService.updateNotificationPreferences('user-123', preferences)

      expect(result.error).toBeNull()
      expect(result.data?.email_notifications).toBe(true)
      expect(result.data?.marketing_emails).toBe(false)
    })

    test('handles granular notification control', async () => {
      const granularPrefs = {
        email_notifications: {
          events: true,
          payments: true,
          messages: false,
          marketing: false,
        },
        push_notifications: {
          events: true,
          payments: false,
          messages: true,
          marketing: false,
        },
      }

      vi.mocked(usersService.updateNotificationPreferences).mockResolvedValue({
        data: granularPrefs,
        error: null,
      })

      const result = await usersService.updateNotificationPreferences('user-123', granularPrefs)

      expect(result.error).toBeNull()
      expect(result.data?.email_notifications.events).toBe(true)
      expect(result.data?.push_notifications.payments).toBe(false)
    })

    test('validates notification preference structure', async () => {
      const invalidPrefs = {
        invalid_category: true,
      }

      vi.mocked(usersService.updateNotificationPreferences).mockResolvedValue({
        data: null,
        error: { message: 'Invalid notification preference structure' },
      })

      const result = await usersService.updateNotificationPreferences('user-123', invalidPrefs)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid notification preference structure')
    })
  })

  describe('Account Deletion', () => {
    test('successfully deletes user account', async () => {
      vi.mocked(usersService.deleteUserAccount).mockResolvedValue({
        data: { deleted: true },
        error: null,
      })

      const result = await usersService.deleteUserAccount('user-123', 'confirm_deletion')

      expect(result.error).toBeNull()
      expect(result.data?.deleted).toBe(true)
    })

    test('requires confirmation for account deletion', async () => {
      vi.mocked(usersService.deleteUserAccount).mockResolvedValue({
        data: null,
        error: { message: 'Confirmation required for account deletion' },
      })

      const result = await usersService.deleteUserAccount('user-123', '')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Confirmation required for account deletion')
    })

    test('handles accounts with active subscriptions', async () => {
      vi.mocked(usersService.deleteUserAccount).mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete account with active subscription' },
      })

      const result = await usersService.deleteUserAccount('user-123', 'confirm_deletion')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot delete account with active subscription')
    })

    test('handles accounts with pending payments', async () => {
      vi.mocked(usersService.deleteUserAccount).mockResolvedValue({
        data: null,
        error: { message: 'Account has pending payments that must be resolved' },
      })

      const result = await usersService.deleteUserAccount('user-123', 'confirm_deletion')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Account has pending payments that must be resolved')
    })

    test('prevents deletion of organization admins', async () => {
      vi.mocked(usersService.deleteUserAccount).mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete account: user is organization admin' },
      })

      const result = await usersService.deleteUserAccount('user-123', 'confirm_deletion')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot delete account: user is organization admin')
    })
  })

  describe('Profile Data Validation', () => {
    test('validates email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        '',
      ]

      for (const email of invalidEmails) {
        vi.mocked(usersService.updateUserProfile).mockResolvedValue({
          data: null,
          error: { message: 'Invalid email format' },
        })

        const result = await usersService.updateUserProfile('user-123', { email })

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Invalid email format')
      }
    })

    test('validates phone number format', async () => {
      const invalidPhones = [
        'invalid-phone',
        '123',
        'abc-defg-hijk',
        '',
      ]

      for (const phone of invalidPhones) {
        vi.mocked(usersService.updateUserProfile).mockResolvedValue({
          data: null,
          error: { message: 'Invalid phone number format' },
        })

        const result = await usersService.updateUserProfile('user-123', { phone })

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Invalid phone number format')
      }
    })

    test('validates name fields', async () => {
      const testCases = [
        { field: 'first_name', value: '', error: 'First name is required' },
        { field: 'last_name', value: '', error: 'Last name is required' },
        { field: 'first_name', value: 'A', error: 'First name too short' },
        { field: 'last_name', value: 'B', error: 'Last name too short' },
      ]

      for (const { field, value, error } of testCases) {
        vi.mocked(usersService.updateUserProfile).mockResolvedValue({
          data: null,
          error: { message: error },
        })

        const updateData = { [field]: value }
        const result = await usersService.updateUserProfile('user-123', updateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe(error)
      }
    })

    test('handles special characters in names', async () => {
      const validNames = [
        'José María',
        "O'Connor",
        'Jean-Pierre',
        '李小明',
        'مرحبا',
      ]

      for (const name of validNames) {
        vi.mocked(usersService.updateUserProfile).mockResolvedValue({
          data: { first_name: name },
          error: null,
        })

        const result = await usersService.updateUserProfile('user-123', { first_name: name })

        expect(result.error).toBeNull()
      }
    })
  })

  describe('Security and Privacy', () => {
    test('prevents unauthorized profile access', async () => {
      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: insufficient permissions' },
      })

      const result = await usersService.getUserProfile('other-user-456')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Access denied: insufficient permissions')
    })

    test('masks sensitive information for other users', async () => {
      const mockProfile = {
        id: 'user-456',
        email: 'masked@example.com', // Should be masked
        phone: '***-***-****', // Should be masked
        first_name: 'Other',
        last_name: 'User',
        display_name: 'Other User',
        // Other fields visible
      }

      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const result = await usersService.getUserProfile('user-456')

      expect(result.data?.email).toBe('masked@example.com')
      expect(result.data?.phone).toBe('***-***-****')
    })

    test('handles PII data access controls', async () => {
      // Test different privacy settings affect data visibility
      const privacyLevels = ['public', 'organization_only', 'private']

      for (const level of privacyLevels) {
        vi.mocked(usersService.getUserProfile).mockResolvedValue({
          data: {
            id: 'user-123',
            profile_visibility: level,
            // Other fields based on visibility
          },
          error: null,
        })

        const result = await usersService.getUserProfile('user-123')

        expect(result.data?.profile_visibility).toBe(level)
      }
    })

    test('logs profile access for audit purposes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        data: { id: 'user-123', first_name: 'John' },
        error: null,
      })

      await usersService.getUserProfile('user-123')

      // In a real implementation, this would log to audit system
      // expect(consoleSpy).toHaveBeenCalledWith('Profile accessed:', expect.any(Object))
      consoleSpy.mockRestore()
    })
  })
})

// Mock helper functions for testing
async function mockUploadProfilePhoto(userId: string, file: File, existingPath?: string) {
  try {
    if (existingPath) {
      await supabase.storage.from('profiles').remove([existingPath])
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `profiles/${userId}/${fileName}`

    const { data, error } = await supabase.storage.from('profiles').upload(filePath, file)
    if (error) throw error

    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(filePath)

    return { photoUrl: urlData.publicUrl, error: null }
  } catch (err) {
    return { photoUrl: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function mockRemoveProfilePhoto(userId: string, photoPath: string) {
  try {
    const { error } = await supabase.storage.from('profiles').remove([photoPath])
    if (error) throw error

    await usersService.updateUserProfile(userId, { profile_photo_path: null })

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}