import { fakeUsers } from './fakeUsers'

export interface FakeOrgUserRecord {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  roles: string[]
  created_at: string
}

interface CreateFakeOrgUserInput {
  orgId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'parent' | 'coach' | 'admin'
}

interface UpdateFakeOrgUserInput {
  orgId: string
  userId: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: 'parent' | 'coach' | 'admin'
}

const fakeOrgUsersStore = new Map<string, FakeOrgUserRecord[]>()

function normalizeRole(role: 'parent' | 'coach' | 'admin'): string {
  if (role === 'admin') return 'org_admin'
  return role
}

function ensureSeededOrgUsers(orgId: string): FakeOrgUserRecord[] {
  const existing = fakeOrgUsersStore.get(orgId)
  if (existing) return existing

  const now = new Date().toISOString()
  const seeded: FakeOrgUserRecord[] = fakeUsers.slice(0, 8).map((user, index) => ({
    id: user.id,
    email: user.email.toLowerCase(),
    display_name: user.display_name ?? null,
    phone: user.phone ?? null,
    roles: [index === 0 ? 'org_admin' : index % 3 === 0 ? 'coach' : 'parent'],
    created_at: user.created_at ?? now,
  }))

  fakeOrgUsersStore.set(orgId, seeded)
  return seeded
}

export function listFakeOrganizationUsers(orgId: string, currentUserId?: string): FakeOrgUserRecord[] {
  const seeded = ensureSeededOrgUsers(orgId)
  if (!currentUserId) return [...seeded]

  const exists = seeded.some((user) => user.id === currentUserId)
  if (exists) return [...seeded]

  const now = new Date().toISOString()
  const current = fakeUsers.find((user) => user.id === currentUserId)
  const fallback: FakeOrgUserRecord = {
    id: currentUserId,
    email: current?.email?.toLowerCase() ?? 'admin@example.com',
    display_name: current?.display_name ?? 'Admin User',
    phone: current?.phone ?? null,
    roles: ['org_admin'],
    created_at: now,
  }
  const next = [fallback, ...seeded]
  fakeOrgUsersStore.set(orgId, next)
  return next
}

export function createFakeOrganizationUser(input: CreateFakeOrgUserInput): { user: FakeOrgUserRecord | null; error: Error | null } {
  const users = ensureSeededOrgUsers(input.orgId)
  const normalizedEmail = input.email.trim().toLowerCase()
  const existing = users.find((user) => user.email === normalizedEmail)
  if (existing) {
    return { user: null, error: new Error('A user with this email already exists in this organization') }
  }

  const now = new Date().toISOString()
  const id = `demo-org-user-${Date.now()}`
  const displayName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim()

  const created: FakeOrgUserRecord = {
    id,
    email: normalizedEmail,
    display_name: displayName,
    phone: input.phone.trim(),
    roles: [normalizeRole(input.role)],
    created_at: now,
  }

  const next = [created, ...users]
  fakeOrgUsersStore.set(input.orgId, next)
  return { user: created, error: null }
}

export function updateFakeOrganizationUser(input: UpdateFakeOrgUserInput): { user: FakeOrgUserRecord | null; error: Error | null } {
  const users = ensureSeededOrgUsers(input.orgId)
  const index = users.findIndex((user) => user.id === input.userId)
  if (index === -1) {
    return { user: null, error: new Error('User not found') }
  }

  const current = users[index]
  const firstName = input.firstName?.trim()
  const lastName = input.lastName?.trim()
  const nextDisplayName =
    firstName !== undefined && lastName !== undefined
      ? `${firstName} ${lastName}`.trim()
      : current.display_name

  const updated: FakeOrgUserRecord = {
    ...current,
    display_name: nextDisplayName,
    phone: input.phone !== undefined ? input.phone.trim() : current.phone,
    roles: input.role ? [normalizeRole(input.role)] : current.roles,
  }

  const next = [...users]
  next[index] = updated
  fakeOrgUsersStore.set(input.orgId, next)

  return { user: updated, error: null }
}

