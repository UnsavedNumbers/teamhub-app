/**
 * Authentication Flow Tests
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { geocodeZipToHomeLocation } from '@/utils/homeLocation'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(), single: vi.fn() })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn() })),
      })),
    })),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/utils/homeLocation', () => ({ geocodeZipToHomeLocation: vi.fn() }))

vi.mock('@/utils/host', () => ({ getBaseUrl: vi.fn(() => 'http://localhost:3000') }))

vi.mock('@/contexts/OrganizationContext', () => ({
  OrganizationContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    Consumer: ({ children }: { children: () => React.ReactNode }) => children(() => ({})),
  },
  useOrganization: () => ({
    setOrganizations: vi.fn(),
    currentOrganization: null,
  }),
}))

import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'

const TestWrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never)
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

      let signInResult: { error: { message?: string } | null } | undefined
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
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })

      let signInResult: { error: { message?: string } | null } | undefined
      await act(async () => {
        signInResult = await result.current.signInWithEmail('wrong@example.com', 'wrongpass')
      })

      expect(signInResult?.error?.message).toBe('Invalid login credentials')
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
    })
  })
})
