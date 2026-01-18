import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'

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
    if (!USE_FAKE_DATA) return { data: [], error: null }
    return { data: MOCK_TRYOUTS, error: null }
}

export async function getTryoutById(
    _context: UserContext,
    tryoutId: string
): Promise<{ data: Tryout | null; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: null, error: null }
    const found = MOCK_TRYOUTS.find(t => t.id === tryoutId)
    return { data: found || null, error: null }
}

export async function getTryoutRegistrations(
    _context: UserContext
): Promise<{ data: TryoutRegistration[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null }
    // Mock some registrations if needed, return empty for now
    return { data: [], error: null }
}

export async function registerChildForTryout(
    _context: UserContext,
    _tryoutId: string,
    _childId: string
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { error: null }
    return { error: null }
}

export async function createTryout(
    _context: UserContext,
    tryout: Partial<Tryout>
): Promise<{ data: Tryout | null; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: null, error: null }
    return { data: { ...MOCK_TRYOUTS[0], ...tryout }, error: null }
}

export async function getAdminTryoutRegistrations(
    _context: UserContext,
    _tryoutId: string
): Promise<{ data: TryoutRegistration[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null }
    return { data: [], error: null }
}
