import type { Database } from '@/lib/database.types'
import type { User } from '@supabase/supabase-js'
import type { Organization } from '@/contexts/OrganizationContext'

type UsersRow = Database['public']['Tables']['users']['Row']

const defaultUser: UsersRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  created_at: '2026-01-01T00:00:00Z',
  display_name: 'Test User',
  email: 'test@example.com',
  family_id: null,
  first_name: 'Test',
  home_location: null,
  home_zipcode: '12345',
  is_active: true,
  last_name: 'User',
  org_id: null,
  permissions: null,
  phone: '5551234567',
  preferences: null,
  preferred_timezone: 'America/New_York',
  profile_completed_at: null,
  profile_completion_prompted_at: null,
  requires_org_setup: false,
  role: 'parent',
  updated_at: '2026-01-01T00:00:00Z',
}

export function createMockUser(overrides?: Partial<UsersRow>): UsersRow {
  return { ...defaultUser, ...overrides }
}

export function createMockProfile(overrides?: Partial<{
  id: string
  email: string | null
  phone: string
  first_name: string
  last_name: string
  display_name: string | null
  organizations: Organization[]
  isPlatformAdmin: boolean
  platformAdminRole: string | null
  requiresOrgSetup: boolean
}>): {
  id: string
  email: string | null
  phone: string
  first_name: string
  last_name: string
  display_name: string | null
  organizations: Organization[]
  isPlatformAdmin: boolean
  platformAdminRole: string | null
  requiresOrgSetup: boolean
} {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    phone: '5551234567',
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    organizations: [],
    isPlatformAdmin: false,
    platformAdminRole: null,
    requiresOrgSetup: false,
    ...overrides,
  }
}

export function createMockSession(overrides?: Partial<{ user: User; access_token: string }>): { user: User; access_token: string } {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  } as User
  return { user, access_token: 'mock-token', ...overrides }
}
