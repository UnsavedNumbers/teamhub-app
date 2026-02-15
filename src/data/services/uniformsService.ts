import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { SupabaseExtended as Database, Json } from '../../lib/supabase.extended.types'
import type { CreateUniformKitDTO, UpdateUniformKitDTO } from '../../types/uniforms'
import {
    fakeUniformKits,
    fakeUniformItems,
    fakeUniformSubmissions,
    getUniformKitsForOrg,
    createFakeUniformKit,
    type FakeUniformKit,
    type FakeUniformSubmission,
    type FakeUniformSizeSelection,
    fakeUniformSizeSelections
} from '../fake/fakeUniforms'

// Unified types that work with both fake and real data
export type UniformKit = FakeUniformKit

export interface UniformItem {
  id: string
  kit_id: string
  name: string
  required: boolean
  size_options: string[] | any // Can be array or JSONB
  sort_order?: number
  // Additional fields from fake data (optional)
  type?: string
  sizes_available?: string[]
  price_cents?: number | null
  image_url?: string | null
  created_at?: string
}

export type UniformSubmission = FakeUniformSubmission & {
  items?: UniformSizeSelection[]
}
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
    console.groupCollapsed(`%cgetUniformKits: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformKits', 'Request', { orgId: context.orgId, teamIds })
    debug.perf.start('uniformsService.getUniformKits')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            let kits = getUniformKitsForOrg(context.orgId)
            if (teamIds && teamIds.length > 0) {
                kits = kits.filter(k => !k.team_id || teamIds.includes(k.team_id))
            }
            debug.perf.end('uniformsService.getUniformKits')
            debug.data('UniformsService.getUniformKits', 'Response (fake)', { orgId: context.orgId, kitCount: kits.length })
            console.groupEnd()
            return { data: kits, error: null }
        }
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
        debug.perf.end('uniformsService.getUniformKits')
        debug.data('UniformsService.getUniformKits', 'Response', { orgId: context.orgId, kitCount: filtered.length })
        console.groupEnd()
        return { data: (filtered as unknown) as UniformKit[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformKits')
        debug.error('UniformsService.getUniformKits', 'Failed to fetch uniform kits', { error: err, orgId: context.orgId, teamIds })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetUniformKitItems: ${kitIds.length} kits`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformKitItems', 'Request', { kitIds })
    debug.perf.start('uniformsService.getUniformKitItems')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            const items = fakeUniformItems
                .filter(i => kitIds.includes(i.kit_id))
                .map(item => ({
                    id: item.id,
                    kit_id: item.kit_id,
                    name: item.name,
                    required: item.is_required,
                    size_options: item.sizes_available,
                    sort_order: 0,
                    type: item.type,
                    sizes_available: item.sizes_available,
                    price_cents: item.price_cents,
                    image_url: item.image_url,
                    created_at: item.created_at,
                } as UniformItem))
            debug.perf.end('uniformsService.getUniformKitItems')
            debug.data('UniformsService.getUniformKitItems', 'Response (fake)', { kitIds, itemCount: items.length })
            console.groupEnd()
            return { data: items, error: null }
        }
        const { data, error } = await supabase
            .from('uniform_kit_items')
            .select('*')
            .in('kit_id', kitIds)
            .order('sort_order', { ascending: true })

        if (error) throw error
        
        // Transform database rows to UniformItem format
        const transformed = (data ?? []).map((row: any) => ({
            id: row.id,
            kit_id: row.kit_id,
            name: row.name,
            required: row.required ?? true,
            size_options: row.size_options || [],
            sort_order: row.sort_order ?? 0,
            created_at: row.created_at,
        } as UniformItem))
        
        debug.perf.end('uniformsService.getUniformKitItems')
        debug.data('UniformsService.getUniformKitItems', 'Response', { kitIds, itemCount: transformed.length })
        console.groupEnd()
        return { data: transformed, error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformKitItems')
        debug.error('UniformsService.getUniformKitItems', 'Failed to fetch kit items', { error: err, kitIds })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetUniformSubmissions`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformSubmissions', 'Request', { orgId: _context.orgId, childIds })
    debug.perf.start('uniformsService.getUniformSubmissions')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            let submissions = fakeUniformSubmissions
            if (childIds && childIds.length > 0) {
                submissions = submissions.filter(s => {
                    const athleteId = (s as { athlete_id?: string; child_id?: string }).athlete_id ?? (s as { child_id?: string }).child_id
                    return athleteId ? childIds.includes(athleteId) : false
                })
            }
            // Include items for fake data to match real data structure
            const submissionsWithItems = submissions.map(submission => ({
                ...submission,
                items: fakeUniformSizeSelections.filter(s => s.submission_id === submission.id)
            }))
            debug.perf.end('uniformsService.getUniformSubmissions')
            debug.data('UniformsService.getUniformSubmissions', 'Response (fake)', { submissionCount: submissionsWithItems.length })
            console.groupEnd()
            return { data: submissionsWithItems, error: null }
        }
        let query = supabase
            .from('uniform_submissions')
            .select('*, items:uniform_submission_items(*)')

        if (childIds && childIds.length > 0) {
            query = query.in('athlete_id', childIds)
        }

        const { data, error } = await query
        if (error) throw error

        debug.perf.end('uniformsService.getUniformSubmissions')
        debug.data('UniformsService.getUniformSubmissions', 'Response', { submissionCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as unknown) as UniformSubmission[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformSubmissions')
        debug.error('UniformsService.getUniformSubmissions', 'Failed to fetch submissions', { error: err, childIds })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetAllUniformSubmissions: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getAllUniformSubmissions', 'Request', { orgId: context.orgId })
    debug.perf.start('uniformsService.getAllUniformSubmissions')

    await simulateDelay()

    if (USE_FAKE_DATA) {
        const orgKits = fakeUniformKits.filter(k => k.org_id === context.orgId)
        const orgKitIds = orgKits.map(k => k.id)
        const submissions = fakeUniformSubmissions.filter(s => orgKitIds.includes(s.kit_id))
        debug.perf.end('uniformsService.getAllUniformSubmissions')
        debug.data('UniformsService.getAllUniformSubmissions', 'Response (fake)', { orgId: context.orgId, submissionCount: submissions.length })
        console.groupEnd()
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
        if (kitIds.length === 0) {
            debug.perf.end('uniformsService.getAllUniformSubmissions')
            debug.data('UniformsService.getAllUniformSubmissions', 'Response (no kits)', { orgId: context.orgId })
            console.groupEnd()
            return { data: [], error: null }
        }

        const { data, error } = await supabase
            .from('uniform_submissions')
            .select('*, items:uniform_submission_items(*)')
            .in('kit_id', kitIds)

        if (error) throw error
        debug.perf.end('uniformsService.getAllUniformSubmissions')
        debug.data('UniformsService.getAllUniformSubmissions', 'Response', { orgId: context.orgId, submissionCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as unknown) as UniformSubmission[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getAllUniformSubmissions')
        debug.error('UniformsService.getAllUniformSubmissions', 'Failed to fetch org submissions', { error: err, orgId: context.orgId })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetUniformSizeSelections: ${submissionId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformSizeSelections', 'Request', { submissionId })
    debug.perf.start('uniformsService.getUniformSizeSelections')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            const selections = fakeUniformSizeSelections.filter(s => s.submission_id === submissionId)
            debug.perf.end('uniformsService.getUniformSizeSelections')
            debug.data('UniformsService.getUniformSizeSelections', 'Response (fake)', { submissionId, selectionCount: selections.length })
            console.groupEnd()
            return { data: selections, error: null }
        }
        const { data, error } = await supabase
            .from('uniform_submission_items')
            .select('*')
            .eq('submission_id', submissionId)

        if (error) throw error
        debug.perf.end('uniformsService.getUniformSizeSelections')
        debug.data('UniformsService.getUniformSizeSelections', 'Response', { submissionId, selectionCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as unknown) as UniformSizeSelection[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformSizeSelections')
        debug.error('UniformsService.getUniformSizeSelections', 'Failed to fetch size selections', { error: err, submissionId })
        console.groupEnd()
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
    console.groupCollapsed(`%csubmitUniformSizes: ${kitId} - ${childId}`, 'color: #666; font-weight: bold;');
    debug.flow('UniformsService.submitUniformSizes', 'Submitting uniform sizes', { kitId, childId, itemCount: items.length })
    debug.perf.start('uniformsService.submitUniformSizes')

    await simulateDelay()
    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('uniformsService.submitUniformSizes')
            debug.flow('UniformsService.submitUniformSizes', 'Uniform sizes submitted (fake)', { kitId, childId })
            console.groupEnd()
            return { error: null }
        }
        // Upsert submission header
        const { data: existing, error: fetchError } = await supabase
            .from('uniform_submissions')
            .select('id')
            .eq('kit_id', kitId)
            .eq('athlete_id', childId)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        const now = new Date().toISOString()
        const { data: submission, error: upsertError } = await supabase
            .from('uniform_submissions')
            .upsert({
                id: existing?.id,
                kit_id: kitId,
                athlete_id: childId,
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

        debug.perf.end('uniformsService.submitUniformSizes')
        debug.flow('UniformsService.submitUniformSizes', 'Uniform sizes submitted successfully', { kitId, childId, itemCount: items.length })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('uniformsService.submitUniformSizes')
        debug.error('UniformsService.submitUniformSizes', 'Failed to submit uniform sizes', { error: err, kitId, childId })
        console.groupEnd()
        return { error: err instanceof Error ? err : new Error('Failed to submit uniform sizes') }
    }
}

/**
 * Create a uniform kit (team-level or org-level)
 */
export async function createUniformKit(
    context: UserContext,
    dto: CreateUniformKitDTO
): Promise<{ data: { id: string } | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateUniformKit: ${dto.name}`, 'color: #666; font-weight: bold;');
    debug.flow('UniformsService.createUniformKit', 'Creating uniform kit', { kitName: dto.name, orgId: dto.org_id, teamId: dto.team_id })
    debug.perf.start('uniformsService.createUniformKit')

    await simulateDelay()

    // Input validation
    if (!dto.name?.trim()) {
        debug.perf.end('uniformsService.createUniformKit')
        debug.error('UniformsService.createUniformKit', 'Validation failed', { error: 'missing_name' })
        console.groupEnd()
        return { data: null, error: new Error('Uniform name is required') }
    }
    if (!dto.org_id) {
        debug.perf.end('uniformsService.createUniformKit')
        debug.error('UniformsService.createUniformKit', 'Validation failed', { error: 'missing_org_id' })
        console.groupEnd()
        return { data: null, error: new Error('Organization is required') }
    }
    if (dto.team_id != null && dto.season_id == null) {
        debug.perf.end('uniformsService.createUniformKit')
        debug.error('UniformsService.createUniformKit', 'Validation failed', { error: 'missing_season_id' })
        console.groupEnd()
        return { data: null, error: new Error('Season is required when creating a team-level uniform') }
    }

    try {
        if (USE_FAKE_DATA) {
            const { id } = createFakeUniformKit(context.orgId, {
                name: dto.name,
                team_id: dto.team_id,
                season_id: dto.season_id,
                status: dto.status,
                deadline_at: dto.deadline_at,
                vendor: dto.vendor,
            })
            debug.perf.end('uniformsService.createUniformKit')
            debug.flow('UniformsService.createUniformKit', 'Uniform kit created (fake)', { kitName: dto.name, kitId: id })
            console.groupEnd()
            return { data: { id }, error: null }
        }
        const insertData: Database['public']['Tables']['uniform_kits']['Insert'] = {
            team_id: dto.team_id ?? null,
            season_id: dto.season_id ?? null,
            name: dto.name,
            sport_id: dto.sport_id ?? undefined,
            program_id: dto.program_id ?? null,
            org_id: dto.org_id,
            deadline_at: dto.deadline_at ?? null,
            primary_color: dto.primary_color ?? null,
            secondary_color: dto.secondary_color ?? null,
            accent_color: dto.accent_color ?? null,
            vendor: dto.vendor ?? null,
            notes: dto.notes ?? null,
            status: dto.status ?? 'active',
            sport_specific_fields: (dto.sport_specific_fields || {}) as Json,
            created_by: context.userId,
        } as Database['public']['Tables']['uniform_kits']['Insert']

        const { data, error } = await supabase
            .from('uniform_kits')
            .insert(insertData)
            .select('id')
            .single()

        if (error) throw error

        // Create items if provided
        if (dto.items && dto.items.length > 0) {
            const itemRows = dto.items.map((item, index) => ({
                kit_id: data.id,
                name: item.name,
                required: item.required ?? true,
                size_options: (item.size_options || []) as Json,
                sort_order: item.sort_order ?? index * 10,
                sport_specific_fields: (item.sport_specific_fields || {}) as Json,
            }))

            const { error: itemsError } = await supabase
                .from('uniform_kit_items')
                .insert(itemRows)

            if (itemsError) throw itemsError
        }

        debug.perf.end('uniformsService.createUniformKit')
        debug.flow('UniformsService.createUniformKit', 'Uniform kit created successfully', { kitName: dto.name, kitId: data.id })
        console.groupEnd()
        return { data: { id: data.id }, error: null }
    } catch (err) {
        debug.perf.end('uniformsService.createUniformKit')
        debug.error('UniformsService.createUniformKit', 'Failed to create uniform kit', { error: err, kitName: dto.name })
        console.groupEnd()
        console.error('[uniformsService] Error creating uniform kit:', err)
        return { 
            data: null, 
            error: err instanceof Error ? err : new Error('Failed to create uniform kit') 
        }
    }
}

/**
 * Update a uniform kit
 */
export async function updateUniformKit(
    context: UserContext,
    kitId: string,
    dto: UpdateUniformKitDTO
): Promise<{ error: Error | null }> {
    await simulateDelay()

    if (USE_FAKE_DATA) {
        return { error: null }
    }

    try {
        const updateData: any = {}

        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.sport_id !== undefined) updateData.sport_id = dto.sport_id
        if (dto.program_id !== undefined) updateData.program_id = dto.program_id ?? null
        if (dto.season_id !== undefined) updateData.season_id = dto.season_id ?? null
        if (dto.deadline_at !== undefined) updateData.deadline_at = dto.deadline_at ?? null
        if (dto.primary_color !== undefined) updateData.primary_color = dto.primary_color ?? null
        if (dto.secondary_color !== undefined) updateData.secondary_color = dto.secondary_color ?? null
        if (dto.accent_color !== undefined) updateData.accent_color = dto.accent_color ?? null
        if (dto.vendor !== undefined) updateData.vendor = dto.vendor ?? null
        if (dto.notes !== undefined) updateData.notes = dto.notes ?? null
        if (dto.status !== undefined) updateData.status = dto.status
        if (dto.sport_specific_fields !== undefined) {
            updateData.sport_specific_fields = dto.sport_specific_fields as Json
        }

        const { error } = await supabase
            .from('uniform_kits')
            .update(updateData)
            .eq('id', kitId)
            .eq('org_id', context.orgId)

        if (error) throw error

        debug.perf.end('uniformsService.updateUniformKit')
        debug.flow('UniformsService.updateUniformKit', 'Uniform kit updated successfully', { kitId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('uniformsService.updateUniformKit')
        debug.error('UniformsService.updateUniformKit', 'Failed to update uniform kit', { error: err, kitId })
        console.groupEnd()
        console.error('[uniformsService] Error updating uniform kit:', err)
        return { 
            error: err instanceof Error ? err : new Error('Failed to update uniform kit') 
        }
    }
}

/**
 * Get uniform kits by sport
 */
export async function getUniformKitsBySport(
    context: UserContext,
    sportId: string
): Promise<{ data: UniformKit[]; error: Error | null }> {
    console.groupCollapsed(`%cgetUniformKitsBySport: ${sportId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformKitsBySport', 'Request', { orgId: context.orgId, sportId })
    debug.perf.start('uniformsService.getUniformKitsBySport')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            const kits = getUniformKitsForOrg(context.orgId)
            const filtered = kits.filter(k => (k as any).sport_id === sportId)
            debug.perf.end('uniformsService.getUniformKitsBySport')
            debug.data('UniformsService.getUniformKitsBySport', 'Response (fake)', { sportId, kitCount: filtered.length })
            console.groupEnd()
            return { data: filtered, error: null }
        }
        const { data, error } = await supabase
            .from('uniform_kits')
            .select('*')
            .eq('sport_id', sportId)
            .eq('org_id', context.orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        debug.perf.end('uniformsService.getUniformKitsBySport')
        debug.data('UniformsService.getUniformKitsBySport', 'Response', { sportId, kitCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as unknown) as UniformKit[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformKitsBySport')
        debug.error('UniformsService.getUniformKitsBySport', 'Failed to fetch kits by sport', { error: err, sportId })
        console.groupEnd()
        return { 
            data: [], 
            error: err instanceof Error ? err : new Error('Failed to fetch uniform kits by sport') 
        }
    }
}

/**
 * Get org-level uniform templates (team_id IS NULL)
 */
export async function getOrgUniformTemplates(
    context: UserContext
): Promise<{ data: UniformKit[]; error: Error | null }> {
    console.groupCollapsed(`%cgetOrgUniformTemplates: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getOrgUniformTemplates', 'Request', { orgId: context.orgId })
    debug.perf.start('uniformsService.getOrgUniformTemplates')

    await simulateDelay()

    try {
        if (USE_FAKE_DATA) {
            const kits = getUniformKitsForOrg(context.orgId)
            const templates = kits.filter(k => !k.team_id)
            debug.perf.end('uniformsService.getOrgUniformTemplates')
            debug.data('UniformsService.getOrgUniformTemplates', 'Response (fake)', { orgId: context.orgId, templateCount: templates.length })
            console.groupEnd()
            return { data: templates, error: null }
        }
        const { data, error } = await supabase
            .from('uniform_kits')
            .select('*')
            .is('team_id', null)
            .eq('org_id', context.orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        debug.perf.end('uniformsService.getOrgUniformTemplates')
        debug.data('UniformsService.getOrgUniformTemplates', 'Response', { orgId: context.orgId, templateCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as unknown) as UniformKit[], error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getOrgUniformTemplates')
        debug.error('UniformsService.getOrgUniformTemplates', 'Failed to fetch templates', { error: err, orgId: context.orgId })
        console.groupEnd()
        return { 
            data: [], 
            error: err instanceof Error ? err : new Error('Failed to fetch org uniform templates') 
        }
    }
}

/**
 * Get a single uniform kit by ID
 */
export async function getUniformKit(
    context: UserContext,
    kitId: string
): Promise<{ data: UniformKit | null; error: Error | null }> {
    console.groupCollapsed(`%cgetUniformKit: ${kitId}`, 'color: #666; font-weight: bold;');
    debug.data('UniformsService.getUniformKit', 'Request', { kitId, orgId: context.orgId })
    debug.perf.start('uniformsService.getUniformKit')

    await simulateDelay()

    try {
            if (USE_FAKE_DATA) {
            const kits = getUniformKitsForOrg(context.orgId)
            const kit = kits.find(k => k.id === kitId)
            debug.perf.end('uniformsService.getUniformKit')
            debug.data('UniformsService.getUniformKit', 'Response (fake)', { kitId, found: !!kit })
            console.groupEnd()
            return { data: kit || null, error: null }
        }
        const { data, error } = await supabase
            .from('uniform_kits')
            .select('*')
            .eq('id', kitId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        debug.perf.end('uniformsService.getUniformKit')
        debug.data('UniformsService.getUniformKit', 'Response', { kitId, kitName: data?.name })
        console.groupEnd()
        return { data: (data as unknown) as UniformKit, error: null }
    } catch (err) {
        debug.perf.end('uniformsService.getUniformKit')
        debug.error('UniformsService.getUniformKit', 'Failed to fetch uniform kit', { error: err, kitId })
        console.groupEnd()
        return { 
            data: null, 
            error: err instanceof Error ? err : new Error('Failed to fetch uniform kit') 
        }
    }
}
