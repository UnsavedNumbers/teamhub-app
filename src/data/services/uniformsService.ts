import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'

export interface UniformKit {
    id: string
    team_id: string
    season_id: string
    name: string
    deadline_at: string | null
    locked_at: string | null
}

export interface UniformKitItem {
    id: string
    kit_id: string
    name: string
    required: boolean
    size_options: string[]
    sort_order: number
}

export interface UniformSubmission {
    id: string
    kit_id: string
    child_id: string
    status: 'not_submitted' | 'submitted' | 'locked' | 'fulfilled'
    submitted_at: string | null
    locked_at: string | null
    fulfilled_at: string | null
    items?: UniformSubmissionItem[]
}

export interface UniformSubmissionItem {
    item_id: string
    size: string
}

const MOCK_KITS: UniformKit[] = [
    {
        id: 'kit-1',
        team_id: 'team-1',
        season_id: 'season-1',
        name: 'Fall 2025 Match Kit',
        deadline_at: '2025-09-01T00:00:00Z',
        locked_at: null
    }
]

const MOCK_ITEMS: UniformKitItem[] = [
    {
        id: 'item-1',
        kit_id: 'kit-1',
        name: 'Home Jersey',
        required: true,
        size_options: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL'],
        sort_order: 1
    },
    {
        id: 'item-2',
        kit_id: 'kit-1',
        name: 'Home Shorts',
        required: true,
        size_options: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL'],
        sort_order: 2
    }
]

async function simulateDelay() {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

export async function getUniformKits(
    context: UserContext,
    teamIds: string[]
): Promise<{ data: UniformKit[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null } // TODO: Implement real Supabase query
    return { data: MOCK_KITS.filter(k => teamIds.includes(k.team_id)), error: null }
}

export async function getUniformKitItems(
    context: UserContext,
    kitIds: string[]
): Promise<{ data: UniformKitItem[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null }
    return { data: MOCK_ITEMS.filter(i => kitIds.includes(i.kit_id)), error: null }
}

export async function getUniformSubmissions(
    context: UserContext,
    kitIds: string[],
    childIds: string[]
): Promise<{ data: UniformSubmission[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null }
    return { data: [], error: null }
}

export async function submitUniformSizes(
    context: UserContext,
    kitId: string,
    childId: string,
    items: { item_id: string, size: string }[]
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { error: null }
    return { error: null }
}

export async function getAllUniformSubmissions(
    context: UserContext
): Promise<{ data: any[]; error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { data: [], error: null }
    // Mock admin view data
    return { data: [], error: null }
}
