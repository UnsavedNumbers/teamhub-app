import { FAKE_DATA_DELAY_MS, USE_FAKE_DATA } from '../config'
import type { UserContext } from '../fake/userContext'
import { getGuardianCanonicalUserId } from '../fake/userContext'
import {
  fakeTryoutEvaluations,
  fakeTryoutRegistrations,
  fakeTryouts,
  getRegistrationsForChild as getFakeRegistrationsForChild,
  getTryoutById as getFakeTryoutById,
  getTryoutsForOrg as getFakeTryoutsForOrg,
  isChildRegisteredForTryout as isChildRegisteredForTryoutFake,
} from '../fake/fakeTryouts'
import { getChildById } from '../fake/fakeUsers'
import { getChildrenForUserId, getFamiliesForUserId } from '../fake/relationships'
import { supabase } from '../../lib/supabase'
import { createServiceResponse } from './responseHelpers'
import type { ServiceResponse } from './responseHelpers'

type TryoutStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'completed'
  | 'cancelled'
  | 'upcoming'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'

type SessionType = 'initial' | 'callback' | 'final'

export type TryoutRegistrationStatus =
  | 'registered'
  | 'checked_in'
  | 'evaluated'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'withdrawn'
  | 'waitlisted'
  | 'not_selected'
  | 'pending'
  | 'confirmed'
  | 'cancelled'

export interface Tryout {
  id: string
  org_id: string
  title: string
  sport: string | null
  sport_id: string | null
  season_id: string | null
  program_id: string | null
  age_group: string
  status: TryoutStatus
  type?: string | null
  description: string | null
  location: string | null
  tryout_date: string | null
  start_time: string | null
  end_time: string | null
  start_at: string | null
  entry_fee: number | null
  max_spots: number | null
  capacity: number | null
  registration_deadline_at: string | null
  registration_open_at: string | null
  registration_close_at: string | null
  waitlist_enabled: boolean
  target_team_ids: string[] | null
  eligibility_criteria: Record<string, unknown>
  requirements: string[] | null
  what_to_bring: string[] | null
  created_at: string | null
  updated_at: string | null
  registration_count?: number
  sessions?: TryoutSession[]
}

export interface TryoutSession {
  id: string
  tryout_id: string
  session_date: string
  start_time: string
  end_time: string | null
  location: string | null
  session_type: SessionType
  capacity: number | null
  created_at: string | null
  updated_at: string | null
}

export interface TryoutRegistration {
  id: string
  tryout_id: string
  athlete_id: string
  family_id: string
  status: TryoutRegistrationStatus
  notes: string | null
  offer_deadline: string | null
  session_id: string | null
  payment_status: 'pending' | 'paid' | 'failed' | null
  created_at: string | null
  updated_at: string | null
  child?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface TryoutEvaluator {
  id: string
  tryout_id: string
  coach_id: string
  assigned_at: string | null
  coach?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  }
}

export interface TryoutEvaluation {
  id: string
  registration_id: string
  coach_id: string
  category: string
  score: number
  notes: string | null
  session_id: string | null
  created_at: string | null
  updated_at: string | null
  registration?: {
    id: string
    athlete_id: string
    child?: {
      id: string
      first_name: string
      last_name: string
    }
  }
}

export interface TryoutsQueryOptions {
  status?: TryoutStatus | 'all'
  search?: string
  sport?: string
  seasonId?: string
}

export interface TryoutDashboardStats {
  activeTryouts: number
  upcomingSessions: number
  pendingRegistrations: number
  incompleteEvaluations: number
  upcomingTryouts: Tryout[]
}

export interface GuardianTryoutStats {
  openTryouts: number
  myRegistrations: number
}

export interface CoachTryoutStats {
  assignments: number
  pendingEvaluations: number
}

export interface CreateTryoutEvaluationInput {
  registrationId: string
  score: number
  notes?: string | null
  category?: string
  sessionId?: string | null
}

const supabaseAny = supabase as any
const SESSION_TABLE = 'tryout_sessions'
const EVALUATOR_TABLE = 'tryout_evaluators'

const REGISTRATION_STATUSES = new Set<TryoutRegistrationStatus>([
  'registered',
  'checked_in',
  'evaluated',
  'offered',
  'accepted',
  'declined',
  'rejected',
  'withdrawn',
  'waitlisted',
  'not_selected',
  'pending',
  'confirmed',
  'cancelled',
])

function toError(value: unknown, fallbackMessage: string): Error {
  if (value instanceof Error) return value
  if (value && typeof value === 'object' && 'message' in value) {
    return new Error(String((value as { message: unknown }).message))
  }
  return new Error(fallbackMessage)
}

function isMissingRelationError(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const code = (value as { code?: string }).code
  return code === '42P01' || code === '42703'
}

function normalizeStatus(status: unknown): TryoutStatus {
  if (typeof status !== 'string') return 'draft'
  if (status === 'registration_open') return 'open'
  if (status === 'registration_closed') return 'closed'
  if (status === 'upcoming') return 'open'
  if (status === 'in_progress') return 'open'
  if (status === 'open' || status === 'closed' || status === 'draft' || status === 'completed' || status === 'cancelled') {
    return status
  }
  return 'draft'
}

function normalizeRegistrationStatus(status: unknown): TryoutRegistrationStatus {
  if (typeof status !== 'string') return 'registered'
  if (status === 'confirmed') return 'registered'
  if (status === 'pending') return 'registered'
  if (status === 'cancelled') return 'withdrawn'
  if (REGISTRATION_STATUSES.has(status as TryoutRegistrationStatus)) {
    return status as TryoutRegistrationStatus
  }
  return 'registered'
}

function toIsoStartAt(tryoutDate: string | null, startTime: string | null): string | null {
  if (!tryoutDate || !startTime) return null
  return `${tryoutDate}T${startTime}`
}

function parseStartAt(startAt: string | null | undefined): { date: string | null; time: string | null } {
  if (!startAt) return { date: null, time: null }
  const [date, time] = startAt.split('T')
  if (!date || !time) return { date: null, time: null }
  return { date, time: time.slice(0, 5) }
}

function toSafeEligibility(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

async function maybeDelay(): Promise<void> {
  if (USE_FAKE_DATA && FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

function resolveOrgId(context: UserContext, explicitOrgId?: string): string | null {
  if (explicitOrgId && explicitOrgId.trim().length > 0) return explicitOrgId
  if (context.orgId && context.orgId.trim().length > 0) return context.orgId
  return null
}

function mapTryoutRow(row: any): Tryout {
  const tryoutDate = row.tryout_date ?? row.session_date ?? null
  const startTime = row.start_time ?? null
  const maxSpots = row.max_spots ?? row.capacity ?? null

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    title: String(row.title ?? row.name ?? ''),
    sport: row.sport ?? null,
    sport_id: row.sport_id ?? null,
    season_id: row.season_id ?? null,
    program_id: row.program_id ?? null,
    age_group: String(row.age_group ?? ''),
    status: normalizeStatus(row.status),
    type: row.type ?? null,
    description: row.description ?? null,
    location: row.location ?? null,
    tryout_date: tryoutDate,
    start_time: startTime,
    end_time: row.end_time ?? null,
    start_at: row.start_at ?? toIsoStartAt(tryoutDate, startTime),
    entry_fee: typeof row.entry_fee === 'number' ? row.entry_fee : null,
    max_spots: typeof maxSpots === 'number' ? maxSpots : null,
    capacity: typeof row.capacity === 'number' ? row.capacity : typeof maxSpots === 'number' ? maxSpots : null,
    registration_deadline_at: row.registration_deadline_at ?? null,
    registration_open_at: row.registration_open_at ?? null,
    registration_close_at: row.registration_close_at ?? null,
    waitlist_enabled: Boolean(row.waitlist_enabled ?? false),
    target_team_ids: Array.isArray(row.target_team_ids) ? row.target_team_ids : null,
    eligibility_criteria: toSafeEligibility(row.eligibility_criteria),
    requirements: Array.isArray(row.requirements) ? row.requirements : null,
    what_to_bring: Array.isArray(row.what_to_bring) ? row.what_to_bring : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

function mapSessionRow(row: any): TryoutSession {
  const fallbackId = `session-${row.tryout_id}-${row.session_date}-${row.start_time}`
  return {
    id: String(row.id ?? fallbackId),
    tryout_id: String(row.tryout_id),
    session_date: String(row.session_date),
    start_time: String(row.start_time),
    end_time: row.end_time ?? null,
    location: row.location ?? null,
    session_type: (row.session_type as SessionType) ?? 'initial',
    capacity: typeof row.capacity === 'number' ? row.capacity : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

function mapRegistrationRow(row: any): TryoutRegistration {
  const athlete = row.athlete ?? row.child ?? null
  return {
    id: String(row.id),
    tryout_id: String(row.tryout_id),
    athlete_id: String(row.athlete_id),
    family_id: String(row.family_id),
    status: normalizeRegistrationStatus(row.status),
    notes: row.notes ?? null,
    offer_deadline: row.offer_deadline ?? null,
    session_id: row.session_id ?? null,
    payment_status: (row.payment_status as TryoutRegistration['payment_status']) ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    child: athlete
      ? {
          id: String(athlete.id),
          first_name: String(athlete.first_name ?? ''),
          last_name: String(athlete.last_name ?? ''),
        }
      : undefined,
  }
}

function mapEvaluationRow(row: any): TryoutEvaluation {
  const registration = row.registration ?? null
  const athlete = registration?.athlete ?? registration?.child ?? null
  return {
    id: String(row.id),
    registration_id: String(row.registration_id),
    coach_id: String(row.coach_id),
    category: String(row.category ?? 'overall'),
    score: Number(row.score ?? 0),
    notes: row.notes ?? null,
    session_id: row.session_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    registration: registration
      ? {
          id: String(registration.id),
          athlete_id: String(registration.athlete_id),
          child: athlete
            ? {
                id: String(athlete.id),
                first_name: String(athlete.first_name ?? ''),
                last_name: String(athlete.last_name ?? ''),
              }
            : undefined,
        }
      : undefined,
  }
}

function mapFakeTryout(raw: any): Tryout {
  return {
    id: raw.id,
    org_id: raw.org_id,
    title: raw.title,
    sport: raw.sport_id ?? null,
    sport_id: raw.sport_id ?? null,
    season_id: null,
    program_id: raw.program_id ?? null,
    age_group: raw.age_group,
    status: normalizeStatus(raw.status),
    type: null,
    description: raw.description ?? null,
    location: raw.location ?? null,
    tryout_date: raw.tryout_date ?? null,
    start_time: raw.start_time ?? null,
    end_time: raw.end_time ?? null,
    start_at: toIsoStartAt(raw.tryout_date ?? null, raw.start_time ?? null),
    entry_fee: typeof raw.entry_fee === 'number' ? raw.entry_fee : null,
    max_spots: typeof raw.max_participants === 'number' ? raw.max_participants : null,
    capacity: typeof raw.max_participants === 'number' ? raw.max_participants : null,
    registration_deadline_at: raw.registration_deadline ?? null,
    registration_open_at: null,
    registration_close_at: raw.registration_deadline ?? null,
    waitlist_enabled: true,
    target_team_ids: null,
    eligibility_criteria: {},
    requirements: null,
    what_to_bring: null,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  }
}

function mapFakeRegistration(raw: any): TryoutRegistration {
  const child = getChildById(raw.athlete_id)
  return {
    id: raw.id,
    tryout_id: raw.tryout_id,
    athlete_id: raw.athlete_id,
    family_id: child?.family_id ?? '',
    status: normalizeRegistrationStatus(raw.status),
    notes: raw.notes_from_parent ?? null,
    offer_deadline: null,
    session_id: null,
    payment_status: null,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    child: child
      ? {
          id: child.id,
          first_name: child.first_name,
          last_name: child.last_name,
        }
      : undefined,
  }
}

function filterTryouts(items: Tryout[], options: TryoutsQueryOptions = {}): Tryout[] {
  const normalizedSearch = options.search?.trim().toLowerCase() ?? ''
  return items.filter((item) => {
    if (options.status && options.status !== 'all' && item.status !== options.status) return false
    if (options.sport && item.sport && item.sport !== options.sport) return false
    if (options.seasonId && item.season_id !== options.seasonId) return false
    if (normalizedSearch.length > 0) {
      const haystack = `${item.title} ${item.description ?? ''} ${item.age_group}`.toLowerCase()
      if (!haystack.includes(normalizedSearch)) return false
    }
    return true
  })
}

function hasAdminTryoutAccess(context: UserContext): boolean {
  return context.roles.includes('org_admin') || context.roles.includes('coach') || context.roles.includes('staff')
}

async function fetchRegistrationCounts(tryoutIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (tryoutIds.length === 0) return counts

  const { data, error } = await supabaseAny
    .from('tryout_registrations')
    .select('tryout_id')
    .in('tryout_id', tryoutIds)

  if (error || !Array.isArray(data)) return counts

  for (const row of data) {
    const key = String(row.tryout_id)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

export async function getTryouts(
  context: UserContext,
  orgId?: string,
  options: TryoutsQueryOptions = {},
): Promise<ServiceResponse<Tryout[]>> {
  await maybeDelay()

  const resolvedOrgId = resolveOrgId(context, orgId)
  if (!resolvedOrgId) {
    return createServiceResponse([], new Error('Organization is required to load tryouts.'))
  }

  if (USE_FAKE_DATA) {
    const mapped = getFakeTryoutsForOrg(resolvedOrgId).map(mapFakeTryout)
    return createServiceResponse(filterTryouts(mapped, options), null)
  }

  try {
    const { data, error } = await supabaseAny
      .from('tryouts')
      .select('*')
      .eq('org_id', resolvedOrgId)
      .order('tryout_date', { ascending: true })

    if (error) {
      return createServiceResponse([], toError(error, 'Failed to load tryouts.'))
    }

    const mapped: Tryout[] = (data ?? []).map(mapTryoutRow)
    const counts = await fetchRegistrationCounts(mapped.map((item: Tryout) => item.id))
    const withCounts = mapped.map((item: Tryout) => ({ ...item, registration_count: counts.get(item.id) ?? 0 }))
    return createServiceResponse(filterTryouts(withCounts, options), null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load tryouts.'))
  }
}

export async function getTryoutById(
  _context: UserContext,
  tryoutId: string,
): Promise<ServiceResponse<Tryout | null>> {
  await maybeDelay()

  if (!tryoutId) {
    return createServiceResponse(null, new Error('Tryout ID is required.'))
  }

  if (USE_FAKE_DATA) {
    const fakeTryout = getFakeTryoutById(tryoutId)
    if (!fakeTryout) return createServiceResponse(null, null)
    const mapped = mapFakeTryout(fakeTryout)
    const sessions = await getTryoutSessions(_context, tryoutId)
    if (!sessions.error) mapped.sessions = sessions.data ?? []
    mapped.registration_count = fakeTryoutRegistrations.filter((row) => row.tryout_id === tryoutId).length
    return createServiceResponse(mapped, null)
  }

  try {
    const { data, error } = await supabaseAny
      .from('tryouts')
      .select('*')
      .eq('id', tryoutId)
      .maybeSingle()

    if (error) {
      return createServiceResponse(null, toError(error, 'Failed to load tryout details.'))
    }
    if (!data) return createServiceResponse(null, null)

    const mapped = mapTryoutRow(data)
    const sessions = await getTryoutSessions(_context, tryoutId)
    if (!sessions.error) mapped.sessions = sessions.data ?? []
    const counts = await fetchRegistrationCounts([tryoutId])
    mapped.registration_count = counts.get(tryoutId) ?? 0

    return createServiceResponse(mapped, null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Failed to load tryout details.'))
  }
}

function validateTryoutInput(input: Partial<Tryout>): Error | null {
  if (!input.title || input.title.trim().length === 0) return new Error('Tryout title is required.')
  if (!input.age_group || input.age_group.trim().length === 0) return new Error('Age group is required.')
  if (!input.location || input.location.trim().length === 0) return new Error('Location is required.')

  const parsed = parseStartAt(input.start_at)
  const hasStart = Boolean(input.tryout_date && input.start_time) || Boolean(parsed.date && parsed.time)
  if (!hasStart) return new Error('Tryout date and start time are required.')

  return null
}

export async function createTryout(
  context: UserContext,
  input: Partial<Tryout>,
): Promise<ServiceResponse<Tryout | null>> {
  await maybeDelay()

  const validationError = validateTryoutInput(input)
  if (validationError) return createServiceResponse(null, validationError)

  const resolvedOrgId = resolveOrgId(context, input.org_id ?? undefined)
  if (!resolvedOrgId) {
    return createServiceResponse(null, new Error('Organization is required to create a tryout.'))
  }

  const parsedStart = parseStartAt(input.start_at)
  const tryoutDate = input.tryout_date ?? parsedStart.date ?? ''
  const startTime = input.start_time ?? parsedStart.time ?? ''

  if (USE_FAKE_DATA) {
    const now = new Date().toISOString()
    const id = `tryout-${Date.now()}`
    const fakeRecord = {
      id,
      org_id: resolvedOrgId,
      sport_id: input.sport_id ?? input.sport ?? null,
      program_id: input.program_id ?? null,
      title: input.title ?? '',
      description: input.description ?? null,
      age_group: input.age_group ?? '',
      gender: 'coed' as const,
      tryout_date: tryoutDate,
      start_time: startTime,
      end_time: input.end_time ?? null,
      location: input.location ?? '',
      max_participants: input.capacity ?? input.max_spots ?? null,
      status: 'registration_open' as const,
      registration_deadline: input.registration_deadline_at ?? null,
      evaluation_criteria: null,
      notes: null,
      created_at: now,
      updated_at: now,
    }
    fakeTryouts.unshift(fakeRecord as any)
    return createServiceResponse(mapFakeTryout(fakeRecord), null)
  }

  const basePayload = {
    org_id: resolvedOrgId,
    title: input.title?.trim(),
    sport: input.sport ?? 'General',
    age_group: input.age_group?.trim(),
    tryout_date: tryoutDate,
    start_time: startTime,
    end_time: input.end_time ?? null,
    location: input.location?.trim(),
    entry_fee: typeof input.entry_fee === 'number' ? Math.max(0, Math.round(input.entry_fee)) : 0,
    max_spots:
      typeof input.capacity === 'number'
        ? input.capacity
        : typeof input.max_spots === 'number'
          ? input.max_spots
          : null,
    requirements: input.requirements ?? null,
    what_to_bring: input.what_to_bring ?? null,
  }

  try {
    const { data, error } = await supabaseAny.from('tryouts').insert(basePayload).select('*').single()
    if (error || !data) {
      return createServiceResponse(null, toError(error, 'Failed to create tryout.'))
    }

    const extendedPayload: Record<string, unknown> = {
      description: input.description ?? null,
      sport_id: input.sport_id ?? null,
      season_id: input.season_id ?? null,
      program_id: input.program_id ?? null,
      status: input.status ?? 'draft',
      registration_open_at: input.registration_open_at ?? null,
      registration_close_at: input.registration_close_at ?? null,
      registration_deadline_at: input.registration_deadline_at ?? null,
      eligibility_criteria: input.eligibility_criteria ?? {},
      waitlist_enabled: input.waitlist_enabled ?? false,
      target_team_ids: input.target_team_ids ?? null,
      capacity:
        typeof input.capacity === 'number'
          ? input.capacity
          : typeof input.max_spots === 'number'
            ? input.max_spots
            : null,
    }

    const { error: extendedError } = await supabaseAny.from('tryouts').update(extendedPayload).eq('id', data.id)
    if (extendedError && !isMissingRelationError(extendedError)) {
      return createServiceResponse(null, toError(extendedError, 'Tryout was created but metadata could not be saved.'))
    }

    const mapped = mapTryoutRow(data)
    if (Array.isArray(input.sessions) && input.sessions.length > 0) {
      await replaceTryoutSessions(context, mapped.id, input.sessions)
    }
    return createServiceResponse(mapped, null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Failed to create tryout.'))
  }
}

export async function updateTryout(
  _context: UserContext,
  tryoutId: string,
  patch: Partial<Tryout>,
): Promise<ServiceResponse<Tryout | null>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse(null, new Error('Tryout ID is required.'))

  if (USE_FAKE_DATA) {
    const index = fakeTryouts.findIndex((row) => row.id === tryoutId)
    if (index < 0) return createServiceResponse(null, new Error('Tryout not found.'))

    const current = fakeTryouts[index]
    const parsedStart = parseStartAt(patch.start_at)
    fakeTryouts[index] = {
      ...current,
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      age_group: patch.age_group ?? current.age_group,
      location: patch.location ?? current.location,
      tryout_date: patch.tryout_date ?? parsedStart.date ?? current.tryout_date,
      start_time: patch.start_time ?? parsedStart.time ?? current.start_time,
      end_time: patch.end_time ?? current.end_time,
      registration_deadline: patch.registration_deadline_at ?? current.registration_deadline,
      updated_at: new Date().toISOString(),
    } as any

    return createServiceResponse(mapFakeTryout(fakeTryouts[index]), null)
  }

  const parsedStart = parseStartAt(patch.start_at)
  const basePatch: Record<string, unknown> = {
    title: patch.title,
    sport: patch.sport,
    age_group: patch.age_group,
    location: patch.location,
    tryout_date: patch.tryout_date ?? parsedStart.date,
    start_time: patch.start_time ?? parsedStart.time,
    end_time: patch.end_time,
    entry_fee: typeof patch.entry_fee === 'number' ? Math.max(0, Math.round(patch.entry_fee)) : undefined,
    max_spots: typeof patch.max_spots === 'number' ? patch.max_spots : typeof patch.capacity === 'number' ? patch.capacity : undefined,
    requirements: patch.requirements,
    what_to_bring: patch.what_to_bring,
  }

  const extendedPatch: Record<string, unknown> = {
    description: patch.description,
    sport_id: patch.sport_id,
    season_id: patch.season_id,
    program_id: patch.program_id,
    status: patch.status,
    registration_open_at: patch.registration_open_at,
    registration_close_at: patch.registration_close_at,
    registration_deadline_at: patch.registration_deadline_at,
    eligibility_criteria: patch.eligibility_criteria,
    waitlist_enabled: patch.waitlist_enabled,
    target_team_ids: patch.target_team_ids,
    capacity: patch.capacity,
  }

  try {
    const { data, error } = await supabaseAny.from('tryouts').update(basePatch).eq('id', tryoutId).select('*').single()
    if (error || !data) return createServiceResponse(null, toError(error, 'Failed to update tryout.'))

    const { error: extendedError } = await supabaseAny.from('tryouts').update(extendedPatch).eq('id', tryoutId)
    if (extendedError && !isMissingRelationError(extendedError)) {
      return createServiceResponse(null, toError(extendedError, 'Tryout updated but some metadata changes failed.'))
    }

    if (Array.isArray(patch.sessions)) {
      const sessionsResponse = await replaceTryoutSessions(_context, tryoutId, patch.sessions)
      if (sessionsResponse.error) {
        return createServiceResponse(null, sessionsResponse.error)
      }
    }

    return createServiceResponse(mapTryoutRow(data), null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Failed to update tryout.'))
  }
}

export async function getTryoutRegistrations(
  context: UserContext,
  tryoutId?: string,
): Promise<ServiceResponse<TryoutRegistration[]>> {
  await maybeDelay()

  if (USE_FAKE_DATA) {
    const guardianId = getGuardianCanonicalUserId(context)
    const childIds = new Set(getChildrenForUserId(guardianId))
    const source = tryoutId
      ? fakeTryoutRegistrations.filter((row) => row.tryout_id === tryoutId)
      : fakeTryoutRegistrations

    const mapped = source
      .filter((row) => childIds.has(row.athlete_id))
      .map(mapFakeRegistration)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    return createServiceResponse(mapped, null)
  }

  try {
    let query = supabaseAny
      .from('tryout_registrations')
      .select(
        `
          id,
          tryout_id,
          athlete_id,
          family_id,
          status,
          notes,
          offer_deadline,
          created_at,
          updated_at,
          athlete:athletes(id, first_name, last_name)
        `,
      )
      .order('created_at', { ascending: false })

    if (tryoutId) query = query.eq('tryout_id', tryoutId)

    const { data, error } = await query
    if (error) return createServiceResponse([], toError(error, 'Failed to load tryout registrations.'))

    return createServiceResponse((data ?? []).map(mapRegistrationRow), null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load tryout registrations.'))
  }
}

export async function getAdminTryoutRegistrations(
  context: UserContext,
  tryoutId: string,
): Promise<ServiceResponse<TryoutRegistration[]>> {
  if (!tryoutId) return createServiceResponse([], new Error('Tryout ID is required.'))
  if (!hasAdminTryoutAccess(context)) {
    return createServiceResponse([], new Error('You do not have permission to view registrations for this tryout.'))
  }

  return getTryoutRegistrations(context, tryoutId)
}

export async function registerAthleteForTryout(
  context: UserContext,
  tryoutId: string,
  athleteId: string,
): Promise<ServiceResponse<TryoutRegistration | null>> {
  await maybeDelay()

  if (!tryoutId) return createServiceResponse(null, new Error('Tryout ID is required.'))
  if (!athleteId) return createServiceResponse(null, new Error('Athlete ID is required.'))

  if (USE_FAKE_DATA) {
    if (isChildRegisteredForTryoutFake(athleteId, tryoutId)) {
      return createServiceResponse(null, new Error('This athlete is already registered for the selected tryout.'))
    }

    const child = getChildById(athleteId)
    const familyId = child?.family_id ?? getFamiliesForUserId(getGuardianCanonicalUserId(context))[0]
    if (!familyId) return createServiceResponse(null, new Error('Could not determine family record for this athlete.'))

    const now = new Date().toISOString()
    const fakeRegistration = {
      id: `reg-${Date.now()}`,
      tryout_id: tryoutId,
      athlete_id: athleteId,
      status: 'registered',
      registered_by_user_id: context.userId,
      experience_level: null,
      notes_from_parent: null,
      check_in_time: null,
      created_at: now,
      updated_at: now,
    }
    fakeTryoutRegistrations.push(fakeRegistration as any)

    return createServiceResponse(
      {
        ...mapFakeRegistration(fakeRegistration),
        family_id: familyId,
      },
      null,
    )
  }

  try {
    const { data: registrationId, error } = await supabaseAny.rpc('register_child_for_tryout', {
      p_tryout_id: tryoutId,
      p_child_id: athleteId,
    })

    if (error) return createServiceResponse(null, toError(error, 'Could not complete tryout registration.'))
    if (!registrationId) return createServiceResponse(null, new Error('Registration could not be created.'))

    const { data: registration, error: fetchError } = await supabaseAny
      .from('tryout_registrations')
      .select(
        `
          id,
          tryout_id,
          athlete_id,
          family_id,
          status,
          notes,
          offer_deadline,
          created_at,
          updated_at,
          athlete:athletes(id, first_name, last_name)
        `,
      )
      .eq('id', registrationId)
      .single()

    if (fetchError || !registration) {
      return createServiceResponse(null, toError(fetchError, 'Registration was created but could not be loaded.'))
    }

    return createServiceResponse(mapRegistrationRow(registration), null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Could not complete tryout registration.'))
  }
}

export async function updateTryoutRegistrationStatus(
  _context: UserContext,
  registrationId: string,
  status: TryoutRegistrationStatus,
  notes?: string,
): Promise<ServiceResponse<TryoutRegistration | null>> {
  await maybeDelay()
  if (!registrationId) return createServiceResponse(null, new Error('Registration ID is required.'))
  if (!REGISTRATION_STATUSES.has(status)) {
    return createServiceResponse(null, new Error('Invalid registration status.'))
  }

  if (USE_FAKE_DATA) {
    const index = fakeTryoutRegistrations.findIndex((row) => row.id === registrationId)
    if (index < 0) return createServiceResponse(null, new Error('Registration not found.'))

    const existing = fakeTryoutRegistrations[index] as any
    existing.status = status
    if (typeof notes === 'string') existing.notes_from_parent = notes
    existing.updated_at = new Date().toISOString()

    return createServiceResponse(mapFakeRegistration(existing), null)
  }

  const payload: Record<string, unknown> = { status }
  if (typeof notes === 'string') payload.notes = notes

  try {
    const { data, error } = await supabaseAny
      .from('tryout_registrations')
      .update(payload)
      .eq('id', registrationId)
      .select(
        `
          id,
          tryout_id,
          athlete_id,
          family_id,
          status,
          notes,
          offer_deadline,
          created_at,
          updated_at,
          athlete:athletes(id, first_name, last_name)
        `,
      )
      .maybeSingle()

    if (error) return createServiceResponse(null, toError(error, 'Could not update registration status.'))
    if (!data) return createServiceResponse(null, new Error('Registration not found.'))

    return createServiceResponse(mapRegistrationRow(data), null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Could not update registration status.'))
  }
}

export async function getTryoutSessions(
  _context: UserContext,
  tryoutId: string,
): Promise<ServiceResponse<TryoutSession[]>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse([], new Error('Tryout ID is required.'))

  if (USE_FAKE_DATA) {
    const tryout = getFakeTryoutById(tryoutId)
    if (!tryout) return createServiceResponse([], null)

    return createServiceResponse(
      [
        {
          id: `session-${tryout.id}`,
          tryout_id: tryout.id,
          session_date: tryout.tryout_date,
          start_time: tryout.start_time,
          end_time: tryout.end_time ?? null,
          location: tryout.location ?? null,
          session_type: 'initial',
          capacity: tryout.max_participants ?? null,
          created_at: tryout.created_at,
          updated_at: tryout.updated_at,
        },
      ],
      null,
    )
  }

  try {
    const { data, error } = await supabaseAny
      .from(SESSION_TABLE)
      .select('*')
      .eq('tryout_id', tryoutId)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      if (isMissingRelationError(error)) {
        return createServiceResponse([], new Error('Tryout sessions are not available until migrations are applied.'))
      }
      return createServiceResponse([], toError(error, 'Failed to load tryout sessions.'))
    }

    return createServiceResponse((data ?? []).map(mapSessionRow), null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load tryout sessions.'))
  }
}

export async function replaceTryoutSessions(
  _context: UserContext,
  tryoutId: string,
  sessions: TryoutSession[],
): Promise<ServiceResponse<TryoutSession[]>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse([], new Error('Tryout ID is required.'))

  for (const session of sessions) {
    if (!session.session_date || !session.start_time) {
      return createServiceResponse([], new Error('Each tryout session requires a date and start time.'))
    }
  }

  if (USE_FAKE_DATA) {
    return createServiceResponse(sessions.map((session) => ({ ...session, tryout_id: tryoutId })), null)
  }

  try {
    const { error: deleteError } = await supabaseAny.from(SESSION_TABLE).delete().eq('tryout_id', tryoutId)
    if (deleteError) {
      if (isMissingRelationError(deleteError)) {
        return createServiceResponse([], new Error('Tryout sessions are not available until migrations are applied.'))
      }
      return createServiceResponse([], toError(deleteError, 'Could not update tryout sessions.'))
    }

    if (sessions.length === 0) return createServiceResponse([], null)

    const payload = sessions.map((session) => ({
      tryout_id: tryoutId,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time ?? null,
      location: session.location ?? null,
      session_type: session.session_type ?? 'initial',
      capacity: typeof session.capacity === 'number' ? session.capacity : null,
    }))

    const { data, error } = await supabaseAny.from(SESSION_TABLE).insert(payload).select('*')
    if (error) return createServiceResponse([], toError(error, 'Could not save tryout sessions.'))

    return createServiceResponse((data ?? []).map(mapSessionRow), null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Could not save tryout sessions.'))
  }
}

export async function getTryoutEvaluators(
  _context: UserContext,
  tryoutId: string,
): Promise<ServiceResponse<TryoutEvaluator[]>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse([], new Error('Tryout ID is required.'))

  if (USE_FAKE_DATA) return createServiceResponse([], null)

  try {
    const { data, error } = await supabaseAny
      .from(EVALUATOR_TABLE)
      .select(
        `
          id,
          tryout_id,
          coach_id,
          assigned_at,
          coach:users!tryout_evaluators_coach_id_fkey(id, first_name, last_name, email)
        `,
      )
      .eq('tryout_id', tryoutId)
      .order('assigned_at', { ascending: true })

    if (error) {
      if (isMissingRelationError(error)) {
        return createServiceResponse([], new Error('Tryout evaluator assignments are not available until migrations are applied.'))
      }
      return createServiceResponse([], toError(error, 'Failed to load evaluator assignments.'))
    }

    const mapped = (data ?? []).map((row: any) => ({
      id: String(row.id),
      tryout_id: String(row.tryout_id),
      coach_id: String(row.coach_id),
      assigned_at: row.assigned_at ?? null,
      coach: row.coach
        ? {
            id: String(row.coach.id),
            first_name: String(row.coach.first_name ?? ''),
            last_name: String(row.coach.last_name ?? ''),
            email: row.coach.email ?? null,
          }
        : undefined,
    }))

    return createServiceResponse(mapped, null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load evaluator assignments.'))
  }
}

export async function assignTryoutEvaluator(
  _context: UserContext,
  tryoutId: string,
  coachId: string,
): Promise<ServiceResponse<TryoutEvaluator | null>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse(null, new Error('Tryout ID is required.'))
  if (!coachId) return createServiceResponse(null, new Error('Coach ID is required.'))

  if (USE_FAKE_DATA) {
    return createServiceResponse(
      {
        id: `eval-${Date.now()}`,
        tryout_id: tryoutId,
        coach_id: coachId,
        assigned_at: new Date().toISOString(),
      },
      null,
    )
  }

  try {
    const { data, error } = await supabaseAny
      .from(EVALUATOR_TABLE)
      .insert({ tryout_id: tryoutId, coach_id: coachId })
      .select('id, tryout_id, coach_id, assigned_at')
      .single()

    if (error || !data) {
      if (isMissingRelationError(error)) {
        return createServiceResponse(null, new Error('Tryout evaluator assignments are not available until migrations are applied.'))
      }
      return createServiceResponse(null, toError(error, 'Could not assign evaluator to this tryout.'))
    }

    return createServiceResponse(
      {
        id: String(data.id),
        tryout_id: String(data.tryout_id),
        coach_id: String(data.coach_id),
        assigned_at: data.assigned_at ?? null,
      },
      null,
    )
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Could not assign evaluator to this tryout.'))
  }
}

export async function removeTryoutEvaluator(
  _context: UserContext,
  tryoutId: string,
  coachId: string,
): Promise<ServiceResponse<boolean>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse(false, new Error('Tryout ID is required.'))
  if (!coachId) return createServiceResponse(false, new Error('Coach ID is required.'))

  if (USE_FAKE_DATA) return createServiceResponse(true, null)

  try {
    const { error } = await supabaseAny.from(EVALUATOR_TABLE).delete().eq('tryout_id', tryoutId).eq('coach_id', coachId)
    if (error) {
      if (isMissingRelationError(error)) {
        return createServiceResponse(false, new Error('Tryout evaluator assignments are not available until migrations are applied.'))
      }
      return createServiceResponse(false, toError(error, 'Could not remove evaluator assignment.'))
    }
    return createServiceResponse(true, null)
  } catch (error) {
    return createServiceResponse(false, toError(error, 'Could not remove evaluator assignment.'))
  }
}

export async function getCoachAssignedTryouts(
  context: UserContext,
  orgId?: string,
): Promise<ServiceResponse<Tryout[]>> {
  await maybeDelay()

  const resolvedOrgId = resolveOrgId(context, orgId)
  if (!resolvedOrgId) return createServiceResponse([], new Error('Organization is required to load coach assignments.'))

  if (USE_FAKE_DATA) {
    const rows = getFakeTryoutsForOrg(resolvedOrgId)
      .map(mapFakeTryout)
      .filter((tryout) => tryout.status === 'open' || tryout.status === 'closed')
    return createServiceResponse(rows, null)
  }

  try {
    const { data, error } = await supabaseAny
      .from(EVALUATOR_TABLE)
      .select('tryout:tryouts!inner(*)')
      .eq('coach_id', context.userId)
      .eq('tryout.org_id', resolvedOrgId)

    if (error) {
      if (isMissingRelationError(error)) {
        return createServiceResponse([], new Error('Tryout evaluator assignments are not available until migrations are applied.'))
      }
      return createServiceResponse([], toError(error, 'Failed to load assigned tryouts.'))
    }

    const mapped = (data ?? [])
      .map((row: any) => row.tryout)
      .filter((value: unknown) => Boolean(value))
      .map(mapTryoutRow)

    return createServiceResponse(mapped, null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load assigned tryouts.'))
  }
}

export async function upsertTryoutEvaluation(
  context: UserContext,
  input: CreateTryoutEvaluationInput,
): Promise<ServiceResponse<TryoutEvaluation | null>> {
  await maybeDelay()

  if (!input.registrationId) return createServiceResponse(null, new Error('Registration ID is required.'))
  if (!Number.isFinite(input.score) || input.score < 1 || input.score > 10) {
    return createServiceResponse(null, new Error('Evaluation score must be a number between 1 and 10.'))
  }

  const category = input.category?.trim() || 'overall'

  if (USE_FAKE_DATA) {
    const now = new Date().toISOString()
    const id = `score-${Date.now()}`
    fakeTryoutEvaluations.push({
      id,
      registration_id: input.registrationId,
      evaluated_by_user_id: context.userId,
      decision: 'pending',
      skill_score: input.score,
      athleticism_score: input.score,
      attitude_score: input.score,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    } as any)

    return createServiceResponse(
      {
        id,
        registration_id: input.registrationId,
        coach_id: context.userId,
        category,
        score: input.score,
        notes: input.notes ?? null,
        session_id: input.sessionId ?? null,
        created_at: now,
        updated_at: now,
      },
      null,
    )
  }

  try {
    const { data: existing } = await supabaseAny
      .from('tryout_scores')
      .select('id')
      .eq('registration_id', input.registrationId)
      .eq('coach_id', context.userId)
      .eq('category', category)
      .maybeSingle()

    const payload = {
      registration_id: input.registrationId,
      coach_id: context.userId,
      category,
      score: Math.round(input.score),
      notes: input.notes ?? null,
      session_id: input.sessionId ?? null,
    }

    let response: any
    if (existing?.id) {
      response = await supabaseAny.from('tryout_scores').update(payload).eq('id', existing.id).select('*').single()
    } else {
      response = await supabaseAny.from('tryout_scores').insert(payload).select('*').single()
    }

    const { data, error } = response
    if (error || !data) {
      if (isMissingRelationError(error)) {
        return createServiceResponse(null, new Error('Tryout evaluations are not available until migrations are applied.'))
      }
      return createServiceResponse(null, toError(error, 'Could not save tryout evaluation.'))
    }

    return createServiceResponse(mapEvaluationRow(data), null)
  } catch (error) {
    return createServiceResponse(null, toError(error, 'Could not save tryout evaluation.'))
  }
}

export async function getTryoutEvaluations(
  _context: UserContext,
  tryoutId: string,
): Promise<ServiceResponse<TryoutEvaluation[]>> {
  await maybeDelay()
  if (!tryoutId) return createServiceResponse([], new Error('Tryout ID is required.'))

  if (USE_FAKE_DATA) {
    const registrations = fakeTryoutRegistrations.filter((row) => row.tryout_id === tryoutId)
    const registrationIds = new Set(registrations.map((row) => row.id))
    const mapped = fakeTryoutEvaluations
      .filter((row) => registrationIds.has(row.registration_id))
      .map((row) => ({
        id: row.id,
        registration_id: row.registration_id,
        coach_id: row.evaluated_by_user_id,
        category: 'overall',
        score: Number(row.skill_score ?? 0),
        notes: row.notes ?? null,
        session_id: null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      }))
    return createServiceResponse(mapped, null)
  }

  try {
    const { data, error } = await supabaseAny
      .from('tryout_scores')
      .select(
        `
          id,
          registration_id,
          coach_id,
          category,
          score,
          notes,
          session_id,
          created_at,
          updated_at,
          registration:tryout_registrations!inner(
            id,
            athlete_id,
            tryout_id,
            athlete:athletes(id, first_name, last_name)
          )
        `,
      )
      .eq('registration.tryout_id', tryoutId)
      .order('created_at', { ascending: false })

    if (error) return createServiceResponse([], toError(error, 'Failed to load tryout evaluations.'))
    return createServiceResponse((data ?? []).map(mapEvaluationRow), null)
  } catch (error) {
    return createServiceResponse([], toError(error, 'Failed to load tryout evaluations.'))
  }
}

export async function getAdminTryoutDashboardStats(
  context: UserContext,
  orgId?: string,
): Promise<ServiceResponse<TryoutDashboardStats | null>> {
  const resolvedOrgId = resolveOrgId(context, orgId)
  if (!resolvedOrgId) {
    return createServiceResponse(null, new Error('Organization is required to load tryout dashboard stats.'))
  }

  const tryoutsResponse = await getTryouts(context, resolvedOrgId)
  if (tryoutsResponse.error) return createServiceResponse(null, tryoutsResponse.error)

  const tryouts = tryoutsResponse.data ?? []
  const activeTryouts = tryouts.filter((row) => row.status === 'open' || row.status === 'draft').length
  const upcomingTryouts = tryouts
    .filter((row) => row.status === 'open' || row.status === 'draft')
    .sort((a, b) => (a.tryout_date ?? '').localeCompare(b.tryout_date ?? ''))
    .slice(0, 3)

  const registrations = await getTryoutRegistrations(context)
  if (registrations.error) return createServiceResponse(null, registrations.error)
  const registrationRows = registrations.data ?? []
  const pendingRegistrations = registrationRows.filter((row) => row.status === 'registered' || row.status === 'waitlisted').length

  let upcomingSessions = 0
  if (!USE_FAKE_DATA) {
    const today = new Date().toISOString().slice(0, 10)
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const { data: sessionRows } = await supabaseAny
      .from(SESSION_TABLE)
      .select('id, tryout_id, session_date')
      .gte('session_date', today)
      .lte('session_date', nextWeek)
      .in('tryout_id', tryouts.map((item) => item.id))
    upcomingSessions = Array.isArray(sessionRows) ? sessionRows.length : 0
  }

  let incompleteEvaluations = 0
  if (tryouts.length > 0) {
    const adminRegs = await Promise.all(tryouts.map((tryout) => getAdminTryoutRegistrations(context, tryout.id)))
    const registrationsForOrg = adminRegs.flatMap((response) => response.data ?? [])
    const evaluated = await Promise.all(tryouts.map((tryout) => getTryoutEvaluations(context, tryout.id)))
    const evaluatedRegistrationIds = new Set(
      evaluated.flatMap((response) => (response.data ?? []).map((evaluation) => evaluation.registration_id)),
    )
    incompleteEvaluations = registrationsForOrg.filter((registration) => !evaluatedRegistrationIds.has(registration.id)).length
  }

  return createServiceResponse(
    {
      activeTryouts,
      upcomingSessions,
      pendingRegistrations,
      incompleteEvaluations,
      upcomingTryouts,
    },
    null,
  )
}

export async function getGuardianTryoutDashboardStats(
  context: UserContext,
  orgId?: string,
): Promise<ServiceResponse<GuardianTryoutStats | null>> {
  const resolvedOrgId = resolveOrgId(context, orgId)
  if (!resolvedOrgId) {
    return createServiceResponse(null, new Error('Organization is required to load guardian tryout stats.'))
  }

  const [tryoutsResponse, registrationsResponse] = await Promise.all([
    getTryouts(context, resolvedOrgId, { status: 'open' }),
    getTryoutRegistrations(context),
  ])

  if (tryoutsResponse.error) return createServiceResponse(null, tryoutsResponse.error)
  if (registrationsResponse.error) return createServiceResponse(null, registrationsResponse.error)

  return createServiceResponse(
    {
      openTryouts: (tryoutsResponse.data ?? []).length,
      myRegistrations: (registrationsResponse.data ?? []).length,
    },
    null,
  )
}

export async function getCoachTryoutDashboardStats(
  context: UserContext,
  orgId?: string,
): Promise<ServiceResponse<CoachTryoutStats | null>> {
  const assignmentsResponse = await getCoachAssignedTryouts(context, orgId)
  if (assignmentsResponse.error) return createServiceResponse(null, assignmentsResponse.error)

  let pendingEvaluations = 0
  for (const tryout of assignmentsResponse.data ?? []) {
    const regsResponse = await getAdminTryoutRegistrations(context, tryout.id)
    if (regsResponse.error) return createServiceResponse(null, regsResponse.error)

    const evalsResponse = await getTryoutEvaluations(context, tryout.id)
    if (evalsResponse.error) return createServiceResponse(null, evalsResponse.error)

    const evaluatedRegistrationIds = new Set(
      (evalsResponse.data ?? []).filter((evaluation) => evaluation.coach_id === context.userId).map((evaluation) => evaluation.registration_id),
    )
    pendingEvaluations += (regsResponse.data ?? []).filter((registration) => !evaluatedRegistrationIds.has(registration.id)).length
  }

  return createServiceResponse(
    {
      assignments: (assignmentsResponse.data ?? []).length,
      pendingEvaluations,
    },
    null,
  )
}

export async function canAthleteRegisterForTryout(
  context: UserContext,
  tryoutId: string,
  athleteId: string,
): Promise<ServiceResponse<boolean>> {
  if (!tryoutId) return createServiceResponse(false, new Error('Tryout ID is required.'))
  if (!athleteId) return createServiceResponse(false, new Error('Athlete ID is required.'))

  if (USE_FAKE_DATA) {
    const guardianId = getGuardianCanonicalUserId(context)
    const allowedChildren = new Set(getChildrenForUserId(guardianId))
    if (!allowedChildren.has(athleteId)) {
      return createServiceResponse(false, new Error('You can only register athletes linked to your account.'))
    }
    return createServiceResponse(!isChildRegisteredForTryoutFake(athleteId, tryoutId), null)
  }

  const registrations = await getTryoutRegistrations(context, tryoutId)
  if (registrations.error) return createServiceResponse(false, registrations.error)

  const alreadyRegistered = (registrations.data ?? []).some(
    (registration) => registration.athlete_id === athleteId && registration.status !== 'withdrawn',
  )
  return createServiceResponse(!alreadyRegistered, null)
}

export async function getAthleteEligibleTryouts(
  context: UserContext,
  athleteId: string,
): Promise<ServiceResponse<Tryout[]>> {
  if (!athleteId) return createServiceResponse([], new Error('Athlete ID is required.'))

  const orgId = resolveOrgId(context)
  if (!orgId) return createServiceResponse([], new Error('Organization is required to load eligible tryouts.'))

  const tryoutsResponse = await getTryouts(context, orgId, { status: 'open' })
  if (tryoutsResponse.error) return createServiceResponse([], tryoutsResponse.error)

  const results: Tryout[] = []
  for (const tryout of tryoutsResponse.data ?? []) {
    const eligibility = await canAthleteRegisterForTryout(context, tryout.id, athleteId)
    if (!eligibility.error && eligibility.data) results.push(tryout)
  }

  return createServiceResponse(results, null)
}

export async function isAthleteRegisteredForTryout(
  context: UserContext,
  tryoutId: string,
  athleteId: string,
): Promise<ServiceResponse<boolean>> {
  if (!tryoutId) return createServiceResponse(false, new Error('Tryout ID is required.'))
  if (!athleteId) return createServiceResponse(false, new Error('Athlete ID is required.'))

  if (USE_FAKE_DATA) {
    return createServiceResponse(isChildRegisteredForTryoutFake(athleteId, tryoutId), null)
  }

  const registrations = await getTryoutRegistrations(context, tryoutId)
  if (registrations.error) return createServiceResponse(false, registrations.error)

  const isRegistered = (registrations.data ?? []).some(
    (registration) => registration.athlete_id === athleteId && registration.status !== 'withdrawn',
  )
  return createServiceResponse(isRegistered, null)
}

export async function getRegistrationsForAthlete(
  context: UserContext,
  athleteId: string,
): Promise<ServiceResponse<TryoutRegistration[]>> {
  if (!athleteId) return createServiceResponse([], new Error('Athlete ID is required.'))

  if (USE_FAKE_DATA) {
    return createServiceResponse(getFakeRegistrationsForChild(athleteId).map(mapFakeRegistration), null)
  }

  const registrations = await getTryoutRegistrations(context)
  if (registrations.error) return createServiceResponse([], registrations.error)
  return createServiceResponse(
    (registrations.data ?? []).filter((registration) => registration.athlete_id === athleteId),
    null,
  )
}
