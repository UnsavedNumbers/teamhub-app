import type { SportCode } from './sports'

export type DemoOrganizationStatus = 'pending' | 'active' | 'inactive' | 'rejected'
export type DemoOrgSize = 'small' | 'medium' | 'large'
export type DemoCodeStatus = 'active' | 'revoked' | 'expired'
export type DemoAllowedRole = 'org_admin' | 'coach' | 'parent' | 'staff' | 'athlete'

export interface DemoOrganization {
  id: string
  name: string
  city: string | null
  state: string | null
  country: string
  timezone: string
  org_type: string | null
  sports_sponsored: SportCode[]
  org_size: DemoOrgSize | null
  payment_enabled: boolean
  ticketing_enabled: boolean
  notes: string | null
  status: DemoOrganizationStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DemoOrgPOC {
  id: string
  demo_org_id: string
  first_name: string
  last_name: string
  title: string | null
  email: string
  phone: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface DemoCode {
  id: string
  demo_code: string
  demo_org_id: string
  poc_id: string | null
  allowed_roles: DemoAllowedRole[]
  expires_at: string
  status: DemoCodeStatus
  created_by: string | null
  created_at: string
  updated_at: string
  revoked_at: string | null
}

export interface DemoSession {
  id: string
  demo_code: string
  user_id: string
  demo_org_id: string
  started_at: string
  last_activity_at: string
  expires_at: string
}

export interface CreateDemoOrgInput {
  name: string
  city?: string | null
  state?: string | null
  country?: string
  timezone: string
  org_type?: string | null
  sports_sponsored: SportCode[]
  org_size?: DemoOrgSize | null
  payment_enabled?: boolean
  ticketing_enabled?: boolean
  notes?: string | null
  status?: DemoOrganizationStatus
}

export interface UpdateDemoOrgInput extends Partial<CreateDemoOrgInput> {}

export interface CreateDemoPOCInput {
  first_name: string
  last_name: string
  title?: string | null
  email: string
  phone?: string | null
  notes?: string | null
  is_primary?: boolean
}

export interface UpdateDemoPOCInput extends Partial<CreateDemoPOCInput> {}

export interface CreateDemoCodeInput {
  demo_org_id: string
  poc_id?: string | null
  allowed_roles?: DemoAllowedRole[]
  expires_at?: string
}

export interface DemoOrgFilters {
  search?: string
  status?: DemoOrganizationStatus | 'all'
}

export interface DemoCodeValidationResult {
  valid: boolean
  demoOrgId?: string
  reason?: 'missing' | 'not_found' | 'revoked' | 'expired' | 'inactive_org'
}

export interface DemoSessionSnapshot {
  is_demo_session: boolean
  demo_org_id: string | null
  demo_code: string | null
  expires_at: string | null
}

export interface DemoGeneratedData {
  demo_org_id: string
  seed: string
  generated_at: string
  sports: SportCode[]
  organizations: Array<Record<string, unknown>>
  sportsData: Array<Record<string, unknown>>
  programs: Array<Record<string, unknown>>
  levels: Array<Record<string, unknown>>
  teams: Array<Record<string, unknown>>
  seasons: Array<Record<string, unknown>>
  teamSeasons: Array<Record<string, unknown>>
  athletes: Array<Record<string, unknown>>
  guardians: Array<Record<string, unknown>>
  events: Array<Record<string, unknown>>
  attendance: Array<Record<string, unknown>>
  payments: Array<Record<string, unknown>>
  announcements: Array<Record<string, unknown>>
}

export const DEMO_CODE_PATTERN = /^[A-Z0-9]{10,}$/
export const DEMO_CODE_STORAGE_KEY = 'ys_demo_code'
export const DEMO_SESSION_STORAGE_KEY = 'ys_demo_session'

export function normalizeDemoCode(input: string): string {
  return input.trim().toUpperCase()
}

export function isValidDemoCode(input: string): boolean {
  return DEMO_CODE_PATTERN.test(normalizeDemoCode(input))
}

