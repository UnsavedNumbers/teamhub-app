import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import {
    getUniformKitsForOrg,
    getUniformItemsForKit,
    getSubmissionsForKit,
    fakeUniformKits,
    fakeUniformItems,
    fakeUniformSubmissions,
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

    if (!USE_FAKE_DATA) {
        return { data: [], error: null }
    }

    // In a real app, we'd filter by teamIds. 
    // For demo, we return all active kits for the org to ensure visibility.
    let kits = getUniformKitsForOrg(context.orgId)

    // Simple filter if teamIds provided, but generally permissive for demo
    if (teamIds && teamIds.length > 0) {
        kits = kits.filter(k => !k.team_id || teamIds.includes(k.team_id))
    }

    return { data: kits, error: null }
}

/**
 * Get items for specific kits
 */
export async function getUniformKitItems(
    context: UserContext,
    kitIds: string[]
): Promise<{ data: UniformItem[]; error: Error | null }> {
    await simulateDelay()

    if (!USE_FAKE_DATA) {
        return { data: [], error: null }
    }

    const items = fakeUniformItems.filter(i => kitIds.includes(i.kit_id))
    return { data: items, error: null }
}

/**
 * Get submissions for the user (or specific children)
 */
export async function getUniformSubmissions(
    context: UserContext,
    childIds?: string[]
): Promise<{ data: UniformSubmission[]; error: Error | null }> {
    await simulateDelay()

    if (!USE_FAKE_DATA) {
        return { data: [], error: null }
    }

    let submissions = fakeUniformSubmissions

    if (childIds && childIds.length > 0) {
        submissions = submissions.filter(s => childIds.includes(s.child_id))
    }

    // In a real app we might also filter by user if they are the submitter

    return { data: submissions, error: null }
}

/**
 * Get size selections for a submission
 */
export async function getUniformSizeSelections(
    context: UserContext,
    submissionId: string
): Promise<{ data: UniformSizeSelection[]; error: Error | null }> {
    await simulateDelay()

    if (!USE_FAKE_DATA) {
        return { data: [], error: null }
    }

    const selections = fakeUniformSizeSelections.filter(s => s.submission_id === submissionId)
    return { data: selections, error: null }
}

/**
 * Submit uniform sizes
 */
export async function submitUniformSizes(
    context: UserContext,
    kitId: string,
    childId: string,
    items: { item_id: string, size: string }[]
): Promise<{ error: Error | null }> {
    await simulateDelay()
    if (!USE_FAKE_DATA) return { error: null }

    // In fake mode we don't persist, just return success
    console.log('Mock submitting uniform sizes:', { kitId, childId, items })
    return { error: null }
}
