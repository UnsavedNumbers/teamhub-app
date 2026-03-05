import { supabase } from '@/lib/supabase'
import { isValidSportCode, type SportCode } from '@/types/sports'
import type {
  CreateDemoOrgInput,
  CreateDemoPOCInput,
  DemoAllowedRole,
  DemoCode,
  DemoOrgFilters,
  DemoOrgPOC,
  DemoOrganization,
  DemoOrganizationStatus,
  DemoSession,
  UpdateDemoOrgInput,
  UpdateDemoPOCInput,
} from '@/types/demoManagement'
import { USE_FAKE_DATA } from '../config'

interface DemoManagementStore {
  organizations: DemoOrganization[]
  pocs: DemoOrgPOC[]
  codes: DemoCode[]
  sessions: DemoSession[]
}

const STORAGE_KEY = 'ys_demo_management_store_v1'
const supabaseAny = supabase as any

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  const entropy = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${entropy}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeSports(value: unknown): SportCode[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is SportCode => isValidSportCode(entry))
  return Array.from(new Set(normalized))
}

function ensureDemoOrgName(name: string): string {
  const normalized = name.trim()
  if (!normalized) {
    throw new Error('Organization name is required.')
  }
  return normalized
}

function ensureTimezone(timezone: string): string {
  const normalized = timezone.trim()
  if (!normalized) {
    throw new Error('Timezone is required.')
  }
  return normalized
}

function ensureSports(sports: SportCode[]): SportCode[] {
  const unique = Array.from(new Set(sports))
  if (unique.length === 0) {
    throw new Error('At least one sport is required.')
  }
  return unique
}

function assertPrimaryPocUniqueness(pocs: DemoOrgPOC[], orgId: string, pocId: string): DemoOrgPOC[] {
  return pocs.map((poc) => {
    if (poc.demo_org_id !== orgId) return poc
    return {
      ...poc,
      is_primary: poc.id === pocId,
      updated_at: poc.id === pocId ? nowIso() : poc.updated_at,
    }
  })
}

function emptyStore(): DemoManagementStore {
  return {
    organizations: [],
    pocs: [],
    codes: [],
    sessions: [],
  }
}

function parseStore(raw: string | null): DemoManagementStore {
  if (!raw) return emptyStore()

  try {
    const parsed = JSON.parse(raw) as Partial<DemoManagementStore>
    return {
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
      pocs: Array.isArray(parsed.pocs) ? parsed.pocs : [],
      codes: Array.isArray(parsed.codes) ? parsed.codes : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }
  } catch {
    return emptyStore()
  }
}

export function readDemoManagementStore(): DemoManagementStore {
  if (typeof window === 'undefined') return emptyStore()
  return parseStore(window.localStorage.getItem(STORAGE_KEY))
}

export function writeDemoManagementStore(store: DemoManagementStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function normalizeAllowedRoles(value: unknown): DemoAllowedRole[] {
  if (!Array.isArray(value)) return ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan']
  const validRoles: DemoAllowedRole[] = ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan']
  return value.filter((role): role is DemoAllowedRole => typeof role === 'string' && validRoles.includes(role as DemoAllowedRole))
}

function mapDemoOrganizationRow(row: Record<string, unknown>): DemoOrganization {
  const statusValue = row.status
  let status: DemoOrganizationStatus = 'active'
  if (statusValue === 'pending' || statusValue === 'active' || statusValue === 'inactive' || statusValue === 'rejected') {
    status = statusValue
  }

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    city: toStringOrNull(row.city),
    state: toStringOrNull(row.state),
    country: typeof row.country === 'string' && row.country.trim().length > 0 ? row.country : 'US',
    timezone: typeof row.timezone === 'string' ? row.timezone : 'America/New_York',
    org_type: toStringOrNull(row.org_type),
    sports_sponsored: normalizeSports(row.sports_sponsored),
    org_size:
      row.org_size === 'small' || row.org_size === 'medium' || row.org_size === 'large'
        ? row.org_size
        : null,
    payment_enabled: Boolean(row.payment_enabled),
    ticketing_enabled: Boolean(row.ticketing_enabled),
    notes: toStringOrNull(row.notes),
    status,
    created_by: toStringOrNull(row.created_by),
    created_at: typeof row.created_at === 'string' ? row.created_at : nowIso(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : nowIso(),
    organization_id: typeof row.organization_id === 'string' ? row.organization_id : null,
    allowed_roles: normalizeAllowedRoles(row.allowed_roles),
  }
}

function mapDemoPocRow(row: Record<string, unknown>): DemoOrgPOC {
  return {
    id: String(row.id),
    demo_org_id: String(row.demo_org_id),
    first_name: String(row.first_name ?? ''),
    last_name: String(row.last_name ?? ''),
    title: toStringOrNull(row.title),
    email: normalizeEmail(String(row.email ?? '')),
    phone: toStringOrNull(row.phone),
    notes: toStringOrNull(row.notes),
    is_primary: Boolean(row.is_primary),
    created_at: typeof row.created_at === 'string' ? row.created_at : nowIso(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : nowIso(),
  }
}

export async function listDemoOrgs(filters?: DemoOrgFilters): Promise<DemoOrganization[]> {
  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const search = filters?.search?.trim().toLowerCase() ?? ''
    const status = filters?.status ?? 'all'

    return store.organizations
      .filter((org) => {
        const matchesSearch =
          search.length === 0 ||
          org.name.toLowerCase().includes(search) ||
          (org.city ?? '').toLowerCase().includes(search) ||
          (org.state ?? '').toLowerCase().includes(search)
        const matchesStatus = status === 'all' || org.status === status
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

  let query = supabaseAny.from('demo_organizations').select('*').order('updated_at', { ascending: false })
  if (filters?.search?.trim()) {
    const search = `%${filters.search.trim()}%`
    query = query.or(`name.ilike.${search},city.ilike.${search},state.ilike.${search}`)
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load demo organizations: ${error.message}`)
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapDemoOrganizationRow(row))
}

export async function getDemoOrg(id: string): Promise<DemoOrganization> {
  if (!id.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  // IMPORTANT: When fetching demo org for code validation, always use real Supabase
  // This ensures demo codes work even in fake data mode
  // However, if USE_FAKE_DATA is true and we're in admin UI, use fake data for consistency
  // For demo entry flow, always use real DB
  const { data, error } = await supabaseAny.from('demo_organizations').select('*').eq('id', id).single()
  if (error || !data) {
    // Fallback to fake data if real DB fails and we're in fake mode
    if (USE_FAKE_DATA) {
      const store = readDemoManagementStore()
      const found = store.organizations.find((org) => org.id === id)
      if (found) {
        return found
      }
    }
    throw new Error('Demo organization not found.')
  }
  return mapDemoOrganizationRow(data as Record<string, unknown>)
}

export async function createDemoOrg(input: CreateDemoOrgInput): Promise<DemoOrganization> {
  const name = ensureDemoOrgName(input.name)
  const timezone = ensureTimezone(input.timezone)
  const sports = ensureSports(input.sports_sponsored)
  const now = nowIso()
  const { data: authUser } = await supabase.auth.getUser()
  // For public demo requests (status='pending'), always set created_by to null
  // This allows anonymous users to create demo orgs via the public form
  const createdBy = input.status === 'pending' ? null : (authUser.user?.id ?? null)

  const payload: DemoOrganization = {
    id: createId('demo-org'),
    name,
    city: toStringOrNull(input.city),
    state: toStringOrNull(input.state),
    country: input.country?.trim() || 'US',
    timezone,
    org_type: toStringOrNull(input.org_type),
    sports_sponsored: sports,
    org_size: input.org_size ?? null,
    payment_enabled: Boolean(input.payment_enabled),
    ticketing_enabled: Boolean(input.ticketing_enabled),
    notes: toStringOrNull(input.notes),
    status: input.status ?? 'active',
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.organizations.unshift(payload)
    writeDemoManagementStore(store)
    return payload
  }

  const { data, error } = await supabaseAny
    .from('demo_organizations')
    .insert({
      name: payload.name,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      timezone: payload.timezone,
      org_type: payload.org_type,
      sports_sponsored: payload.sports_sponsored,
      org_size: payload.org_size,
      payment_enabled: payload.payment_enabled,
      ticketing_enabled: payload.ticketing_enabled,
      notes: payload.notes,
      status: payload.status,
      created_by: payload.created_by,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create demo organization: ${error?.message ?? 'Unknown error'}`)
  }

  return mapDemoOrganizationRow(data as Record<string, unknown>)
}

export async function updateDemoOrg(id: string, input: UpdateDemoOrgInput): Promise<DemoOrganization> {
  if (!id.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.organizations.findIndex((org) => org.id === id)
    if (index < 0) {
      throw new Error('Demo organization not found.')
    }

    const existing = store.organizations[index]
    const updated: DemoOrganization = {
      ...existing,
      name: input.name !== undefined ? ensureDemoOrgName(input.name) : existing.name,
      city: input.city !== undefined ? toStringOrNull(input.city) : existing.city,
      state: input.state !== undefined ? toStringOrNull(input.state) : existing.state,
      country: input.country !== undefined ? input.country.trim() || 'US' : existing.country,
      timezone: input.timezone !== undefined ? ensureTimezone(input.timezone) : existing.timezone,
      org_type: input.org_type !== undefined ? toStringOrNull(input.org_type) : existing.org_type,
      sports_sponsored:
        input.sports_sponsored !== undefined
          ? ensureSports(input.sports_sponsored)
          : existing.sports_sponsored,
      org_size: input.org_size !== undefined ? input.org_size ?? null : existing.org_size,
      payment_enabled:
        input.payment_enabled !== undefined ? Boolean(input.payment_enabled) : existing.payment_enabled,
      ticketing_enabled:
        input.ticketing_enabled !== undefined
          ? Boolean(input.ticketing_enabled)
          : existing.ticketing_enabled,
      notes: input.notes !== undefined ? toStringOrNull(input.notes) : existing.notes,
      status: input.status ?? existing.status,
      allowed_roles: input.allowed_roles !== undefined ? normalizeAllowedRoles(input.allowed_roles) : (existing.allowed_roles ?? ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan']),
      updated_at: nowIso(),
    }

    store.organizations[index] = updated
    writeDemoManagementStore(store)
    return updated
  }

  const updates: Record<string, unknown> = {
    updated_at: nowIso(),
  }

  if (input.name !== undefined) updates.name = ensureDemoOrgName(input.name)
  if (input.city !== undefined) updates.city = toStringOrNull(input.city)
  if (input.state !== undefined) updates.state = toStringOrNull(input.state)
  if (input.country !== undefined) updates.country = input.country.trim() || 'US'
  if (input.timezone !== undefined) updates.timezone = ensureTimezone(input.timezone)
  if (input.org_type !== undefined) updates.org_type = toStringOrNull(input.org_type)
  if (input.sports_sponsored !== undefined) updates.sports_sponsored = ensureSports(input.sports_sponsored)
  if (input.org_size !== undefined) updates.org_size = input.org_size
  if (input.payment_enabled !== undefined) updates.payment_enabled = Boolean(input.payment_enabled)
  if (input.ticketing_enabled !== undefined) updates.ticketing_enabled = Boolean(input.ticketing_enabled)
  if (input.notes !== undefined) updates.notes = toStringOrNull(input.notes)
  if (input.status !== undefined) updates.status = input.status
  // Handle allowed_roles update (from UpdateDemoOrgInput which extends CreateDemoOrgInput)
  if ('allowed_roles' in input && input.allowed_roles !== undefined) {
    updates.allowed_roles = normalizeAllowedRoles(input.allowed_roles)
  }

  const { data, error } = await supabaseAny
    .from('demo_organizations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to update demo organization: ${error?.message ?? 'Unknown error'}`)
  }

  return mapDemoOrganizationRow(data as Record<string, unknown>)
}

export async function deleteDemoOrg(id: string): Promise<void> {
  if (!id.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.organizations = store.organizations.filter((org) => org.id !== id)
    store.pocs = store.pocs.filter((poc) => poc.demo_org_id !== id)
    store.codes = store.codes.filter((code) => code.demo_org_id !== id)
    store.sessions = store.sessions.filter((session) => session.demo_org_id !== id)
    writeDemoManagementStore(store)
    return
  }

  const { error } = await supabaseAny.from('demo_organizations').delete().eq('id', id)
  if (error) {
    throw new Error(`Failed to delete demo organization: ${error.message}`)
  }
}

export async function listPOCs(orgId: string): Promise<DemoOrgPOC[]> {
  if (!orgId.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    return store.pocs
      .filter((poc) => poc.demo_org_id === orgId)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  }

  const { data, error } = await supabaseAny
    .from('demo_org_pocs')
    .select('*')
    .eq('demo_org_id', orgId)
    .order('is_primary', { ascending: false })
    .order('last_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to load POCs: ${error.message}`)
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapDemoPocRow(row))
}

export async function addPOC(orgId: string, input: CreateDemoPOCInput): Promise<DemoOrgPOC> {
  if (!orgId.trim()) {
    throw new Error('Demo organization ID is required.')
  }
  if (!input.first_name.trim() || !input.last_name.trim()) {
    throw new Error('POC first and last name are required.')
  }
  const email = normalizeEmail(input.email)
  if (!email) {
    throw new Error('POC email is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const existing = store.pocs.find(
      (poc) => poc.demo_org_id === orgId && normalizeEmail(poc.email) === email
    )
    if (existing) {
      throw new Error('A POC with this email already exists for this organization.')
    }

    const now = nowIso()
    const poc: DemoOrgPOC = {
      id: createId('demo-poc'),
      demo_org_id: orgId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      title: toStringOrNull(input.title),
      email,
      phone: toStringOrNull(input.phone),
      notes: toStringOrNull(input.notes),
      is_primary: Boolean(input.is_primary),
      created_at: now,
      updated_at: now,
    }

    if (poc.is_primary) {
      store.pocs = assertPrimaryPocUniqueness(store.pocs, orgId, poc.id)
    }

    store.pocs.unshift(poc)
    writeDemoManagementStore(store)
    return poc
  }

  if (input.is_primary) {
    const { error: resetError } = await supabaseAny
      .from('demo_org_pocs')
      .update({ is_primary: false })
      .eq('demo_org_id', orgId)
    if (resetError) {
      throw new Error(`Failed to update existing primary POC: ${resetError.message}`)
    }
  }

  const { data, error } = await supabaseAny
    .from('demo_org_pocs')
    .insert({
      demo_org_id: orgId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      title: toStringOrNull(input.title),
      email,
      phone: toStringOrNull(input.phone),
      notes: toStringOrNull(input.notes),
      is_primary: Boolean(input.is_primary),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to add POC: ${error?.message ?? 'Unknown error'}`)
  }
  return mapDemoPocRow(data as Record<string, unknown>)
}

export async function updatePOC(
  orgId: string,
  pocId: string,
  input: UpdateDemoPOCInput
): Promise<DemoOrgPOC> {
  if (!orgId.trim() || !pocId.trim()) {
    throw new Error('Organization and POC IDs are required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.pocs.findIndex((poc) => poc.demo_org_id === orgId && poc.id === pocId)
    if (index < 0) {
      throw new Error('POC not found.')
    }

    const existing = store.pocs[index]
    const updatedEmail = input.email !== undefined ? normalizeEmail(input.email) : existing.email
    if (!updatedEmail) {
      throw new Error('POC email is required.')
    }

    const duplicate = store.pocs.find(
      (poc) =>
        poc.demo_org_id === orgId &&
        poc.id !== pocId &&
        normalizeEmail(poc.email) === normalizeEmail(updatedEmail)
    )
    if (duplicate) {
      throw new Error('A POC with this email already exists for this organization.')
    }

    const updated: DemoOrgPOC = {
      ...existing,
      first_name: input.first_name !== undefined ? input.first_name.trim() : existing.first_name,
      last_name: input.last_name !== undefined ? input.last_name.trim() : existing.last_name,
      title: input.title !== undefined ? toStringOrNull(input.title) : existing.title,
      email: updatedEmail,
      phone: input.phone !== undefined ? toStringOrNull(input.phone) : existing.phone,
      notes: input.notes !== undefined ? toStringOrNull(input.notes) : existing.notes,
      is_primary: input.is_primary !== undefined ? Boolean(input.is_primary) : existing.is_primary,
      updated_at: nowIso(),
    }

    if (updated.is_primary) {
      store.pocs = assertPrimaryPocUniqueness(store.pocs, orgId, pocId)
      const primaryIndex = store.pocs.findIndex((poc) => poc.id === pocId)
      if (primaryIndex >= 0) {
        store.pocs[primaryIndex] = {
          ...store.pocs[primaryIndex],
          ...updated,
          is_primary: true,
        }
      }
    } else {
      store.pocs[index] = updated
    }

    writeDemoManagementStore(store)
    return store.pocs.find((poc) => poc.id === pocId) ?? updated
  }

  if (input.is_primary) {
    const { error: resetError } = await supabaseAny
      .from('demo_org_pocs')
      .update({ is_primary: false })
      .eq('demo_org_id', orgId)
      .neq('id', pocId)
    if (resetError) {
      throw new Error(`Failed to update primary POC: ${resetError.message}`)
    }
  }

  const updates: Record<string, unknown> = { updated_at: nowIso() }
  if (input.first_name !== undefined) updates.first_name = input.first_name.trim()
  if (input.last_name !== undefined) updates.last_name = input.last_name.trim()
  if (input.title !== undefined) updates.title = toStringOrNull(input.title)
  if (input.email !== undefined) updates.email = normalizeEmail(input.email)
  if (input.phone !== undefined) updates.phone = toStringOrNull(input.phone)
  if (input.notes !== undefined) updates.notes = toStringOrNull(input.notes)
  if (input.is_primary !== undefined) updates.is_primary = Boolean(input.is_primary)

  const { data, error } = await supabaseAny
    .from('demo_org_pocs')
    .update(updates)
    .eq('id', pocId)
    .eq('demo_org_id', orgId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to update POC: ${error?.message ?? 'Unknown error'}`)
  }

  return mapDemoPocRow(data as Record<string, unknown>)
}

export async function removePOC(orgId: string, pocId: string): Promise<void> {
  if (!orgId.trim() || !pocId.trim()) {
    throw new Error('Organization and POC IDs are required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.pocs = store.pocs.filter((poc) => !(poc.demo_org_id === orgId && poc.id === pocId))
    store.codes = store.codes.map((code) => (code.poc_id === pocId ? { ...code, poc_id: null } : code))
    writeDemoManagementStore(store)
    return
  }

  const { error } = await supabaseAny.from('demo_org_pocs').delete().eq('id', pocId).eq('demo_org_id', orgId)
  if (error) {
    throw new Error(`Failed to remove POC: ${error.message}`)
  }
}

export async function setPrimaryPOC(orgId: string, pocId: string): Promise<void> {
  if (!orgId.trim() || !pocId.trim()) {
    throw new Error('Organization and POC IDs are required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.pocs = assertPrimaryPocUniqueness(store.pocs, orgId, pocId)
    writeDemoManagementStore(store)
    return
  }

  const { error: resetError } = await supabaseAny
    .from('demo_org_pocs')
    .update({ is_primary: false })
    .eq('demo_org_id', orgId)

  if (resetError) {
    throw new Error(`Failed to update existing primary POC: ${resetError.message}`)
  }

  const { error } = await supabaseAny
    .from('demo_org_pocs')
    .update({ is_primary: true, updated_at: nowIso() })
    .eq('id', pocId)
    .eq('demo_org_id', orgId)

  if (error) {
    throw new Error(`Failed to set primary POC: ${error.message}`)
  }
}

/**
 * Create organization row for approved demo org and link it
 * This is called when a demo org is approved
 */
export async function createOrganizationForDemoOrg(demoOrgId: string): Promise<{ organizationId: string }> {
  if (!demoOrgId.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  // Get the demo org
  const demoOrg = await getDemoOrg(demoOrgId)
  
  if (demoOrg.organization_id) {
    // Already has an organization linked
    return { organizationId: demoOrg.organization_id }
  }

  if (USE_FAKE_DATA) {
    // In fake mode, just create a fake org ID
    const fakeOrgId = createId('org')
    const store = readDemoManagementStore()
    const index = store.organizations.findIndex((org) => org.id === demoOrgId)
    if (index >= 0) {
      store.organizations[index] = {
        ...store.organizations[index],
        organization_id: fakeOrgId,
      }
      writeDemoManagementStore(store)
    }
    return { organizationId: fakeOrgId }
  }

  // Create organization row
  const { data: orgData, error: orgError } = await supabaseAny
    .from('organizations')
    .insert({
      name: demoOrg.name,
      org_type: demoOrg.org_type,
      primary_city: demoOrg.city,
      primary_state: demoOrg.state,
      is_demo_org: true,
      status: 'active',
      ticketing_enabled: demoOrg.ticketing_enabled,
      // Set privacy to public so demo orgs are visible
      privacy_level: 'public',
    })
    .select('id')
    .single()

  if (orgError || !orgData) {
    throw new Error(`Failed to create organization: ${orgError?.message ?? 'Unknown error'}`)
  }

  const organizationId = String(orgData.id)

  // Link bidirectionally: set organization_id on demo_org and demo_org_id on org
  const { error: linkError } = await supabaseAny
    .from('demo_organizations')
    .update({ organization_id: organizationId })
    .eq('id', demoOrgId)

  if (linkError) {
    // Try to clean up the org if linking fails
    await supabaseAny.from('organizations').delete().eq('id', organizationId)
    throw new Error(`Failed to link demo organization: ${linkError.message}`)
  }

  // Set demo_org_id on the organization
  const { error: orgLinkError } = await supabaseAny
    .from('organizations')
    .update({ demo_org_id: demoOrgId })
    .eq('id', organizationId)

  if (orgLinkError) {
    // Non-fatal, but log it
    console.warn(`Failed to set demo_org_id on organization: ${orgLinkError.message}`)
  }

  // Set allowed_roles default if not already set
  const defaultAllowedRoles: DemoAllowedRole[] = ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan']
  const { error: rolesError } = await supabaseAny
    .from('demo_organizations')
    .update({ allowed_roles: defaultAllowedRoles })
    .eq('id', demoOrgId)
    .is('allowed_roles', null)

  if (rolesError) {
    console.warn(`Failed to set default allowed_roles: ${rolesError.message}`)
  }

  // Create organization_sports entries from sports_sponsored
  if (demoOrg.sports_sponsored.length > 0) {
    // First, get sport IDs for the sport codes
    const { data: sportsData } = await supabaseAny
      .from('sports')
      .select('id, code')
      .in('code', demoOrg.sports_sponsored)

    if (sportsData && sportsData.length > 0) {
      const sportInserts = sportsData.map((sport: { id: string; code: string }) => ({
        org_id: organizationId,
        sport_id: sport.id,
      }))

      const { error: sportsError } = await supabaseAny
        .from('organization_sports')
        .insert(sportInserts)

      if (sportsError) {
        console.warn(`Failed to create organization_sports: ${sportsError.message}`)
      }
    }
  }

  return { organizationId }
}
