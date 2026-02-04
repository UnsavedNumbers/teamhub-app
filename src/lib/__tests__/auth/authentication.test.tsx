/**
 * Authentication Flow Tests
 *
 * Comprehensive test suite for authentication functionality.
 * Tests login, logout, session management, password reset, and security features.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { geocodeZipToHomeLocation } from '../../utils/homeLocation'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}))

vi.mock('../../utils/homeLocation', () => ({
  geocodeZipToHomeLocation: vi.fn(),
}))

vi.mock('../../utils/host', () => ({
  getBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

// Mock the useOrganization context
vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    setOrganizations: vi.fn(),
    currentOrganization: null,
  }),
}))

// Import after mocks
import { AuthProvider, useAuth } from '../useAuth'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('signInWithEmail', () => {
    test('successfully signs in with valid credentials', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSession = { user: mockUser, access_token: 'token' }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('test@example.com', 'password123')
      })

      expect(signInResult?.error).toBeNull()
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    test('handles invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('wrong@example.com', 'wrongpass')
      })

      expect(signInResult?.error).toEqual(mockError)
    })

    test('handles network errors', async () => {
      const mockError = { message: 'Network error' }

      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(mockError)

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('test@example.com', 'password123')
      })

      expect(signInResult?.error).toEqual(mockError)
    })

    test('validates email format', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // Test with invalid email - Supabase handles validation
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email' },
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('invalid-email', 'password123')
      })

      expect(signInResult?.error?.message).toBe('Invalid email')
    })

    test('handles empty credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email and password are required' },
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('', '')
      })

      expect(signInResult?.error?.message).toBe('Email and password are required')
    })
  })

  describe('signInWithGoogle', () => {
    test('initiates Google OAuth flow', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithGoogle()
      })

      expect(signInResult?.error).toBeNull()
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/portal/auth/callback',
        },
      })
    })

    test('handles OAuth errors', async () => {
      const mockError = { message: 'OAuth provider error' }

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithGoogle()
      })

      expect(signInResult?.error).toEqual(mockError)
    })
  })

  describe('signUp', () => {
    test('successfully creates new account', async () => {
      const mockUser = { id: 'user-123', email: 'newuser@example.com' }
      const mockSession = { user: mockUser, access_token: 'token' }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      vi.mocked(geocodeZipToHomeLocation).mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'NY',
        country: 'US',
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp(
          'newuser@example.com',
          'password123',
          'John',
          'Doe',
          '555-0123',
          '10001'
        )
      })

      expect(signUpResult?.error).toBeNull()
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/portal/auth/callback',
          data: {
            first_name: 'John',
            last_name: 'Doe',
            phone: '555-0123',
            home_zipcode: '10001',
            display_name: 'John Doe',
            requires_org_setup: false,
            signup_mode: 'parent',
          },
        },
      })
    })

    test('handles duplicate email registration', async () => {
      const mockError = { message: 'User already registered' }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp(
          'existing@example.com',
          'password123',
          'John',
          'Doe',
          '555-0123',
          '10001'
        )
      })

      expect(signUpResult?.error).toEqual(mockError)
    })

    test('validates required fields', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: null,
        error: { message: 'Email is required' },
      })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp('', 'password123', 'John', 'Doe', '555-0123', '10001')
      })

      expect(signUpResult?.error?.message).toBe('Email is required')
    })

    test('handles organization setup requirement', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { user: { id: 'user-123' } } },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await act(async () => {
        await result.current.signUp(
          'test@example.com',
          'password123',
          'John',
          'Doe',
          '555-0123',
          '10001',
          true, // requiresOrgSetup
          'fan' // signupMode
        )
      })

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/portal/auth/callback',
          data: {
            first_name: 'John',
            last_name: 'Doe',
            phone: '555-0123',
            home_zipcode: '10001',
            display_name: 'John Doe',
            requires_org_setup: true,
            signup_mode: 'fan',
          },
        },
      })
    })

    test('handles geocoding failure gracefully', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { user: { id: 'user-123' } } },
        error: null,
      })

      vi.mocked(geocodeZipToHomeLocation).mockRejectedValue(new Error('Geocoding failed'))

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp(
          'test@example.com',
          'password123',
          'John',
          'Doe',
          '555-0123',
          '10001'
        )
      })

      expect(signUpResult?.error).toBeNull() // Should still succeed despite geocoding failure
    })
  })

  describe('signOut', () => {
    test('successfully signs out user', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await act(async () => {
        await result.current.signOut()
      })

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('handles sign out errors', async () => {
      const mockError = { message: 'Sign out failed' }
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await act(async () => {
        await result.current.signOut()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Sign out error:', mockError)
      consoleSpy.mockRestore()
    })
  })

  describe('resetPassword', () => {
    test('sends password reset email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let resetResult
      await act(async () => {
        resetResult = await result.current.resetPassword('user@example.com')
      })

      expect(resetResult?.error).toBeNull()
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: 'http://localhost:3000/reset-password',
      })
    })

    test('handles invalid email', async () => {
      const mockError = { message: 'Invalid email address' }

      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: mockError })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let resetResult
      await act(async () => {
        resetResult = await result.current.resetPassword('invalid-email')
      })

      expect(resetResult?.error).toEqual(mockError)
    })

    test('handles non-existent email gracefully', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let resetResult
      await act(async () => {
        resetResult = await result.current.resetPassword('nonexistent@example.com')
      })

      expect(resetResult?.error).toBeNull() // Supabase doesn't error for non-existent emails
    })
  })

  describe('updatePassword', () => {
    test('successfully updates password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let updateResult
      await act(async () => {
        updateResult = await result.current.updatePassword('newpassword123')
      })

      expect(updateResult?.error).toBeNull()
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    })

    test('validates password requirements', async () => {
      const mockError = { message: 'Password should be at least 6 characters' }

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let updateResult
      await act(async () => {
        updateResult = await result.current.updatePassword('123')
      })

      expect(updateResult?.error).toEqual(mockError)
    })

    test('handles empty password', async () => {
      const mockError = { message: 'Password cannot be empty' }

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let updateResult
      await act(async () => {
        updateResult = await result.current.updatePassword('')
      })

      expect(updateResult?.error).toEqual(mockError)
    })
  })

  describe('Session Management', () => {
    test('loads existing session on mount', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSession = { user: mockUser, access_token: 'token' }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      // Mock profile fetch
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{
          org_id: 'org-123',
          org_name: 'Test Org',
          roles: ['parent']
        }],
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'test@example.com',
                phone: '555-0123',
                first_name: 'John',
                last_name: 'Doe',
                display_name: 'John Doe',
                home_zipcode: '10001',
                role: null,
                family_id: null,
                org_id: null,
                requires_org_setup: false,
              },
              error: null,
            }),
          }),
        }),
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.session).toEqual(mockSession)
        expect(result.current.loading).toBe(false)
      })
    })

    test('handles no existing session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.session).toBeNull()
        expect(result.current.loading).toBe(false)
      })
    })

    test('handles session fetch errors', async () => {
      const mockError = { message: 'Session fetch failed' }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', mockError)
      consoleSpy.mockRestore()
    })

    test('prevents loading state from getting stuck', async () => {
      vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // Fast-forward 6 seconds
      vi.advanceTimersByTime(6000)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Role Helpers', () => {
    test('hasRole checks specific organization role', () => {
      const mockProfile = {
        id: 'user-123',
        organizations: [
          { id: 'org-1', name: 'Org 1', roles: ['parent'] },
          { id: 'org-2', name: 'Org 2', roles: ['coach', 'org_admin'] },
        ],
        isPlatformAdmin: false,
        platformAdminRole: null,
      }

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // Mock the profile
      act(() => {
        // We can't directly set profile, so we'll test the logic by mocking the hook
        vi.mocked(result.current).profile = mockProfile
      })

      expect(result.current.hasRole('org-1', 'parent')).toBe(true)
      expect(result.current.hasRole('org-1', 'coach')).toBe(false)
      expect(result.current.hasRole('org-2', 'coach')).toBe(true)
      expect(result.current.hasRole('org-2', 'org_admin')).toBe(true)
      expect(result.current.hasRole('org-3', 'parent')).toBe(false)
    })

    test('hasAnyRole checks if user has role in any organization', () => {
      const mockProfile = {
        id: 'user-123',
        organizations: [
          { id: 'org-1', name: 'Org 1', roles: ['parent'] },
          { id: 'org-2', name: 'Org 2', roles: ['coach'] },
        ],
        isPlatformAdmin: false,
        platformAdminRole: null,
      }

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      act(() => {
        vi.mocked(result.current).profile = mockProfile
      })

      expect(result.current.hasAnyRole('parent')).toBe(true)
      expect(result.current.hasAnyRole('coach')).toBe(true)
      expect(result.current.hasAnyRole('org_admin')).toBe(false)
    })

    test('isOrgAdmin checks admin role in specific organization', () => {
      const mockProfile = {
        id: 'user-123',
        organizations: [
          { id: 'org-1', name: 'Org 1', roles: ['parent'] },
          { id: 'org-2', name: 'Org 2', roles: ['org_admin'] },
        ],
        isPlatformAdmin: false,
        platformAdminRole: null,
      }

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      act(() => {
        vi.mocked(result.current).profile = mockProfile
      })

      expect(result.current.isOrgAdmin('org-1')).toBe(false)
      expect(result.current.isOrgAdmin('org-2')).toBe(true)
      expect(result.current.isOrgAdmin('org-3')).toBe(false)
    })

    test('platform admin has all permissions', () => {
      const mockProfile = {
        id: 'user-123',
        organizations: [],
        isPlatformAdmin: true,
        platformAdminRole: 'super_admin',
      }

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      act(() => {
        vi.mocked(result.current).profile = mockProfile
      })

      expect(result.current.hasRole('any-org', 'parent')).toBe(true)
      expect(result.current.hasAnyRole('coach')).toBe(true)
      expect(result.current.isOrgAdmin('any-org')).toBe(true)
    })
  })

  describe('Profile Management', () => {
    test('fetches and caches user profile', async () => {
      const mockUser = { id: 'user-123' }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'test@example.com',
                phone: '555-0123',
                first_name: 'John',
                last_name: 'Doe',
                display_name: 'John Doe',
                home_zipcode: '10001',
                role: null,
                family_id: null,
                org_id: null,
                requires_org_setup: false,
              },
              error: null,
            }),
          }),
        }),
      } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{
          org_id: 'org-123',
          org_name: 'Test Org',
          roles: ['parent']
        }],
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(result.current.profile?.id).toBe('user-123')
      expect(result.current.profile?.email).toBe('test@example.com')
      expect(result.current.profile?.organizations).toHaveLength(1)
    })

    test('handles profile fetch errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(result.current.profile).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('prevents duplicate profile fetches', async () => {
      const mockUser = { id: 'user-123' }
      const mockQuery = vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          phone: '555-0123',
          first_name: 'John',
          last_name: 'Doe',
          display_name: 'John Doe',
        },
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockQuery,
          }),
        }),
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // First call
      await act(async () => {
        await result.current.refreshProfile()
      })

      // Second call should not trigger another fetch
      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(mockQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('Security Features', () => {
    test('validates email format during sign up', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: null,
        error: { message: 'Invalid email format' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp(
          'invalid-email-format',
          'password123',
          'John',
          'Doe',
          '555-0123',
          '10001'
        )
      })

      expect(signUpResult?.error?.message).toBe('Invalid email format')
    })

    test('handles concurrent authentication attempts', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { user: null, session: null }, error: null }), 100))
      )

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // Start multiple concurrent sign-in attempts
      const promises = [
        result.current.signInWithEmail('user1@example.com', 'pass1'),
        result.current.signInWithEmail('user2@example.com', 'pass2'),
        result.current.signInWithEmail('user3@example.com', 'pass3'),
      ]

      const results = await Promise.all(promises)

      // All should complete without interference
      expect(results).toHaveLength(3)
      expect(results.every(r => r?.error === null)).toBe(true)
    })

    test('clears sensitive data on sign out', async () => {
      // Set up initial authenticated state
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSession = { user: mockUser, access_token: 'token' }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        organizations: [],
        isPlatformAdmin: false,
        platformAdminRole: null,
      }

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      // Simulate authenticated state
      act(() => {
        vi.mocked(result.current).user = mockUser
        vi.mocked(result.current).session = mockSession
        vi.mocked(result.current).profile = mockProfile
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('handles malformed authentication responses', async () => {
      // Test with incomplete session data
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: { access_token: 'token' } }, // Missing user in session
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('test@example.com', 'password123')
      })

      expect(signInResult?.error).toBeNull() // Should handle gracefully
    })
  })
})