/**
 * Organization Management Tests
 *
 * Comprehensive test suite for organization CRUD operations, member management,
 * settings, and business logic validation.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../supabase'
import {
  getOrganizationDetails,
  getOrganizationBySlug,
  updateOrganizationDetails,
  updateOrganizationSlug,
  uploadOrganizationLogo,
  uploadTicketBanner,
  type OrganizationUpdateDTO,
} from '../../data/services/organizationService'

// Mock dependencies
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          single: vi.fn(),
        })),
        rpc: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        }),
      })),
      rpc: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}))

vi.mock('../../data/config', () => ({
  USE_FAKE_DATA: false,
}))

vi.mock('../../data/fake/organizationFakeService', () => ({
  getOrganizationDetails: vi.fn(),
  updateOrganizationDetails: vi.fn(),
  uploadOrganizationLogo: vi.fn(),
  getOrganizationBySlug: vi.fn(),
  updateOrganizationSlug: vi.fn(),
}))

describe('Organization Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrganizationDetails', () => {
    test('successfully retrieves organization details', async () => {
      const mockOrgData = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        org_type: 'sports_club',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        website: 'https://testorg.com',
        phone: '555-0123',
        email: 'info@testorg.com',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        license_status: 'active',
        license_plan: 'premium',
        license_trial_ends_at: '2024-12-31T00:00:00Z',
        license_current_period_end: '2024-12-31T00:00:00Z',
        stripe_customer_id: 'cus_123',
        payout_account_id: 'acct_123',
      }

      const mockSupabaseResponse = {
        data: mockOrgData,
        error: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any)

      const result = await getOrganizationDetails('org-123')

      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        orgType: 'sports_club',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        licenseStatus: null,
        licensePlan: null,
        licenseTrialEndsAt: null,
        licenseCurrentPeriodEnd: null,
        payoutAccountId: null,
        payoutsEnabled: false,
        stripeConnected: false,
        teamCount: 0,
        sportCount: 0,
        userCount: 0,
        website: 'https://testorg.com',
        phone: '555-0123',
        email: 'info@testorg.com',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
      })
    })

    test('returns null for non-existent organization', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any)

      const result = await getOrganizationDetails('non-existent-org')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    test('handles database errors', async () => {
      const mockError = { message: 'Database connection failed' }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as any)

      const result = await getOrganizationDetails('org-123')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(new Error('Database connection failed'))
    })

    test('validates organization ID parameter', async () => {
      const result = await getOrganizationDetails('')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization ID is required')
    })

    test('handles network timeouts', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(
              () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ),
          }),
        }),
      } as any)

      const resultPromise = getOrganizationDetails('org-123')

      // Should reject with timeout error
      await expect(resultPromise).rejects.toThrow('Timeout')
    })
  })

  describe('getOrganizationBySlug', () => {
    test('successfully retrieves organization by slug', async () => {
      const mockOrgData = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org-slug',
        org_type: 'school',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        website: 'https://testorg.com',
        phone: '555-0123',
        email: 'contact@testorg.com',
        address: '456 Oak St',
        city: 'Another City',
        state: 'AC',
        zip: '67890',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockOrgData,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await getOrganizationBySlug('test-org-slug')

      expect(result.error).toBeNull()
      expect(result.data?.slug).toBe('test-org-slug')
      expect(result.data?.name).toBe('Test Organization')
    })

    test('returns null for non-existent slug', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await getOrganizationBySlug('non-existent-slug')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    test('validates slug parameter', async () => {
      const result = await getOrganizationBySlug('')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Slug is required')
    })

    test('handles special characters in slugs', async () => {
      const mockOrgData = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org-123',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockOrgData,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await getOrganizationBySlug('test-org-123')

      expect(result.error).toBeNull()
      expect(result.data?.slug).toBe('test-org-123')
    })
  })

  describe('updateOrganizationDetails', () => {
    test('successfully updates organization details', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: 'Updated Organization Name',
        website: 'https://updated.com',
        phone: '555-9999',
        email: 'updated@testorg.com',
      }

      const mockUpdatedData = {
        id: 'org-123',
        name: 'Updated Organization Name',
        slug: 'test-org',
        org_type: 'sports_club',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        website: 'https://updated.com',
        phone: '555-9999',
        email: 'updated@testorg.com',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
      }

      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedData,
                error: null,
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Updated Organization Name')
      expect(result.data?.website).toBe('https://updated.com')
      expect(result.data?.phone).toBe('555-9999')
      expect(result.data?.email).toBe('updated@testorg.com')
    })

    test('validates organization name is not empty', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: '',
      }

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization name is required')
    })

    test('validates organization ID parameter', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: 'Valid Name',
      }

      const result = await updateOrganizationDetails('', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization ID is required')
    })

    test('handles partial updates', async () => {
      const updateData: OrganizationUpdateDTO = {
        website: 'https://newwebsite.com',
        // Only updating website, leaving other fields unchanged
      }

      const mockUpdatedData = {
        id: 'org-123',
        name: 'Original Name',
        slug: 'test-org',
        website: 'https://newwebsite.com',
        phone: '555-0123',
        email: 'info@testorg.com',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedData,
                error: null,
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.error).toBeNull()
      expect(result.data?.website).toBe('https://newwebsite.com')
      expect(result.data?.name).toBe('Original Name') // Unchanged
    })

    test('handles database update errors', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: 'Updated Name',
      }

      const mockError = { message: 'Update failed: permission denied' }

      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(new Error('Update failed: permission denied'))
    })

    test('handles organization not found after update', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: 'Updated Name',
      }

      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization not found after update')
    })
  })

  describe('updateOrganizationSlug', () => {
    test('successfully updates organization slug', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await updateOrganizationSlug('org-123', 'new-slug-2024')

      expect(result.error).toBeNull()
    })

    test('handles slug update conflicts', async () => {
      const mockError = { message: 'Slug already exists' }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await updateOrganizationSlug('org-123', 'existing-slug')

      expect(result.error).toEqual(new Error('Slug already exists'))
    })

    test('validates slug format', async () => {
      // Test with invalid characters
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Invalid slug format' },
      })

      const result = await updateOrganizationSlug('org-123', 'invalid slug!')

      expect(result.error?.message).toBe('Invalid slug format')
    })

    test('handles empty slug', async () => {
      const result = await updateOrganizationSlug('org-123', '')

      // Should still attempt the RPC call, let database handle validation
      expect(vi.mocked(supabase.rpc)).toHaveBeenCalled()
    })
  })

  describe('uploadOrganizationLogo', () => {
    test('successfully uploads organization logo', async () => {
      const mockFile = new File(['logo content'], 'logo.png', { type: 'image/png' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'logos/org-123/logo.png' },
          error: null,
        }),
      } as any)

      const result = await uploadOrganizationLogo('org-123', mockFile)

      expect(result.error).toBeNull()
      expect(result.path).toBe('logos/org-123/logo.png')
    })

    test('handles upload errors', async () => {
      const mockFile = new File(['logo content'], 'logo.png', { type: 'image/png' })
      const mockError = { message: 'Upload failed: insufficient permissions' }

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      } as any)

      const result = await uploadOrganizationLogo('org-123', mockFile)

      expect(result.path).toBeNull()
      expect(result.error).toEqual(new Error('Upload failed: insufficient permissions'))
    })

    test('validates organization ID', async () => {
      const mockFile = new File(['logo content'], 'logo.png', { type: 'image/png' })

      const result = await uploadOrganizationLogo('', mockFile)

      expect(result.path).toBeNull()
      expect(result.error?.message).toBe('Organization ID is required')
    })

    test('handles file type validation', async () => {
      const mockFile = new File(['text content'], 'document.txt', { type: 'text/plain' })

      // Supabase storage will handle the actual validation, but we can test the error handling
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid file type' },
        }),
      } as any)

      const result = await uploadOrganizationLogo('org-123', mockFile)

      expect(result.path).toBeNull()
      expect(result.error?.message).toBe('Invalid file type')
    })

    test('handles large file uploads', async () => {
      // Create a large file (over typical limits)
      const largeContent = 'x'.repeat(10 * 1024 * 1024) // 10MB
      const mockFile = new File([largeContent], 'large-logo.png', { type: 'image/png' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'File too large' },
        }),
      } as any)

      const result = await uploadOrganizationLogo('org-123', mockFile)

      expect(result.path).toBeNull()
      expect(result.error?.message).toBe('File too large')
    })
  })

  describe('uploadTicketBanner', () => {
    test('successfully uploads ticket banner', async () => {
      const mockFile = new File(['banner content'], 'banner.jpg', { type: 'image/jpeg' })

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'ticket-banners/org-123/event-456/banner.jpg' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.example.com/ticket-banners/org-123/event-456/banner.jpg' },
        }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      const result = await uploadTicketBanner('org-123', 'event-456', mockFile)

      expect(result.error).toBeNull()
      expect(result.path).toBe('https://cdn.example.com/ticket-banners/org-123/event-456/banner.jpg')
    })

    test('validates required parameters', async () => {
      const mockFile = new File(['content'], 'banner.jpg', { type: 'image/jpeg' })

      let result = await uploadTicketBanner('', 'event-456', mockFile)
      expect(result.error?.message).toBe('Organization ID is required')

      result = await uploadTicketBanner('org-123', '', mockFile)
      expect(result.error?.message).toBe('Event ID is required')
    })

    test('handles storage quota exceeded', async () => {
      const mockFile = new File(['banner content'], 'banner.jpg', { type: 'image/jpeg' })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        }),
      } as any)

      const result = await uploadTicketBanner('org-123', 'event-456', mockFile)

      expect(result.path).toBeNull()
      expect(result.error?.message).toBe('Storage quota exceeded')
    })
  })

  describe('Business Logic Validation', () => {
    test('enforces organization name uniqueness', async () => {
      // This would typically be handled by database constraints
      // but we can test the error handling
      const updateData: OrganizationUpdateDTO = {
        name: 'Existing Organization Name',
      }

      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'duplicate key value violates unique constraint' },
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('duplicate key value violates unique constraint')
    })

    test('validates URL formats', async () => {
      const updateData: OrganizationUpdateDTO = {
        website: 'invalid-url',
      }

      // Database constraints would handle this, but we can test error propagation
      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Invalid URL format' },
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid URL format')
    })

    test('handles concurrent updates', async () => {
      const updateData: OrganizationUpdateDTO = {
        name: 'Updated Name',
      }

      // Simulate concurrent update conflict
      const mockSupabaseChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Organization was modified by another user' },
              }),
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      const result = await updateOrganizationDetails('org-123', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Organization was modified by another user')
    })
  })

  describe('Error Handling and Resilience', () => {
    test('handles network connectivity issues', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await getOrganizationDetails('org-123')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Network error')
    })

    test('handles malformed database responses', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: 'invalid data format',
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await getOrganizationDetails('org-123')

      // Should handle gracefully without crashing
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    test('handles storage service unavailability', async () => {
      const mockFile = new File(['content'], 'logo.png', { type: 'image/png' })

      vi.mocked(supabase.storage.from).mockImplementation(() => {
        throw new Error('Storage service unavailable')
      })

      const result = await uploadOrganizationLogo('org-123', mockFile)

      expect(result.path).toBeNull()
      expect(result.error?.message).toBe('Storage service unavailable')
    })

    test('logs errors appropriately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as any)

      await getOrganizationDetails('org-123')

      expect(consoleSpy).toHaveBeenCalledWith('[organizationService] Error fetching organization:', expect.any(Object))
      consoleSpy.mockRestore()
    })
  })
})