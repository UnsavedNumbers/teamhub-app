import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import type { Database, Json } from '../../lib/database.types'
import {
    fakeUniformKits,
    fakeUniformItems,
    fakeUniformSubmissions,
    getUniformKitsForOrg,
    type FakeUniformKit,
    type FakeUniformItem,
    type FakeUniformSubmission,
    type FakeUniformSizeSelection,
    fakeUniformSizeSelections
} from '../fake/fakeUniforms'

// Re-export types
export type UniformKit = FakeUniformKit
export type UniformItem = FakeUniformItem
export type UniformSubmission = FakeUniformSubmission
export type UniformSizeSelection = FakeUniformSizeSelection

async function simulateDelay() {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

/**
 * Get uniform kits available for the organization/teams
 */
export async function getUniformKits(
    context: UserContext,
    teamIds?: string[]
): Promise<{ data: UniformKit[]; error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        let kits = getUniformKitsForOrg(context.orgId)
        if (teamIds && teamIds.length > 0) {
            kits = kits.filter(k => !k.team_id || teamIds.includes(k.team_id))
        }
        return { data: kits, error: null }
    }

    try {
        let query = supabase
            .from('uniform_kits')
            .select('*, team:teams(org_id)')
            .order('created_at', { ascending: false })

        if (teamIds && teamIds.length > 0) {
            query = query.in('team_id', teamIds)
        }

        const { data, error } = await query
        if (error) throw error

        const filtered = (data ?? []).filter((row: any) => !row.team || row.team.org_id === context.orgId)
        return { data: (filtered as unknown) as UniformKit[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch uniform kits') }
    }
}

/**
 * Get items for specific kits
 */
export async function getUniformKitItems(
    _context: UserContext,
    kitIds: string[]
): Promise<{ data: UniformItem[]; error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        const items = fakeUniformItems.filter(i => kitIds.includes(i.kit_id))
        return { data: items, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('uniform_kit_items')
            .select('*')
            .in('kit_id', kitIds)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return { data: (data as unknown) as UniformItem[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch kit items') }
    }
}

/**
 * Get submissions for the user (or specific children)
 */
export async function getUniformSubmissions(
    _context: UserContext,
    childIds?: string[]
): Promise<{ data: UniformSubmission[]; error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        let submissions = fakeUniformSubmissions
        if (childIds && childIds.length > 0) {
            submissions = submissions.filter(s => childIds.includes(s.child_id))
        }
        return { data: submissions, error: null }
    }

    try {
        let query = supabase
            .from('uniform_submissions')
            .select('*, items:uniform_submission_items(*)')

        if (childIds && childIds.length > 0) {
            query = query.in('child_id', childIds)
        }

        const { data, error } = await query
        if (error) throw error

        return { data: (data as unknown) as UniformSubmission[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch submissions') }
    }
}

/**
 * Get all uniform submissions for the organization (admin view)
 * Returns all submissions across all kits in the org, not filtered by childIds
 */
export async function getAllUniformSubmissions(
    context: UserContext
): Promise<{ data: UniformSubmission[]; error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        const orgKits = fakeUniformKits.filter(k => k.org_id === context.orgId)
        const orgKitIds = orgKits.map(k => k.id)
        const submissions = fakeUniformSubmissions.filter(s => orgKitIds.includes(s.kit_id))
        return { data: submissions, error: null }
    }

    try {
        // Get kits scoped to org first
        const { data: kits, error: kitError } = await supabase
            .from('uniform_kits')
            .select('id')
            .eq('org_id', context.orgId)

        if (kitError) throw kitError
        const kitIds = (kits ?? []).map(k => k.id)
        if (kitIds.length === 0) return { data: [], error: null }

        const { data, error } = await supabase
            .from('uniform_submissions')
            .select('*, items:uniform_submission_items(*)')
            .in('kit_id', kitIds)

        if (error) throw error
        return { data: (data as unknown) as UniformSubmission[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch org submissions') }
    }
}

/**
 * Get size selections for a submission
 */
export async function getUniformSizeSelections(
    _context: UserContext,
    submissionId: string
): Promise<{ data: UniformSizeSelection[]; error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        const selections = fakeUniformSizeSelections.filter(s => s.submission_id === submissionId)
        return { data: selections, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('uniform_submission_items')
            .select('*')
            .eq('submission_id', submissionId)

        if (error) throw error
        return { data: (data as unknown) as UniformSizeSelection[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch size selections') }
    }
}

/**
 * Submit uniform sizes
 */
export async function submitUniformSizes(
    _context: UserContext,
    kitId: string,
    childId: string,
    items: { item_id: string, size: string }[]
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (USE_FAKE_DATA) return { error: null }

    try {
        // Upsert submission header
        const { data: existing, error: fetchError } = await supabase
            .from('uniform_submissions')
            .select('id')
            .eq('kit_id', kitId)
            .eq('child_id', childId)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        const now = new Date().toISOString()
        const { data: submission, error: upsertError } = await supabase
            .from('uniform_submissions')
            .upsert({
                id: existing?.id,
                kit_id: kitId,
                child_id: childId,
                status: 'submitted',
                submitted_at: now,
                updated_at: now,
            } satisfies Database['public']['Tables']['uniform_submissions']['Insert'])
            .select('id')
            .single()

        if (upsertError) throw upsertError

        const submissionId = submission?.id ?? existing?.id
        if (!submissionId) throw new Error('Submission not created')

        // Replace item selections
        await supabase.from('uniform_submission_items').delete().eq('submission_id', submissionId)

        const insertRows = items.map((item) => ({
            submission_id: submissionId,
            item_id: item.item_id,
            size: item.size,
        }) satisfies Database['public']['Tables']['uniform_submission_items']['Insert'])

        const { error: insertError } = await supabase.from('uniform_submission_items').insert(insertRows)
        if (insertError) throw insertError

        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Failed to submit uniform sizes') }
    }
}
