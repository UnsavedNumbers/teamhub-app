import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

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
        const { data, error } = await supabase
            .from('tryouts')
            .select('*')
            .eq('org_id', orgId)
            .order('tryout_date', { ascending: true })

        if (error) throw error
        return { data: (data as unknown) as Tryout[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch tryouts') }
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
        return { data: (data as unknown) as Tryout, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch tryout') }
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
            .select('*, child:athletes(id, first_name, last_name), tryout:tryouts(*)')

        if (error) throw error
        return { data: (data as unknown) as TryoutRegistration[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch registrations') }
    }
}

export async function registerChildForTryout(
    _context: UserContext,
    _tryoutId: string,
    _childId: string
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { error: null }

    try {
        const { data: childRow, error: childErr } = await supabase
            .from('athletes')
            .select('family_id')
            .eq('id', _childId)
            .single()

        if (childErr) throw childErr

        const { error } = await supabase
            .from('tryout_registrations')
            .insert({
                tryout_id: _tryoutId,
                athlete_id: _childId,
                family_id: childRow?.family_id ?? '',
                status: 'registered',
            } satisfies Database['public']['Tables']['tryout_registrations']['Insert'])

        if (error) throw error
        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Failed to register child for tryout') }
    }
}

export async function createTryout(
    _context: UserContext,
    tryout: Partial<Tryout>
): Promise<{ data: Tryout | null; error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { data: { ...MOCK_TRYOUTS[0], ...tryout }, error: null }

    try {
        const insertRow: Database['public']['Tables']['tryouts']['Insert'] = {
            title: tryout.title ?? 'Tryout',
            org_id: tryout.org_id ?? _context.orgId,
            tryout_date: tryout.tryout_date ?? new Date().toISOString().slice(0, 10),
            start_time: tryout.start_time ?? '09:00',
            end_time: tryout.end_time ?? null,
            location: tryout.location ?? 'TBD',
            age_group: tryout.age_group ?? 'U12',
            entry_fee: tryout.entry_fee ?? 0,
            sport: tryout.type ?? 'general',
            requirements: null,
            what_to_bring: null,
            max_spots: null,
        }

        const { data, error } = await supabase
            .from('tryouts')
            .insert(insertRow)
            .select('*')
            .single()

        if (error) throw error
        return { data: (data as unknown) as Tryout, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Failed to create tryout') }
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
            .select('*, child:athletes(id, first_name, last_name), tryout:tryouts(*)')
            .eq('tryout_id', _tryoutId)

        if (error) throw error
        return { data: (data as unknown) as TryoutRegistration[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch admin registrations') }
    }
}
