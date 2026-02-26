import { DEMO_ORG_A_ID } from '@/data/config'

export type DemoSwitcherRole =
  | 'platform_admin'
  | 'org_admin'
  | 'coach'
  | 'staff'
  | 'guardian'
  | 'athlete'
  | 'fan'

export interface DemoUserRecord {
  role: DemoSwitcherRole
  email: string | null
  password: string | null
  userId: string | null
  defaultOrgId: string | null
  seeded: boolean
}

const env = import.meta.env as Record<string, string | boolean | undefined>

const DEMO_ROLE_ORDER: DemoSwitcherRole[] = [
  'platform_admin',
  'org_admin',
  'coach',
  'staff',
  'guardian',
  'athlete',
  'fan',
]

const DEMO_USER_EMAIL_BY_ROLE: Record<DemoSwitcherRole, string | null> = {
  platform_admin: normalizeString(env.VITE_DEMO_PLATFORM_ADMIN_EMAIL ?? null),
  org_admin: 'admin-only@example.com',
  coach: 'coach-only@example.com',
  staff: 'staff-only@example.com',
  guardian: normalizeString(env.VITE_DEMO_GUARDIAN_EMAIL ?? 'parent-only@example.com'),
  athlete: 'athlete-only@example.com',
  fan: 'fan-only@example.com',
}

const DEMO_USER_IDS_BY_ROLE: Partial<Record<DemoSwitcherRole, string>> = {
  org_admin: 'aca2bee1-5ced-47c1-9894-2b054104949e',
  coach: '0392f59a-d35a-47ca-8803-021f122ffc80',
  staff: 'b1c2d3e4-f5a6-7890-bcde-f01234567890',
  guardian: '8f116968-e0f4-406a-a8c2-a663d1b57ec1',
  athlete: 'c2d3e4f5-a6b7-8901-cdef-012345678901',
  fan: 'd3e4f5a6-b7c8-9012-defa-123456789012',
}

const DEMO_SHARED_PASSWORD =
  normalizeString(env.VITE_DEMO_USER_PASSWORD) ??
  normalizeString(env.DEMO_USER_PASSWORD) ??
  'demo-password'

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildDemoUserRecord(role: DemoSwitcherRole, orgId?: string | null): DemoUserRecord {
  const email = DEMO_USER_EMAIL_BY_ROLE[role]
  const seeded = Boolean(email)

  return {
    role,
    email,
    password: seeded ? DEMO_SHARED_PASSWORD : null,
    userId: seeded ? (DEMO_USER_IDS_BY_ROLE[role] ?? null) : null,
    defaultOrgId: role === 'platform_admin' ? null : (orgId ?? DEMO_ORG_A_ID),
    seeded,
  }
}

export function listDemoUsers(orgId?: string | null): DemoUserRecord[] {
  return DEMO_ROLE_ORDER.map((role) => buildDemoUserRecord(role, orgId))
}

export function getDemoUser(role: DemoSwitcherRole, orgId?: string | null): DemoUserRecord | null {
  return buildDemoUserRecord(role, orgId)
}

export function getDemoUserByEmail(email: string): DemoUserRecord | null {
  const normalizedEmail = email.trim().toLowerCase()
  const match = DEMO_ROLE_ORDER.find((role) => {
    const roleEmail = DEMO_USER_EMAIL_BY_ROLE[role]
    return roleEmail?.toLowerCase() === normalizedEmail
  })

  if (!match) {
    return null
  }

  return buildDemoUserRecord(match)
}

export function getDemoRoleLabel(role: DemoSwitcherRole): string {
  switch (role) {
    case 'platform_admin':
      return 'Platform Admin'
    case 'org_admin':
      return 'Org Admin'
    case 'coach':
      return 'Coach'
    case 'staff':
      return 'Staff'
    case 'guardian':
      return 'Guardian'
    case 'athlete':
      return 'Athlete'
    case 'fan':
      return 'Fan'
    default:
      return role
  }
}
