import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'

export interface Tryout {
    id: string
    title: string
    description: string | null
    org_id: string
    start_at: string | null
    tryout_date: string | null
    start_time: string | null
    location: string | null
    age_group: string
    entry_fee: number
    status: 'open' | 'closed' | 'cancelled'
    type: string | null
}

export interface TryoutRegistration {
    id: string
    tryout_id: string
    child_id: string
    status: 'registered' | 'attended' | 'offered' | 'accepted' | 'declined'
    offer_deadline: string | null
    notes: string | null
    child?: {
        first_name: string
        last_name: string
    }
    tryout?: Tryout
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts any error to a standard Error object
 */
function toServiceError(err: unknown): Error {
    if (err instanceof Error) {
        return err
    }
    // Check if it's a PostgrestError (Supabase error)
    if (err && typeof err === 'object' && 'message' in err) {
        return new Error(String((err as { message: unknown }).message))
    }
    return new Error(String(err))
}

/**
 * Gets tryout start time from either new start_at column or legacy tryout_date + start_time
 */
function getTryoutStartTime(dbRow: any): string | null {
    // Prefer new start_at column
    if (dbRow.start_at) {
        return dbRow.start_at
    }
    // Fall back to legacy columns
    if (dbRow.tryout_date && dbRow.start_time) {
        // Construct UTC timestamptz from legacy fields
        const dateStr = `${dbRow.tryout_date}T${dbRow.start_time}Z`
        return new Date(dateStr).toISOString()
    }
    return null
}

/**
 * Derives tryout status from dates (no capacity check for performance)
 */
function deriveTryoutStatus(dbRow: any): 'open' | 'closed' | 'cancelled' {
    const now = new Date()
    
    // Check start_at first
    if (dbRow.start_at) {
        const startAt = new Date(dbRow.start_at)
        if (startAt < now) {
            return 'closed'
        }
        return 'open'
    }
    
    // Fall back to legacy tryout_date
    if (dbRow.tryout_date) {
        const tryoutDate = new Date(dbRow.tryout_date)
        if (tryoutDate < now) {
            return 'closed'
        }
        return 'open'
    }
    
    // Default to open if no dates available
    return 'open'
}

/**
 * Maps database tryout row to service Tryout interface
 */
function mapDbTryoutToService(dbRow: any): Tryout {
    const startAt = getTryoutStartTime(dbRow)
    const status = deriveTryoutStatus(dbRow)
    
    return {
        id: dbRow.id,
        title: dbRow.name ?? dbRow.title ?? 'Tryout',
        description: dbRow.notes ?? dbRow.description ?? null,
        org_id: dbRow.org_id,
        start_at: startAt,
        tryout_date: dbRow.tryout_date ?? null,
        start_time: dbRow.start_time ?? null,
        location: dbRow.location ?? null,
        age_group: dbRow.age_group ?? '',
        entry_fee: dbRow.entry_fee ?? 0,
        status,
        type: dbRow.type ?? null,
    }
}

/**
 * Maps database registration status enum to service union type
 */
function mapRegistrationStatus(dbStatus: string): 'registered' | 'attended' | 'offered' | 'accepted' | 'declined' {
    // Map 'checked_in' to 'attended' for backward compatibility
    if (dbStatus === 'checked_in') {
        return 'attended'
    }
    // Map other statuses that match
    if (dbStatus === 'registered' || dbStatus === 'attended' || dbStatus === 'offered' || 
        dbStatus === 'accepted' || dbStatus === 'declined') {
        return dbStatus as 'registered' | 'attended' | 'offered' | 'accepted' | 'declined'
    }
    // Default to registered for unknown statuses
    return 'registered'
}

/**
 * Maps database registration row to service TryoutRegistration interface
 */
function mapDbRegistrationToService(dbRow: any): TryoutRegistration {
    // Map athlete_id to child_id
    const childId = dbRow.athlete_id ?? dbRow.child_id
    
    // Map nested athlete join to child
    const child = dbRow.athlete ? {
        first_name: dbRow.athlete.first_name ?? '',
        last_name: dbRow.athlete.last_name ?? '',
    } : undefined
    
    // Map nested tryout if present
    const tryout = dbRow.tryout ? mapDbTryoutToService(dbRow.tryout) : undefined
    
    return {
        id: dbRow.id,
        tryout_id: dbRow.tryout_id,
        child_id: childId,
        status: mapRegistrationStatus(dbRow.status ?? 'registered'),
        offer_deadline: dbRow.offer_deadline ?? null,
        notes: dbRow.notes ?? null,
        child,
        tryout,
    }
}

const MOCK_TRYOUTS: Tryout[] = [
    {
        id: 'tryout-1',
        title: 'U12 Competitive Tryouts',
        description: 'Annual tryouts for the competitive season.',
        org_id: 'org-1',
        start_at: '2025-05-15T09:00:00Z',
        tryout_date: '2025-05-15',
        start_time: '09:00',
        location: 'Main Complex Field 1',
        age_group: 'U12',
        entry_fee: 2500,
        status: 'open',
        type: 'Tryout'
    },
    {
        id: 'tryout-2',
        title: 'U14 Elite Tryouts',
        description: 'Elite squad selection.',
        org_id: 'org-1',
        start_at: '2025-05-16T10:00:00Z',
        tryout_date: '2025-05-16',
        start_time: '10:00',
        location: 'Main Complex Field 2',
        age_group: 'U14',
        entry_fee: 3000,
        status: 'open',
        type: 'Tryout'
    }
]

async function simulateDelay() {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

export async function getTryouts(
    _context: UserContext,
    _orgId?: string
): Promise<{ data: Tryout[]; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { data: MOCK_TRYOUTS, error: null }

    try {
        const orgId = _orgId ?? _context.orgId
        if (!orgId) {
            return { data: [], error: new Error('Organization ID is required') }
        }

        const { data, error } = await supabase
            .from('tryouts')
            .select('*')
            .eq('org_id', orgId)
            .order('tryout_date', { ascending: true })
            .order('start_at', { ascending: true })

        if (error) throw error

        const mapped = (data || []).map(mapDbTryoutToService)
        return { data: mapped, error: null }
    } catch (err) {
        console.error('getTryouts error:', err)
        return { data: [], error: toServiceError(err) }
    }
}

export async function getTryoutById(
    _context: UserContext,
    tryoutId: string
): Promise<{ data: Tryout | null; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) {
        const found = MOCK_TRYOUTS.find(t => t.id === tryoutId)
        return { data: found || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('tryouts')
            .select('*')
            .eq('id', tryoutId)
            .single()

        if (error) throw error
        if (!data) return { data: null, error: null }

        const mapped = mapDbTryoutToService(data)
        return { data: mapped, error: null }
    } catch (err) {
        console.error('getTryoutById error:', err)
        return { data: null, error: toServiceError(err) }
    }
}

export async function getTryoutRegistrations(
    _context: UserContext
): Promise<{ data: TryoutRegistration[]; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { data: [], error: null }

    try {
        const { data, error } = await supabase
            .from('tryout_registrations')
            .select('*, athlete:athletes(first_name, last_name)')

        if (error) throw error

        const mapped = (data || []).map(mapDbRegistrationToService)
        return { data: mapped, error: null }
    } catch (err) {
        console.error('getTryoutRegistrations error:', err)
        return { data: [], error: toServiceError(err) }
    }
}

export async function registerAthleteForTryout(
    _context: UserContext,
    _tryoutId: string,
    _childId: string
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { error: null }

    try {
        // Use RPC for atomic registration with capacity/deadline checks
        const { error } = await supabase.rpc('register_child_for_tryout', {
            p_tryout_id: _tryoutId,
            p_child_id: _childId,
        })

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('registerChildForTryout error:', err)
        return { error: toServiceError(err) }
    }
}

export async function createTryout(
    _context: UserContext,
    tryout: Partial<Tryout>
): Promise<{ data: Tryout | null; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { data: { ...MOCK_TRYOUTS[0], ...tryout }, error: null }

    try {
        const orgId = tryout.org_id ?? _context.orgId
        if (!orgId) {
            return { data: null, error: new Error('Organization ID is required') }
        }

        // Map service interface to database columns
        const insertRow: any = {
            title: tryout.title ?? 'Tryout',
            name: tryout.title ?? 'Tryout', // Set name = title if not provided
            org_id: orgId,
            location: tryout.location ?? null,
            age_group: tryout.age_group ?? null,
            entry_fee: tryout.entry_fee ?? 0,
            notes: tryout.description ?? null,
            // Use new start_at if provided, otherwise leave null (don't construct from legacy fields on insert)
            start_at: tryout.start_at ?? null,
            // Legacy fields - only set if explicitly provided
            tryout_date: tryout.tryout_date ?? null,
            start_time: tryout.start_time ?? null,
        }

        // Map type enum if provided
        if (tryout.type) {
            insertRow.type = tryout.type
        }

        const { data, error } = await supabase
            .from('tryouts')
            .insert(insertRow)
            .select('*')
            .single()

        if (error) throw error
        if (!data) return { data: null, error: new Error('Failed to create tryout') }

        const mapped = mapDbTryoutToService(data)
        return { data: mapped, error: null }
    } catch (err) {
        console.error('createTryout error:', err)
        return { data: null, error: toServiceError(err) }
    }
}

export async function getAdminTryoutRegistrations(
    _context: UserContext,
    _tryoutId: string
): Promise<{ data: TryoutRegistration[]; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { data: [], error: null }

    try {
        const { data, error } = await supabase
            .from('tryout_registrations')
            .select('*, athlete:athletes(first_name, last_name)')
            .eq('tryout_id', _tryoutId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const mapped = (data || []).map(mapDbRegistrationToService)
        return { data: mapped, error: null }
    } catch (err) {
        console.error('getAdminTryoutRegistrations error:', err)
        return { data: [], error: toServiceError(err) }
    }
}
