/**
 * Family Service
 *
 * Provides data access for families, children, and family members.
 * Supports both Fake Data (Demo Mode) and Real Supabase Data.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { captureEvent } from '../../lib/analytics/analytics'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { normalizeSupabaseResponse } from './responseHelpers'
import { getAthleteSports } from './athleteSportsService'
import { getAthleteSensitiveAccess } from './sensitiveAccessService'
import { getTierLimit, isLimitExceeded } from './tierLimitsService'
import { canAccessSensitiveData, type SensitiveAthleteAccess } from '../../utils/sensitiveAccess'
import {
    fakeFamilies,
    fakeChildren,
    getFamiliesForUser,
    getChildrenForUser,
    getFamilyById,
    getFamilyMembersForFamily,
    type FakeFamily,
    type FakeChild,
    type FakeFamilyMember,
} from '../fake/fakeUsers'
import { getChildrenForUserId, getFamiliesForUserId } from '../fake/relationships'
import { getCoachTeamIds, getGuardianCanonicalUserId } from '../fake/userContext'
import { getTeamMembersForSeason, getTeamById, getActiveTeamMembershipsForChild, SEASON_SPRING_CURRENT_ID } from '../fake/fakeTeams'
import type {
    Family,
    Child,
    FamilyMember,
    FamilyWithDetails,
    Gender,
    CreateFamilyDTO,
    UpdateFamilyDTO,
    CreateChildDTO,
    UpdateChildDTO,
    CreateAthleteDTO,
    UpdateAthleteDTO
} from '../../types/family'
import type {
    SearchAthletesParams,
    SearchAthletesResponse,
    AthleteWithTeams,
    CurrentTeam
} from '../../types/athletes'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

async function buildPermissions(context: UserContext): Promise<PermissionSet> {
    const guardianUserId = getGuardianCanonicalUserId(context)
    const ownedChildIds = getChildrenForUserId(guardianUserId)
    const ownedFamilyIds = getFamiliesForUserId(guardianUserId)
    const assignedTeamIds = context.roles.includes('coach')
        ? await getCoachTeamIds(context)
        : []
    return calculatePermissions(context, assignedTeamIds, ownedChildIds, ownedFamilyIds)
}

// Convert Fake types to App types (casting where safely compatible for this demo)
function mapFakeFamily(f: FakeFamily): Family {
    return {
        ...f,
        deleted_at: null
    } as Family
}

function mapFakeChild(c: FakeChild, orgId?: string | null): Child {
    return {
        id: c.id,
        family_id: c.family_id,
        first_name: c.first_name,
        last_name: c.last_name,
        date_of_birth: c.date_of_birth,
        gender: c.gender,
        preferred_name: null,
        jersey_number: c.jersey_number,
        medical_notes: c.medical_notes,
        allergies: c.allergies,
        emergency_contact_name: c.emergency_contact_name,
        emergency_contact_phone: c.emergency_contact_phone,
        phone: null,
        email: null,
        photo_url: c.photo_url || null, // Use photo_url from fake data if available
        profile_photo_updated_at: c.photo_url ? new Date().toISOString() : null,
        has_profile_photo: !!c.photo_url,
        org_id: orgId ?? undefined,
        // Universal fields
        height_cm: c.height_cm ?? null,
        weight_kg: c.weight_kg ?? null,
        shoe_size_value: c.shoe_size_value ?? null,
        shoe_size_system: c.shoe_size_system ?? null,
        shoe_width: c.shoe_width ?? null,
        tshirt_size: c.tshirt_size ?? null,
        shorts_size: c.shorts_size ?? null,
        dominant_hand: c.dominant_hand ?? null,
        created_at: c.created_at,
        updated_at: c.updated_at,
        deleted_at: null,
        sports: [] // Sports loaded separately via getAthleteSports
    } as unknown as Child
}

function mapFakeMember(m: FakeFamilyMember): FamilyMember {
    return {
        ...m,
        updated_at: m.created_at, // fake data missing update
        deleted_at: null
    }
}

// ============================================================================
// Family Service Functions
// ============================================================================

/**
 * Get families for the current user or organization (if admin)
 */
export async function getFamilies(
    context: UserContext,
    options: { limit?: number; offset?: number } = {}
): Promise<{ data: Family[]; count: number; error: Error | null }> {
    console.groupCollapsed(`%cgetFamilies: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.getFamilies', 'Request', { context: { userId: context.userId, orgId: context.orgId }, options })
    debug.perf.start('familyService.getFamilies')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const permissions = await buildPermissions(context)
            const fakeOrgId = DEMO_ORG_A_ID
            let result: FakeFamily[] = []

            if (permissions.canViewAllOrgData) {
                result = fakeFamilies.filter((f) => f.org_id === fakeOrgId)
            } else {
                result = getFamiliesForUser(context.userId)
            }

            // "Paginate" fake data
            const start = options.offset || 0
            const end = options.limit ? start + options.limit : undefined
            const paged = result.slice(start, end)

            return {
                data: paged.map(mapFakeFamily),
                count: result.length,
                error: null
            }
        }

        // Real Supabase Query
        // Note: families table does not have deleted_at column
        let query = supabase
            .from('families')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Apply Org Filter (RLS usually handles this, but good to be explicit)
        // If context has orgId, we might want to filter by it, 
        // relying on RLS policies to restrict "User's Families" vs "All Families"
        if (context.orgId) {
            query = query.eq('org_id', context.orgId)
        }

        if (options.limit) query = query.limit(options.limit)
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1)

        const { data, count, error } = await query

        if (error) throw error

        debug.perf.end('familyService.getFamilies')
        debug.data('FamilyService.getFamilies', 'Response', { familyCount: (data || []).length, totalCount: count })
        console.groupEnd()
        return {
            data: (data || []) as Family[],
            count: count || 0,
            error: null
        }

    } catch (err) {
        debug.perf.end('familyService.getFamilies')
        debug.error('FamilyService.getFamilies', 'Failed to fetch families', { error: err, context: { userId: context.userId, orgId: context.orgId }, options })
        console.groupEnd()
        return { data: [], count: 0, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single family with full details (children + members)
 */
export async function getFamilyDetails(
    context: UserContext,
    familyId: string
): Promise<{ data: FamilyWithDetails | null; error: Error | null }> {
    console.groupCollapsed(`%cgetFamilyDetails: ${familyId}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.getFamilyDetails', 'Request', { familyId, orgId: context.orgId })
    debug.perf.start('familyService.getFamilyDetails')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const family = getFamilyById(familyId)
            if (!family) return { data: null, error: null }

            // Access check
            const permissions = await buildPermissions(context)
            if (!permissions.canViewAllOrgData && !permissions.ownedFamilyIds.includes(familyId)) {
                return { data: null, error: new Error('Access denied') }
            }

            const members = getFamilyMembersForFamily(familyId).map(mapFakeMember)
            const fakeOrgId = DEMO_ORG_A_ID
            const children = fakeChildren
                .filter((c) => c.family_id === familyId)
                .map((c) => mapFakeChild(c, fakeOrgId))

            debug.perf.end('familyService.getFamilyDetails')
            debug.data('FamilyService.getFamilyDetails', 'Response (fake)', { familyId, hasData: true, memberCount: members.length, childCount: children.length })
            console.groupEnd()
            return {
                data: { ...mapFakeFamily(family), members, children },
                error: null,
            }
        }

        // Real Data
        // Note: families table does not have deleted_at column
        const { data: family, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', familyId)
            .single()

        if (familyError) throw familyError
        if (!family) {
            debug.perf.end('familyService.getFamilyDetails')
            debug.data('FamilyService.getFamilyDetails', 'Response (not found)', { familyId })
            console.groupEnd()
            return { data: null, error: null }
        }

        // Fetch children
        const { data: children, error: childrenError } = await supabase
            .from('athletes')
            .select('*')
            .eq('family_id', familyId)
            .is('deleted_at', null)

        if (childrenError) throw childrenError

        // Fetch members
        // Note: family_members table does not have deleted_at column
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyId)

        if (membersError) throw membersError

        return {
            data: {
                ...(family as any as Family),
                children: (children as any[] as Child[]) || [],
                members: (members as any[] as FamilyMember[]) || []
            },
            error: null
        }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new Family
 */
export async function createFamily(
    context: UserContext,
    dto: CreateFamilyDTO
): Promise<{ data: Family | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateFamily: ${dto.name}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.createFamily', 'Creating family', { orgId: dto.org_id, name: dto.name })
    debug.perf.start('familyService.createFamily')

    if (USE_FAKE_DATA) {
        // Demo mode: prevent write
        await simulateDelay()
        const result = {
            data: {
                id: `demo-family-${Date.now()}`,
                ...dto,
                created_by_user_id: context.userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null
            },
            error: null
        }
        debug.perf.end('familyService.createFamily')
        debug.flow('FamilyService.createFamily', 'Family created (fake)', { familyId: result.data.id, name: dto.name })
        console.groupEnd()
        return result
    }

    try {
        type FamilyInsert = Database['public']['Tables']['families']['Insert']
        const insertData = {
            name: dto.name,
            org_id: dto.org_id,
        } satisfies FamilyInsert
        const { data, error } = await supabase
            .from('families')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error
        debug.perf.end('familyService.createFamily')
        debug.flow('FamilyService.createFamily', 'Family created successfully', { familyId: data?.id, name: dto.name })
        console.groupEnd()
        return { data: data as unknown as Family, error: null }
    } catch (err) {
        debug.perf.end('familyService.createFamily')
        debug.error('FamilyService.createFamily', 'Failed to create family', { error: err, name: dto.name })
        console.groupEnd()
        return { data: null, error: err instanceof Error ? err : new Error('Create failed') }
    }
}

/**
 * Update a Family
 */
export async function updateFamily(
    _context: UserContext,
    familyId: string,
    dto: UpdateFamilyDTO
): Promise<{ data: Family | null; error: Error | null }> {
    console.groupCollapsed(`%cupdateFamily: ${familyId}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.updateFamily', 'Updating family', { familyId, updates: Object.keys(dto) })
    debug.perf.start('familyService.updateFamily')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('familyService.updateFamily')
        debug.flow('FamilyService.updateFamily', 'Family updated (fake)', { familyId })
        console.groupEnd()
        return { data: null, error: null } // Mock success
    }

    try {
        type FamilyUpdate = Database['public']['Tables']['families']['Update']
        const updateData = {
            ...dto,
            updated_at: new Date().toISOString()
        } satisfies FamilyUpdate
        const { data, error } = await supabase
            .from('families')
            .update(updateData)
            .eq('id', familyId)
            .select()
            .single()

        if (error) throw error
        debug.perf.end('familyService.updateFamily')
        debug.flow('FamilyService.updateFamily', 'Family updated successfully', { familyId })
        console.groupEnd()
        return { data: data as unknown as Family, error: null }
    } catch (err) {
        debug.perf.end('familyService.updateFamily')
        debug.error('FamilyService.updateFamily', 'Failed to update family', { error: err, familyId })
        console.groupEnd()
        return { data: null, error: err instanceof Error ? err : new Error('Update failed') }
    }
}

/**
 * Soft Delete a Family
 */
export async function deleteFamily(
    _context: UserContext,
    familyId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteFamily: ${familyId}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.deleteFamily', 'Deleting family', { familyId })
    debug.perf.start('familyService.deleteFamily')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('familyService.deleteFamily')
        debug.flow('FamilyService.deleteFamily', 'Family deleted (fake)', { familyId })
        console.groupEnd()
        return { error: null }
    }

    try {
        const { error } = await supabase
            .from('families')
            .delete()
            .eq('id', familyId)

        if (error) throw error
        debug.perf.end('familyService.deleteFamily')
        debug.flow('FamilyService.deleteFamily', 'Family deleted successfully', { familyId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('familyService.deleteFamily')
        debug.error('FamilyService.deleteFamily', 'Failed to delete family', { error: err, familyId })
        console.groupEnd()
        return { error: err instanceof Error ? err : new Error('Delete failed') }
    }
}

// ============================================================================
// Athlete Service Functions (Core CRUD)
// ============================================================================

/**
 * Create a basic athlete (without guardians)
 * For creating athletes with guardians, use createAthleteWithGuardians
 */
export async function createAthleteBasic(
    _context: UserContext,
    dto: CreateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateAthleteBasic: ${dto.first_name} ${dto.last_name}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.createAthleteBasic', 'Creating athlete', { athleteName: `${dto.first_name} ${dto.last_name}`, familyId: dto.family_id })
    debug.perf.start('familyService.createAthleteBasic')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        const demoId = `demo-child-${Date.now()}`
        captureEvent('athlete_added', {
          athlete_id: demoId,
          user_id: _context.userId,
          family_id: dto.family_id ?? undefined,
        })
        return {
            data: {
                id: demoId,
                first_name: dto.first_name,
                last_name: dto.last_name,
                date_of_birth: dto.date_of_birth,
                family_id: dto.family_id ?? null,
                gender: dto.gender || null,
                preferred_name: null,
                photo_url: null,
                jersey_number: dto.jersey_number || null,
                medical_notes: dto.medical_notes || null,
                allergies: dto.allergies || null,
                emergency_contact_name: dto.emergency_contact_name || null,
                emergency_contact_phone: dto.emergency_contact_phone || null,
                phone: dto.phone || null,
                email: dto.email || null,
                profile_photo_updated_at: null,
                has_profile_photo: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null
            } as unknown as Child,
            error: null
        }
    }

    try {
        // Check max_athletes tier limit before creating (if orgId available)
        if (_context.orgId) {
            const limitResult = await getTierLimit(_context.orgId, _context.userId, 'max_athletes')
            if (limitResult.error) {
                // Fail open on error (allow creation) but log warning
                console.warn('[familyService] Failed to check max_athletes limit, allowing creation:', limitResult.error)
            } else if (limitResult.limit !== null) {
                // Count current athletes for this org
                const { count: currentAthleteCount, error: countError } = await supabase
                    .from('athletes')
                    .select('id', { count: 'exact', head: true })
                    .eq('org_id', _context.orgId)
                    .is('deleted_at', null)

                if (!countError && currentAthleteCount !== null) {
                    if (isLimitExceeded(currentAthleteCount, limitResult.limit)) {
                        const errorMessage = `You've reached your athlete limit (${limitResult.limit} athletes). Upgrade your plan to add more athletes.`
                        debug.perf.end('familyService.createAthleteBasic')
                        debug.error('FamilyService.createAthleteBasic', 'Athlete limit exceeded', { currentCount: currentAthleteCount, limit: limitResult.limit })
                        console.groupEnd()
                        return { 
                            data: null, 
                            error: new Error(errorMessage)
                        }
                    }
                }
            }
        }

        type ChildInsert = Database['public']['Tables']['athletes']['Insert']
        const insertData = dto satisfies ChildInsert
        const { data, error } = await supabase
            .from('athletes')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        captureEvent('athlete_added', {
          athlete_id: data.id,
          user_id: _context.userId,
          family_id: dto.family_id ?? undefined,
        })
        debug.perf.end('familyService.createAthleteBasic')
        debug.flow('FamilyService.createAthleteBasic', 'Athlete created successfully', { athleteId: data.id, athleteName: `${dto.first_name} ${dto.last_name}` })
        console.groupEnd()
        return { data: data as unknown as Child, error: null }
    } catch (err) {
        debug.perf.end('familyService.createAthleteBasic')
        debug.error('FamilyService.createAthleteBasic', 'Failed to create athlete', { error: err, athleteName: `${dto.first_name} ${dto.last_name}`, familyId: dto.family_id })
        console.groupEnd()
        return { data: null, error: err instanceof Error ? err : new Error('Create athlete failed') }
    }
}

/**
 * Update an athlete
 */
export async function updateAthlete(
    context: UserContext,
    athleteId: string,
    dto: UpdateAthleteDTO
): Promise<{ data: Child | null; error: Error | null }> {
    console.groupCollapsed(`%cupdateAthlete: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.updateAthlete', 'Updating athlete', { athleteId, orgId: context.orgId, updates: Object.keys(dto) })
    debug.perf.start('familyService.updateAthlete')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        const permissions = await buildPermissions(context)
        const child = fakeChildren.find(c => c.id === athleteId)
        
        if (!child) {
            return { data: null, error: new Error('Athlete not found') }
        }
        
        // Check access
        if (!permissions.canViewAllOrgData) {
            const guardianUserId = getGuardianCanonicalUserId(context)
            const ownedChildIds = getChildrenForUserId(guardianUserId)
            if (!ownedChildIds.includes(athleteId)) {
                return { data: null, error: new Error('Access denied') }
            }
        }
        
        // Update fake data
        Object.assign(child, dto)
        
        debug.perf.end('familyService.updateAthlete')
        debug.flow('FamilyService.updateAthlete', 'Athlete updated (fake)', { athleteId })
        console.groupEnd()
        const fakeOrgId = DEMO_ORG_A_ID
        return { data: mapFakeChild(child, fakeOrgId), error: null }
    }

    try {
        // Map DTO fields to database fields
        const updateData: Record<string, any> = {
            first_name: dto.first_name,
            last_name: dto.last_name,
            birthdate: dto.date_of_birth, // Map date_of_birth to birthdate
            gender: dto.gender,
            preferred_name: dto.preferred_name,
            jersey_number: dto.jersey_number,
            medical_notes: dto.medical_notes,
            allergies: dto.allergies,
            emergency_contact_name: dto.emergency_contact_name,
            emergency_contact_phone: dto.emergency_contact_phone,
            phone: dto.phone,
            email: dto.email,
            updated_at: new Date().toISOString()
        }
        
        const { data, error } = await supabase
            .from('athletes')
            .update(updateData)
            .eq('id', athleteId)
            .select()
            .single()

        if (error) {
            console.error('[updateAthlete] Supabase error:', error)
            throw error
        }
        if (!data) {
            throw new Error('Update athlete failed: no row updated. You may not have permission to edit this athlete.')
        }
        
        // Convert to proper Child type
        const athlete = {
            id: data.id,
            family_id: data.family_id,
            first_name: data.first_name,
            last_name: data.last_name,
            date_of_birth: data.birthdate || '',
            gender: data.gender as Gender | null,
            preferred_name: data.preferred_name ?? null,
            jersey_number: data.jersey_number ?? null,
            medical_notes: data.medical_notes ?? null,
            allergies: data.allergies ?? null,
            phone: (data as any).phone ?? null,
            email: (data as any).email ?? null,
            emergency_contact_name: data.emergency_contact_name ?? null,
            emergency_contact_phone: data.emergency_contact_phone ?? null,
            photo_url: null,
            profile_photo_updated_at: (data as any).profile_photo_updated_at ?? null,
            has_profile_photo: (data as any).has_profile_photo ?? false,
            org_id: context.orgId,
            created_at: data.created_at ?? new Date().toISOString(),
            updated_at: data.updated_at ?? new Date().toISOString(),
            deleted_at: data.deleted_at,
            sports: [], // Will be loaded separately if needed
            has_active_guardian: false // Will be checked separately if needed
        } as unknown as Child
        
        debug.perf.end('familyService.updateAthlete')
        debug.flow('FamilyService.updateAthlete', 'Athlete updated successfully', { athleteId })
        console.groupEnd()
        return { data: athlete, error: null }
    } catch (err) {
        debug.perf.end('familyService.updateAthlete')
        debug.error('FamilyService.updateAthlete', 'Failed to update athlete', { error: err, athleteId })
        console.groupEnd()
        console.error('[updateAthlete] Exception:', err)
        const errorMessage = err instanceof Error ? err.message : 'Update athlete failed'
        return { data: null, error: new Error(errorMessage) }
    }
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(
    _context: UserContext,
    athleteId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteAthlete: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.deleteAthlete', 'Deleting athlete', { athleteId })
    debug.perf.start('familyService.deleteAthlete')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('familyService.deleteAthlete')
        debug.flow('FamilyService.deleteAthlete', 'Athlete deleted (fake)', { athleteId })
        console.groupEnd()
        return { error: null }
    }

    try {
        // Delete athlete record
        // Note: photo_url column doesn't exist yet, so photo cleanup is skipped
        const { error } = await supabase
            .from('athletes')
            .delete()
            .eq('id', athleteId)

        if (error) throw error

        // Photo cleanup skipped - photo_url column doesn't exist in database yet
        // TODO: Re-enable when photo_url column is added

        debug.perf.end('familyService.deleteAthlete')
        debug.flow('FamilyService.deleteAthlete', 'Athlete deleted successfully', { athleteId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('familyService.deleteAthlete')
        debug.error('FamilyService.deleteAthlete', 'Failed to delete athlete', { error: err, athleteId })
        console.groupEnd()
        return { error: err instanceof Error ? err : new Error('Delete athlete failed') }
    }
}

/**
 * Get athletes for the current user
 */
export async function getAthletes(
    context: UserContext
): Promise<{ data: Child[]; error: Error | null }> {
    console.groupCollapsed(`%cgetAthletes: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.getAthletes', 'Request', { orgId: context.orgId, userId: context.userId })
    debug.perf.start('familyService.getAthletes')

    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = await buildPermissions(context)
            const fakeOrgId = DEMO_ORG_A_ID
            if (permissions.canViewAllOrgData) {
                const results = fakeChildren
                    .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === fakeOrgId)
                    .map((c) => mapFakeChild(c, fakeOrgId))
                return { data: results, error: null }
            }
            if (permissions.canViewAssignedTeams && permissions.assignedTeamIds.length > 0) {
                const athleteIds = new Set<string>()
                for (const teamId of permissions.assignedTeamIds) {
                    const members = getTeamMembersForSeason(teamId, SEASON_SPRING_CURRENT_ID)
                    members.forEach((m) => athleteIds.add(m.athlete_id))
                }
                const results = fakeChildren
                    .filter((c) => athleteIds.has(c.id))
                    .map((c) => mapFakeChild(c, context.orgId))
                debug.perf.end('familyService.getAthletes')
                debug.data('FamilyService.getAthletes', 'Response (fake coach roster)', { athleteCount: results.length })
                console.groupEnd()
                return { data: results, error: null }
            }
            const guardianUserId = getGuardianCanonicalUserId(context)
            const results = getChildrenForUser(guardianUserId).map((c) => mapFakeChild(c, context.orgId))
            debug.perf.end('familyService.getAthletes')
            debug.data('FamilyService.getAthletes', 'Response (fake)', { athleteCount: results.length })
            console.groupEnd()
            return { data: results, error: null }
        } catch (err) {
            debug.perf.end('familyService.getAthletes')
            debug.error('FamilyService.getAthletes', 'Failed to get athletes (fake)', { error: err })
            console.groupEnd()
            return { data: [], error: err instanceof Error ? err : new Error('Unknown') }
        }
    }

    // Real Data
    try {
        // Check if user is org admin - if so, get all athletes in org; otherwise, get only guardian athletes
        const isOrgAdmin = context.roles.includes('org_admin') || context.isPlatformAdmin
        
        let data: any[] = []
        
        if (isOrgAdmin) {
            // Org admins see all athletes in the org
            console.log('[getAthletes] Fetching all athletes with guardian status for org:', context.orgId)
            const { data: allAthletes, error: allError } = await supabase
                .rpc('get_athletes_with_guardian_status', {
                    p_org_id: context.orgId,
                    p_limit: 10000, // Large limit to get all athletes (pagination handled client-side)
                    p_offset: 0
                })
            
            if (allError) {
                console.error('[getAthletes] Query error:', allError)
                throw allError
            }
            data = allAthletes || []
        } else {
            // Regular users/guardians only see their own children
            console.log('[getAthletes] Fetching guardian athletes for user:', context.userId)
            const { data: guardianAthletes, error: guardianError } = await supabase
                .rpc('get_guardian_athletes', {
                    p_user_id: context.userId,
                    p_org_id: context.orgId
                })
            
            if (guardianError) {
                console.error('[getAthletes] Query error:', guardianError)
                throw guardianError
            }
            // Transform guardian_athletes format to match get_athletes_with_guardian_status format
            data = (guardianAthletes || []).map((a: any) => ({
                athlete_id: a.athlete_id,
                first_name: a.first_name,
                last_name: a.last_name,
                birthdate: a.birthdate,
                gender: a.gender,
                preferred_name: null,
                jersey_number: null,
                medical_notes: null,
                allergies: null,
                emergency_contact_name: null,
                emergency_contact_phone: null,
                created_at: null,
                updated_at: null,
                deleted_at: null,
                family_id: null,
                has_active_guardian: a.status === 'active',
                profile_photo_updated_at: a.profile_photo_updated_at ?? null,
                has_profile_photo: a.has_profile_photo ?? false
            }))
        }

        console.log('[getAthletes] Query result:', { data, count: data?.length, isOrgAdmin })

        // Never show RLS contract test data (prefix from tests/rls-contract/helpers/seed.ts)
        const TEST_DATA_PREFIX = '__rls_test__'
        const filtered = (data || []).filter(
            (d: { first_name?: string | null }) =>
                d.first_name == null || !d.first_name.startsWith(TEST_DATA_PREFIX)
        )

        // Transform the data to match Athlete type with empty sports array
        // Sports can be fetched separately if needed
        const transformed = filtered.map((d: any) => ({
            id: d.athlete_id,
            family_id: d.family_id,
            first_name: d.first_name,
            last_name: d.last_name,
            date_of_birth: d.birthdate ? new Date(d.birthdate).toISOString().split('T')[0] : '',
            gender: d.gender,
            preferred_name: d.preferred_name ?? null,
            jersey_number: d.jersey_number ?? null,
            medical_notes: d.medical_notes ?? null,
            allergies: d.allergies ?? null,
            emergency_contact_name: d.emergency_contact_name ?? null,
            emergency_contact_phone: d.emergency_contact_phone ?? null,
            phone: d.phone ?? null,
            email: d.email ?? null,
            photo_url: null, // @deprecated - Use profile_photo_updated_at instead
            profile_photo_updated_at: d.profile_photo_updated_at ?? null,
            has_profile_photo: d.has_profile_photo ?? false,
            org_id: context.orgId, // Include org_id for photo URL generation
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
            deleted_at: d.deleted_at,
            sports: [], // Sports will be fetched separately if needed
            has_active_guardian: d.has_active_guardian ?? false // Include guardian status
        } as unknown as Child))
        
        debug.perf.end('familyService.getAthletes')
        debug.data('FamilyService.getAthletes', 'Response', { athleteCount: transformed.length })
        console.groupEnd()
        console.log('[getAthletes] Returning athletes:', transformed.length)
        return { data: transformed, error: null }
    } catch (err) {
        debug.perf.end('familyService.getAthletes')
        debug.error('FamilyService.getAthletes', 'Failed to get athletes', { error: err, orgId: context.orgId })
        console.groupEnd()
        console.error('[getAthletes] Error fetching athletes:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Fetch failed') }
    }
}

/**
 * Legacy alias for getAthletes
 * Maintains backward compatibility with existing code
 */
export async function getChildren(
    context: UserContext
): Promise<{ data: Child[]; error: Error | null }> {
    return getAthletes(context)
}

/**
 * Search athletes with filters (for adding existing athletes to teams)
 * 
 * This function:
 * - Performs server-side search (only fetches matching athletes)
 * - Filters by org via athlete_guardians or team_memberships
 * - Calculates age at database level for accuracy
 * - Includes current teams for each athlete
 * - Excludes athletes already on specified team/season
 * - Limits results to 100 for performance
 */
export async function searchAthletes(
    context: UserContext,
    params: SearchAthletesParams
): Promise<SearchAthletesResponse> {
    console.groupCollapsed(`%csearchAthletes: ${params.search || 'all'}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.searchAthletes', 'Request', { orgId: context.orgId, params })
    debug.perf.start('familyService.searchAthletes')

    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const fakeOrgId = DEMO_ORG_A_ID
            
            let results = fakeChildren
                .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === fakeOrgId)
                .map((c) => mapFakeChild(c, fakeOrgId))
            
            // Apply search filter
            if (params.search && params.search.length >= 2) {
                const searchLower = params.search.toLowerCase()
                results = results.filter(c => 
                    c.first_name.toLowerCase().includes(searchLower) ||
                    c.last_name.toLowerCase().includes(searchLower)
                )
            }
            
            // Apply age filter (client-side calculation for fake data)
            if (params.ageMin !== undefined || params.ageMax !== undefined) {
                results = results.filter(c => {
                    if (!c.date_of_birth) return false
                    const birthdate = new Date(c.date_of_birth)
                    const today = new Date()
                    let age = today.getFullYear() - birthdate.getFullYear()
                    const m = today.getMonth() - birthdate.getMonth()
                    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--
                    
                    if (params.ageMin !== undefined && age < params.ageMin) return false
                    if (params.ageMax !== undefined && age > params.ageMax) return false
                    return true
                })
            }
            
            // Limit results
            results = results.slice(0, 100)
            
            // Map to AthleteWithTeams with currentTeams for disambiguation
            const mapped: AthleteWithTeams[] = results.map(c => {
                const birthdate = c.date_of_birth ? new Date(c.date_of_birth) : null
                const age = birthdate
                    ? Math.floor((Date.now() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 365))
                    : null
                const memberships = getActiveTeamMembershipsForChild(c.id)
                const currentTeams: CurrentTeam[] = memberships.map((tm) => {
                    const team = getTeamById(tm.team_id)
                    return {
                        teamId: tm.team_id,
                        teamName: team?.name ?? tm.team_id,
                        seasonId: tm.season_id,
                    }
                })
                return {
                    ...c,
                    age,
                    currentTeams,
                } as unknown as AthleteWithTeams
            })
            
            debug.perf.end('familyService.searchAthletes')
            debug.data('FamilyService.searchAthletes', 'Response (fake)', { resultCount: mapped.length })
            console.groupEnd()
            return { data: mapped, error: null }
        } catch (err) {
            debug.perf.end('familyService.searchAthletes')
            debug.error('FamilyService.searchAthletes', 'Failed to search athletes (fake)', { error: err })
            console.groupEnd()
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation
    try {
        // Build base query with org filtering via athlete_guardians (Issue #3 solution)
        // This ensures we only see athletes from the user's org
        let query = supabase
            .from('athletes')
            .select(`
                id,
                first_name,
                last_name,
                birthdate,
                gender,
                preferred_name,
                jersey_number,
                medical_notes,
                allergies,
                emergency_contact_name,
                emergency_contact_phone,
                created_at,
                updated_at,
                deleted_at,
                family_id
            `)
            .is('deleted_at', null)
        
        // Filter by org via athlete_guardians join (explicit org filtering)
        // We'll use a subquery to filter athletes that have guardians in this org
        // For now, we'll rely on RLS + explicit org_id filtering if available
        // Note: RLS should handle org filtering, but we add explicit check for defense in depth
        
        // Apply search filter (Issue #1, #8 solution - server-side, min 2 chars)
        if (params.search && params.search.length >= 2) {
            query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`)
        } else if (params.search && params.search.length > 0) {
            // If search is less than 2 chars, return empty (don't search)
            return { data: [], error: null }
        }
        
        // Apply age filter using database calculation (Issue #4 solution)
        if (params.ageMin !== undefined || params.ageMax !== undefined) {
            // We'll need to use a raw SQL approach or filter after fetch
            // For now, fetch all and filter client-side (will optimize with RPC if needed)
            // TODO: Consider creating an RPC function for complex age filtering
        }
        
        // Apply level/program filters via team_memberships -> teams -> levels/programs
        // This is complex, so we'll filter after fetch for now
        // TODO: Optimize with proper joins if performance becomes an issue
        
        // Limit results (Issue #1 solution)
        query = query.limit(100)
        
        // Order by name
        query = query.order('first_name', { ascending: true })
        
        const { data, error } = await query
        
        if (error) {
            console.error('[searchAthletes] Query error:', error)
            throw error
        }
        
        // Map and enrich data
        const normalized = normalizeSupabaseResponse(data, true)
        
        // Exclude athletes already on team (Issue #7 solution - filter after fetch)
        let excludedAthleteIds: string[] = []
        if (params.excludeTeamId && params.excludeSeasonId) {
            const { data: existingMembers } = await supabase
                .from('team_memberships')
                .select('athlete_id')
                .eq('team_id', params.excludeTeamId)
                .eq('season_id', params.excludeSeasonId)
                .eq('status', 'active')
            
            excludedAthleteIds = (existingMembers || []).map((m: { athlete_id: string }) => m.athlete_id)
        }
        
        // Fetch current teams for each athlete (Issue #7 solution - always fresh)
        const athleteIds = (normalized || []).map((a: any) => a.id)
        const currentTeamsMap: Map<string, CurrentTeam[]> = new Map()
        
        if (athleteIds.length > 0) {
            const { data: teamsData } = await supabase
                .from('team_memberships')
                .select(`
                    athlete_id,
                    team_id,
                    season_id,
                    teams!inner(name),
                    seasons!inner(name)
                `)
                .in('athlete_id', athleteIds)
                .eq('status', 'active')
            
            if (teamsData) {
                teamsData.forEach((row: any) => {
                    const athleteId = row.athlete_id
                    if (!currentTeamsMap.has(athleteId)) {
                        currentTeamsMap.set(athleteId, [])
                    }
                    currentTeamsMap.get(athleteId)!.push({
                        teamId: row.team_id,
                        teamName: row.teams?.name || 'Unknown Team',
                        seasonId: row.season_id
                    })
                })
            }
        }
        
        // Map to AthleteWithTeams with type safety (Bug #4, #5 solution)
        const mapped: AthleteWithTeams[] = (normalized || [])
            .filter((row: unknown) => {
                // Filter out excluded athletes
                if (excludedAthleteIds.length > 0 && row && typeof row === 'object') {
                    const r = row as Record<string, unknown>
                    if (r.id && typeof r.id === 'string' && excludedAthleteIds.includes(r.id)) {
                        return false
                    }
                }
                return true
            })
            .map((row: unknown): AthleteWithTeams => {
            if (!row || typeof row !== 'object') {
                throw new Error('Invalid athlete data: not an object')
            }
            
            const r = row as Record<string, unknown>
            
            // Validate required fields
            if (!r.id || typeof r.id !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid id')
            }
            if (!r.first_name || typeof r.first_name !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid first_name')
            }
            if (!r.last_name || typeof r.last_name !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid last_name')
            }
            
            // Calculate age from birthdate (client-side fallback, prefer DB calculation)
            let age: number | null = null
            if (r.birthdate && typeof r.birthdate === 'string') {
                const birthdate = new Date(r.birthdate)
                if (!isNaN(birthdate.getTime())) {
                    const today = new Date()
                    age = today.getFullYear() - birthdate.getFullYear()
                    const m = today.getMonth() - birthdate.getMonth()
                    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
                        age--
                    }
                }
            }
            
            // Get current teams
            const currentTeams = currentTeamsMap.get(r.id as string) || []
            
            // Apply age filter if needed (client-side for now)
            if (params.ageMin !== undefined && age !== null && age < params.ageMin) {
                return null as any // Will filter out
            }
            if (params.ageMax !== undefined && age !== null && age > params.ageMax) {
                return null as any // Will filter out
            }
            
            return {
                id: r.id as string,
                family_id: (r.family_id as string | null) || null,
                first_name: r.first_name as string,
                last_name: r.last_name as string,
                date_of_birth: (r.birthdate as string | null) || '',
                gender: (r.gender as Gender | null) || null,
                preferred_name: (r.preferred_name as string | null) || null,
                jersey_number: (r.jersey_number as string | null) || null,
                medical_notes: (r.medical_notes as string | null) || null,
                allergies: (r.allergies as string | null) || null,
                emergency_contact_name: (r.emergency_contact_name as string | null) || null,
                emergency_contact_phone: (r.emergency_contact_phone as string | null) || null,
                phone: (r.phone as string | null) || null,
                email: (r.email as string | null) || null,
                photo_url: null, // photo_url column doesn't exist in database yet
                profile_photo_updated_at: (r.profile_photo_updated_at as string | null) || null,
                has_profile_photo: (r.has_profile_photo as boolean | null) ?? false,
                created_at: (r.created_at as string) || new Date().toISOString(),
                updated_at: (r.updated_at as string) || new Date().toISOString(),
                deleted_at: (r.deleted_at as string | null) || null,
                age,
                currentTeams
            } as unknown as AthleteWithTeams
        }).filter((a): a is AthleteWithTeams => a !== null)
        
        debug.perf.end('familyService.searchAthletes')
        debug.data('FamilyService.searchAthletes', 'Response (fake)', { resultCount: mapped.length })
        console.groupEnd()
        return { data: mapped, error: null         }
    } catch (err) {
        debug.perf.end('familyService.searchAthletes')
        debug.error('FamilyService.searchAthletes', 'Failed to search athletes (fake)', { error: err })
        console.groupEnd()
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Search failed')
        }
    }
}

/**
 * Get a single athlete by ID with sports data
 */
export async function getAthleteById(
    context: UserContext,
    athleteId: string,
    sensitiveAccess?: SensitiveAthleteAccess | null
): Promise<{ data: Child | null; error: Error | null }> {
    console.groupCollapsed(`%cgetAthleteById: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.getAthleteById', 'Request', { athleteId, orgId: context.orgId })
    debug.perf.start('familyService.getAthleteById')

    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = await buildPermissions(context)
            const child = fakeChildren.find(c => c.id === athleteId)
            
            if (!child) {
                debug.perf.end('familyService.getAthleteById')
                debug.data('FamilyService.getAthleteById', 'Response (not found, fake)', { athleteId })
                console.groupEnd()
                return { data: null, error: null }
            }
            
            // Check access
            if (!permissions.canViewAllOrgData) {
                let hasAccess = false
                
                // Check if coach can view this athlete (athlete is on coach's assigned teams)
                if (permissions.canViewAssignedTeams && permissions.assignedTeamIds.length > 0) {
                    const athleteIds = new Set<string>()
                    for (const teamId of permissions.assignedTeamIds) {
                        const members = getTeamMembersForSeason(teamId, SEASON_SPRING_CURRENT_ID)
                        members.forEach((m) => athleteIds.add(m.athlete_id))
                    }
                    if (athleteIds.has(athleteId)) {
                        hasAccess = true
                    }
                }
                
                // Check if guardian/parent can view this athlete (their own child)
                if (!hasAccess) {
                    const guardianUserId = getGuardianCanonicalUserId(context)
                    const ownedChildIds = getChildrenForUserId(guardianUserId)
                    if (ownedChildIds.includes(athleteId)) {
                        hasAccess = true
                    }
                }
                
                if (!hasAccess) {
                    debug.perf.end('familyService.getAthleteById')
                    debug.error('FamilyService.getAthleteById', 'Access denied (fake)', { athleteId })
                    console.groupEnd()
                    return { data: null, error: new Error('Access denied') }
                }
            }
            
            // Load athlete sports (same as real data path)
            let sports: Array<{ sport_id: string; sport_name: string; sport_type: 'plays' | 'interested' }> = []
            try {
                const fakeOrgId = DEMO_ORG_A_ID
                const { data: sportsData, error: sportsError } = await getAthleteSports(athleteId, fakeOrgId)
                if (!sportsError && sportsData) {
                    sports = sportsData.map(s => ({
                        sport_id: s.sport_id,
                        sport_name: s.sport_name,
                        sport_type: s.sport_type
                    }))
                }
            } catch (err) {
                console.warn('[getAthleteById] Error loading athlete sports (fake):', err)
                // Continue without sports data
            }
            
            const fakeOrgId = DEMO_ORG_A_ID
            const mappedChild = mapFakeChild(child, fakeOrgId)
            mappedChild.sports = sports
            
            debug.perf.end('familyService.getAthleteById')
            debug.data('FamilyService.getAthleteById', 'Response (fake)', { athleteId, hasData: true, sportCount: sports.length })
            console.groupEnd()
            return { data: mappedChild, error: null }
        } catch (err) {
            debug.perf.end('familyService.getAthleteById')
            debug.error('FamilyService.getAthleteById', 'Failed to get athlete (fake)', { error: err, athleteId })
            console.groupEnd()
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Data
    try {
        console.log('[getAthleteById] Fetching athlete:', athleteId)

        const accessResult = sensitiveAccess
            ? { data: sensitiveAccess, error: null }
            : await getAthleteSensitiveAccess(athleteId, context.orgId)
        const access = accessResult.data
        const canViewPii = canAccessSensitiveData(access, 'pii', 'read')
        const canViewMedical = canAccessSensitiveData(access, 'medical', 'read')
        const athleteSelect = [
            'id',
            'org_id',
            'family_id',
            'first_name',
            'last_name',
            'birthdate',
            'gender',
            'preferred_name',
            'jersey_number',
            'profile_photo_updated_at',
            'has_profile_photo',
            'height_cm',
            'weight_kg',
            'shoe_size_value',
            'shoe_size_system',
            'shoe_width',
            'tshirt_size',
            'shorts_size',
            'dominant_hand',
            'created_at',
            'updated_at',
            'deleted_at',
        ]

        if (canViewPii) {
            athleteSelect.push('phone', 'email')
        }

        const { data, error } = await supabase
            .from('athletes')
            .select(athleteSelect.join(', '))
            .eq('id', athleteId)
            .is('deleted_at', null)
            .single()

        console.log('[getAthleteById] Query result:', { data, error })

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                console.log('[getAthleteById] Athlete not found')
                return { data: null, error: null }
            }
            console.error('[getAthleteById] Query error:', error)
            throw error
        }

        if (!data) {
            return { data: null, error: null }
        }

        let medicalData: {
            medical_notes: string | null
            allergies: string | null
            emergency_contact: {
                name?: string | null
                phone?: string | null
                relationship?: string | null
                email?: string | null
            } | null
        } | null = null

        if (canViewMedical) {
            try {
                const { data: medicalRow, error: medicalError } = await supabase
                    .from('athlete_medical_private')
                    .select('medical_notes, allergies, emergency_contact')
                    .eq('athlete_id', athleteId)
                    .maybeSingle()

                if (!medicalError) {
                    medicalData = medicalRow as typeof medicalData
                }
            } catch (err) {
                console.warn('[getAthleteById] Error loading athlete medical data:', err)
            }
        }

        // Check if athlete has active guardian using RPC function
        let hasActiveGuardian = false
        try {
            const { data: guardianStatus, error: guardianError } = await supabase
                .rpc('athlete_has_active_guardian', {
                    p_athlete_id: athleteId,
                    p_org_id: context.orgId
                })
            
            if (!guardianError && guardianStatus !== null && typeof guardianStatus === 'boolean') {
                hasActiveGuardian = guardianStatus
            }
        } catch (err) {
            console.warn('[getAthleteById] Error checking guardian status:', err)
            // Continue without guardian status if check fails
        }

        // Load athlete sports
        let sports: Array<{ sport_id: string; sport_name: string; sport_type: 'plays' | 'interested' }> = []
        try {
            const { data: sportsData, error: sportsError } = await getAthleteSports(athleteId, context.orgId)
            if (!sportsError && sportsData) {
                sports = sportsData.map(s => ({
                    sport_id: s.sport_id,
                    sport_name: s.sport_name,
                    sport_type: s.sport_type
                }))
            }
        } catch (err) {
            console.warn('[getAthleteById] Error loading athlete sports:', err)
            // Continue without sports data
        }

        // Return athlete with sports data
        const athlete = {
            id: data.id,
            family_id: data.family_id,
            first_name: data.first_name,
            last_name: data.last_name,
            date_of_birth: data.birthdate || '',
            gender: data.gender as Gender | null,
            preferred_name: data.preferred_name ?? null,
            jersey_number: data.jersey_number ?? null,
            medical_notes: medicalData?.medical_notes ?? null,
            allergies: medicalData?.allergies ?? null,
            phone: canViewPii ? (data as any).phone ?? null : null,
            email: canViewPii ? (data as any).email ?? null : null,
            emergency_contact_name: canViewMedical ? medicalData?.emergency_contact?.name ?? null : null,
            emergency_contact_phone: canViewMedical ? medicalData?.emergency_contact?.phone ?? null : null,
            photo_url: null, // @deprecated - Use profile_photo_updated_at instead
            profile_photo_updated_at: (data as any).profile_photo_updated_at ?? null,
            has_profile_photo: (data as any).has_profile_photo ?? false,
            org_id: (data as any).org_id ?? context.orgId,
            height_cm: (data as any).height_cm ?? null,
            weight_kg: (data as any).weight_kg ?? null,
            shoe_size_value: (data as any).shoe_size_value ?? null,
            shoe_size_system: (data as any).shoe_size_system ?? null,
            shoe_width: (data as any).shoe_width ?? null,
            tshirt_size: (data as any).tshirt_size ?? null,
            shorts_size: (data as any).shorts_size ?? null,
            dominant_hand: (data as any).dominant_hand ?? null,
            emergency_contact: canViewMedical ? medicalData?.emergency_contact ?? null : null,
            created_at: data.created_at ?? new Date().toISOString(),
            updated_at: data.updated_at ?? new Date().toISOString(),
            deleted_at: data.deleted_at,
            sports: sports,
            has_active_guardian: hasActiveGuardian
        } as unknown as Child

        debug.perf.end('familyService.getAthleteById')
        debug.data('FamilyService.getAthleteById', 'Response', { athleteId, hasData: true, sportCount: sports.length, hasActiveGuardian })
        console.groupEnd()
        return { data: athlete, error: null }
    } catch (err) {
        debug.perf.end('familyService.getAthleteById')
        debug.error('FamilyService.getAthleteById', 'Failed to get athlete', { error: err, athleteId })
        console.groupEnd()
        console.error('[getAthleteById] Error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Fetch failed') }
    }
}

/**
 * Create athlete with guardians atomically
 * Uses RPC function for all-or-nothing transaction
 */
export async function createAthleteWithGuardians(
    context: UserContext,
    dto: CreateAthleteDTO
): Promise<{ data: { athlete_id: string; guardians: any[] } | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateAthleteWithGuardians: ${dto.first_name} ${dto.last_name}`, 'color: #666; font-weight: bold;');
    debug.flow('FamilyService.createAthleteWithGuardians', 'Creating athlete with guardians', { athleteName: `${dto.first_name} ${dto.last_name}`, guardianCount: (dto.guardians || []).length })
    debug.perf.start('familyService.createAthleteWithGuardians')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        const result = {
            data: {
                athlete_id: `demo-athlete-${Date.now()}`,
                guardians: (dto.guardians || []).map((g, idx) => ({
                    type: 'invite',
                    email: g.email,
                    status: 'pending',
                    id: `demo-invite-${idx}`
                }))
            },
            error: null
        }
        captureEvent('athlete_added', {
          athlete_id: result.data.athlete_id,
          user_id: context.userId,
          organization_id: context.orgId ?? undefined,
        })
        debug.perf.end('familyService.createAthleteWithGuardians')
        debug.flow('FamilyService.createAthleteWithGuardians', 'Athlete created with guardians (fake)', { athleteId: result.data.athlete_id })
        console.groupEnd()
        return result
    }

    try {
        // Check max_athletes tier limit before creating (if orgId available)
        if (context.orgId) {
            const limitResult = await getTierLimit(context.orgId, context.userId, 'max_athletes')
            if (limitResult.error) {
                // Fail open on error (allow creation) but log warning
                console.warn('[familyService] Failed to check max_athletes limit, allowing creation:', limitResult.error)
            } else if (limitResult.limit !== null) {
                // Count current athletes for this org
                const { count: currentAthleteCount, error: countError } = await supabase
                    .from('athletes')
                    .select('id', { count: 'exact', head: true })
                    .eq('org_id', context.orgId)
                    .is('deleted_at', null)

                if (!countError && currentAthleteCount !== null) {
                    if (isLimitExceeded(currentAthleteCount, limitResult.limit)) {
                        const errorMessage = `You've reached your athlete limit (${limitResult.limit} athletes). Upgrade your plan to add more athletes.`
                        debug.perf.end('familyService.createAthleteWithGuardians')
                        debug.error('FamilyService.createAthleteWithGuardians', 'Athlete limit exceeded', { currentCount: currentAthleteCount, limit: limitResult.limit })
                        console.groupEnd()
                        return { 
                            data: null, 
                            error: new Error(errorMessage)
                        }
                    }
                }
            }
        }
        // Prepare athlete data
        const athleteData = {
            first_name: dto.first_name,
            last_name: dto.last_name,
            birthdate: dto.date_of_birth,
            gender: dto.gender || null,
            preferred_name: dto.preferred_name || null,
            jersey_number: dto.jersey_number || null,
            medical_notes: dto.medical_notes || null,
            allergies: dto.allergies || null,
            emergency_contact_name: dto.emergency_contact_name || null,
            emergency_contact_phone: dto.emergency_contact_phone || null,
            phone: dto.phone || null,  // Athlete phone number
            email: dto.email || null,  // Athlete email address
            family_id: dto.family_id || null,
            team_id: dto.team_id || null,
            season_id: dto.season_id || null
        }

        // Prepare guardians array
        const guardians = (dto.guardians || []).map(g => ({
            email: g.email,
            relationship_type: g.relationship_type || 'parent'
        }))

        // Prepare sports array - filter empty entries, remove duplicates, validate types
        const sports = (dto.sports || [])
            .filter(s => s.sport_id && s.sport_id.trim()) // Filter empty sport_id
            .map(s => ({
                sport_id: s.sport_id.trim(),
                sport_type: (s.sport_type === 'plays' || s.sport_type === 'interested') 
                    ? s.sport_type 
                    : 'plays' as 'plays' | 'interested' // Default to 'plays' if invalid
            }))
        
        // Remove duplicates using Map (defense-in-depth)
        const uniqueSports = [...new Map(
            sports.map(s => [`${s.sport_id}-${s.sport_type}`, s])
        ).values()]

        // Call RPC function
        const { data, error } = await supabase
            .rpc('create_athlete_with_guardians', {
                p_org_id: context.orgId,
                p_athlete_data: athleteData,
                p_guardians: guardians,
                p_athlete_sports: uniqueSports.length > 0 ? uniqueSports : []
            })

        if (error) throw error

        const athleteId = (data as { athlete_id?: string })?.athlete_id
        if (athleteId) {
          captureEvent('athlete_added', {
            athlete_id: athleteId,
            user_id: context.userId,
            organization_id: context.orgId ?? undefined,
          })
        }
        debug.perf.end('familyService.createAthleteWithGuardians')
        debug.flow('FamilyService.createAthleteWithGuardians', 'Athlete created with guardians successfully', { athleteId })
        console.groupEnd()
        return { data: data as any, error: null }
    } catch (err) {
        debug.perf.end('familyService.createAthleteWithGuardians')
        debug.error('FamilyService.createAthleteWithGuardians', 'Failed to create athlete with guardians', { error: err, athleteName: `${dto.first_name} ${dto.last_name}` })
        console.groupEnd()
        console.error('Error creating athlete with guardians:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Create athlete failed')
        }
    }
}

/**
 * Get derived family for an athlete
 * Returns family computed from guardian relationships
 */
export async function getDerivedFamilyForAthlete(
    athleteId: string,
    orgId: string
): Promise<{ data: any | null; error: Error | null }> {
    console.groupCollapsed(`%cgetDerivedFamilyForAthlete: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('FamilyService.getDerivedFamilyForAthlete', 'Request', { athleteId, orgId })
    debug.perf.start('familyService.getDerivedFamilyForAthlete')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        const result = {
            data: {
                athlete_ids: [athleteId],
                guardian_ids: [],
                athletes: [],
                guardians: [],
                is_derived: true,
                has_guardians: false
            },
            error: null
        }
        debug.perf.end('familyService.getDerivedFamilyForAthlete')
        debug.data('FamilyService.getDerivedFamilyForAthlete', 'Response (fake)', { athleteId, hasData: !!result.data })
        console.groupEnd()
        return result
    }

    try {
        const { data, error } = await supabase
            .rpc('get_derived_family_for_athlete', {
                p_athlete_id: athleteId,
                p_org_id: orgId
            })

        if (error) throw error

        return { data, error: null }
    } catch (err) {
        console.error('Error getting derived family:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Get family failed')
        }
    }
}

/**
 * Get orphaned athletes (athletes with no guardians)
 */
export async function getOrphanedAthletes(
    orgId: string
): Promise<{ data: any[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: [], error: null }
    }

    try {
        const { data, error } = await supabase
            .rpc('get_orphaned_athletes', {
                p_org_id: orgId
            })

        if (error) throw error

        debug.perf.end('familyService.getOrphanedAthletes')
        debug.data('FamilyService.getOrphanedAthletes', 'Response', { orgId, count: (data || []).length })
        console.groupEnd()
        return { data: data || [], error: null }
    } catch (err) {
        debug.perf.end('familyService.getOrphanedAthletes')
        debug.error('FamilyService.getOrphanedAthletes', 'Failed to get orphaned athletes', { error: err, orgId })
        console.groupEnd()
        console.error('Error getting orphaned athletes:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Get orphaned athletes failed')
        }
    }
}

/**
 * Create athlete with guardians atomically
 * This is the recommended method for creating athletes
 */
export async function createAthlete(
    context: UserContext,
    dto: CreateAthleteDTO
): Promise<{ data: { athlete_id: string; guardians: any[] } | null; error: Error | null }> {
    return createAthleteWithGuardians(context, dto)
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Legacy alias for createAthleteBasic
 * @deprecated Use createAthleteBasic or createAthlete instead
 */
export async function createChild(
    context: UserContext,
    dto: CreateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    return createAthleteBasic(context, dto)
}

/**
 * Legacy alias for updateAthlete
 * @deprecated Use updateAthlete instead
 */
export async function updateChild(
    context: UserContext,
    childId: string,
    dto: UpdateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    return updateAthlete(context, childId, dto)
}

/**
 * Legacy alias for deleteAthlete
 * @deprecated Use deleteAthlete instead
 */
export async function deleteChild(
    context: UserContext,
    childId: string
): Promise<{ error: Error | null }> {
    return deleteAthlete(context, childId)
}
