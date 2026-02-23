import { supabase } from '@/lib/supabase'
import type {
  CreateDemoCodeInput,
  DemoAllowedRole,
  DemoCode,
  DemoCodeValidationResult,
  DemoOrganizationStatus,
} from '@/types/demoManagement'
import { isValidDemoCode, normalizeDemoCode } from '@/types/demoManagement'
import { USE_FAKE_DATA } from '../config'
import { readDemoManagementStore, writeDemoManagementStore } from './demoOrgService'

const DEFAULT_ALLOWED_ROLES: DemoAllowedRole[] = ['org_admin']
const CODE_LENGTH = 12
const supabaseAny = supabase as any

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function randomAlphanumeric(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 255)
    }
  }
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}

function normalizeRoles(roles?: DemoAllowedRole[]): DemoAllowedRole[] {
  if (!roles || roles.length === 0) return DEFAULT_ALLOWED_ROLES
  return Array.from(new Set(roles))
}

function mapDemoCodeRow(row: Record<string, unknown>): DemoCode {
  const status = row.status === 'revoked' || row.status === 'expired' ? row.status : 'active'
  return {
    id: String(row.id),
    demo_code: normalizeDemoCode(String(row.demo_code ?? '')),
    demo_org_id: String(row.demo_org_id),
    poc_id: typeof row.poc_id === 'string' ? row.poc_id : null,
    allowed_roles: Array.isArray(row.allowed_roles)
      ? (row.allowed_roles.filter((role): role is DemoAllowedRole => typeof role === 'string') as DemoAllowedRole[])
      : DEFAULT_ALLOWED_ROLES,
    expires_at: typeof row.expires_at === 'string' ? row.expires_at : nowIso(),
    status,
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : nowIso(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : nowIso(),
    revoked_at: typeof row.revoked_at === 'string' ? row.revoked_at : null,
  }
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}

export function generateDemoCode(): string {
  return randomAlphanumeric(CODE_LENGTH)
}

async function updateCodeStatusIfExpired(code: DemoCode): Promise<DemoCode> {
  if (!isExpired(code.expires_at) || code.status !== 'active') {
    return code
  }
  await revokeAsExpired(code.demo_code)
  return {
    ...code,
    status: 'expired',
    updated_at: nowIso(),
  }
}

async function revokeAsExpired(code: string): Promise<void> {
  const normalized = normalizeDemoCode(code)
  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.codes.findIndex((item) => item.demo_code === normalized)
    if (index < 0) return
    store.codes[index] = {
      ...store.codes[index],
      status: 'expired',
      updated_at: nowIso(),
    }
    writeDemoManagementStore(store)
    return
  }

  await supabaseAny
    .from('demo_codes')
    .update({ status: 'expired', updated_at: nowIso() })
    .eq('demo_code', normalized)
    .eq('status', 'active')
}

export async function createDemoCode(input: CreateDemoCodeInput): Promise<DemoCode> {
  if (!input.demo_org_id?.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  const store = USE_FAKE_DATA ? readDemoManagementStore() : null
  let candidate = generateDemoCode()

  while (true) {
    const existsInFake = Boolean(store?.codes.some((code) => code.demo_code === candidate))
    if (existsInFake) {
      candidate = generateDemoCode()
      continue
    }

    if (!USE_FAKE_DATA) {
      const { data } = await supabaseAny
        .from('demo_codes')
        .select('id')
        .eq('demo_code', candidate)
        .maybeSingle()
      if (data) {
        candidate = generateDemoCode()
        continue
      }
    }
    break
  }

  const { data: authUser } = await supabase.auth.getUser()
  const createdBy = authUser.user?.id ?? null
  const expiresAt =
    input.expires_at ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const payload: DemoCode = {
    id: createId('demo-code'),
    demo_code: candidate,
    demo_org_id: input.demo_org_id,
    poc_id: input.poc_id ?? null,
    allowed_roles: normalizeRoles(input.allowed_roles),
    expires_at: expiresAt,
    status: 'active',
    created_by: createdBy,
    created_at: nowIso(),
    updated_at: nowIso(),
    revoked_at: null,
  }

  if (USE_FAKE_DATA && store) {
    store.codes.unshift(payload)
    writeDemoManagementStore(store)
    return payload
  }

  const { data, error } = await supabaseAny
    .from('demo_codes')
    .insert({
      demo_code: payload.demo_code,
      demo_org_id: payload.demo_org_id,
      poc_id: payload.poc_id,
      allowed_roles: payload.allowed_roles,
      expires_at: payload.expires_at,
      status: payload.status,
      created_by: payload.created_by,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create demo code: ${error?.message ?? 'Unknown error'}`)
  }

  return mapDemoCodeRow(data as Record<string, unknown>)
}

export async function listDemoCodesForOrg(orgId: string): Promise<DemoCode[]> {
  if (!orgId.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const rows = store.codes
      .filter((code) => code.demo_org_id === orgId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return Promise.all(rows.map((code) => updateCodeStatusIfExpired(code)))
  }

  const { data, error } = await supabaseAny
    .from('demo_codes')
    .select('*')
    .eq('demo_org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load demo codes: ${error.message}`)
  }

  const rows = (data ?? []).map((row: Record<string, unknown>) => mapDemoCodeRow(row))
  return Promise.all(rows.map((code: DemoCode) => updateCodeStatusIfExpired(code)))
}

export async function getDemoCodeDetails(code: string): Promise<DemoCode> {
  const normalized = normalizeDemoCode(code)
  if (!isValidDemoCode(normalized)) {
    throw new Error('Demo code format is invalid.')
  }

  // IMPORTANT: Demo code details ALWAYS uses real Supabase, even in fake data mode
  // Demo codes are meant to be validated against the real database
  const { data, error } = await supabaseAny
    .from('demo_codes')
    .select('*')
    .eq('demo_code', normalized)
    .single()

  if (error || !data) {
    throw new Error('Demo code not found.')
  }
  return updateCodeStatusIfExpired(mapDemoCodeRow(data as Record<string, unknown>))
}

export async function validateDemoCode(code: string): Promise<DemoCodeValidationResult> {
  const normalized = normalizeDemoCode(code)

  if (!normalized) {
    return { valid: false, reason: 'missing' }
  }
  if (!isValidDemoCode(normalized)) {
    return { valid: false, reason: 'not_found' }
  }

  // Demo code validation ALWAYS uses real Supabase, even in fake data mode.
  let demoCode: DemoCode | null = null
  let orgStatus: DemoOrganizationStatus | null = null

  const { data, error } = await supabaseAny
    .from('demo_codes')
    .select('*')
    .eq('demo_code', normalized)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate demo code: ${error.message}`)
  }
  if (data) {
    demoCode = mapDemoCodeRow(data as Record<string, unknown>)
    const { data: orgRow, error: orgError } = await supabaseAny
      .from('demo_organizations')
      .select('status, allowed_roles')
      .eq('id', demoCode.demo_org_id)
      .maybeSingle()

    if (orgError) {
      orgStatus = 'active'
    } else {
      orgStatus = orgRow?.status === 'inactive' ? 'inactive' : 'active'
    }
  }

  if (!demoCode) {
    return { valid: false, reason: 'not_found' }
  }

  const withStatus = await updateCodeStatusIfExpired(demoCode)
  if (withStatus.status === 'revoked') {
    return { valid: false, reason: 'revoked' }
  }
  if (withStatus.status === 'expired') {
    return { valid: false, reason: 'expired' }
  }
  if (orgStatus === 'inactive') {
    return { valid: false, reason: 'inactive_org' }
  }

  return {
    valid: true,
    demoOrgId: withStatus.demo_org_id,
  }
}

export async function revokeDemoCode(code: string): Promise<void> {
  const normalized = normalizeDemoCode(code)
  if (!isValidDemoCode(normalized)) {
    throw new Error('Demo code format is invalid.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.codes.findIndex((item) => item.demo_code === normalized)
    if (index < 0) {
      throw new Error('Demo code not found.')
    }
    store.codes[index] = {
      ...store.codes[index],
      status: 'revoked',
      revoked_at: nowIso(),
      updated_at: nowIso(),
    }
    writeDemoManagementStore(store)
    return
  }

  const { error } = await supabaseAny
    .from('demo_codes')
    .update({
      status: 'revoked',
      revoked_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('demo_code', normalized)

  if (error) {
    throw new Error(`Failed to revoke demo code: ${error.message}`)
  }
}

export async function revokeAllDemoCodesForOrg(orgId: string): Promise<void> {
  if (!orgId.trim()) {
    throw new Error('Demo organization ID is required.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.codes = store.codes.map((code) =>
      code.demo_org_id === orgId
        ? {
            ...code,
            status: 'revoked',
            revoked_at: code.revoked_at ?? nowIso(),
            updated_at: nowIso(),
          }
        : code
    )
    writeDemoManagementStore(store)
    return
  }

  const { error } = await supabaseAny
    .from('demo_codes')
    .update({
      status: 'revoked',
      revoked_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('demo_org_id', orgId)
    .eq('status', 'active')

  if (error) {
    throw new Error(`Failed to revoke organization demo codes: ${error.message}`)
  }
}

export async function extendDemoCodeExpiration(code: string, newExpiresAt: Date): Promise<void> {
  const normalized = normalizeDemoCode(code)
  if (!isValidDemoCode(normalized)) {
    throw new Error('Demo code format is invalid.')
  }

  const expiresAtIso = newExpiresAt.toISOString()
  if (new Date(expiresAtIso).getTime() <= Date.now()) {
    throw new Error('New expiration must be in the future.')
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.codes.findIndex((item) => item.demo_code === normalized)
    if (index < 0) {
      throw new Error('Demo code not found.')
    }
    store.codes[index] = {
      ...store.codes[index],
      expires_at: expiresAtIso,
      status: 'active',
      revoked_at: null,
      updated_at: nowIso(),
    }
    writeDemoManagementStore(store)
    return
  }

  const { error } = await supabaseAny
    .from('demo_codes')
    .update({
      expires_at: expiresAtIso,
      status: 'active',
      revoked_at: null,
      updated_at: nowIso(),
    })
    .eq('demo_code', normalized)

  if (error) {
    throw new Error(`Failed to extend demo code expiration: ${error.message}`)
  }
}
