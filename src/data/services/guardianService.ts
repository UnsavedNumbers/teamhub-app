/**
 * Guardian Service
 *
 * Provides data access for guardian operations including:
 * - Guardian email matching and lookup
 * - Linking guardians to athletes
 * - Managing guardian relationships
 * - Getting athletes for a guardian
 */

import { Database } from '@/lib/database.types'
import { supabase } from '../../lib/supabase'
import type {
    Guardian,
    GuardianMatch,
    AthleteGuardian,
    Athlete,
    RelationshipType
} from '../../types/family'

type ParentInvite = Database['public']['Tables']['parent_invites']['Row']

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize email on client side (matches server-side normalization)
 */
export function normalizeEmail(email: string): string {
    if (!email) return ''

    const normalized = email.toLowerCase().trim()
    const [local, domain] = normalized.split('@')

    if (!local || !domain) return normalized

    // Gmail-specific normalization
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        // Remove dots and everything after +
        const cleanLocal = local.replace(/\./g, '').split('+')[0]
        return `${cleanLocal}@${domain}`
    }

    return normalized
}

/**
 * Validate email format
 */
export function validateGuardianEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// ============================================================================
// Guardian Lookup & Matching
// ============================================================================

/**
 * Find existing guardian by email with normalized matching
 */
export async function findGuardianByEmail(
    email: string,
    orgId: string
): Promise<{ data: GuardianMatch | null; error: Error | null }> {
    try {
        if (!email || !validateGuardianEmail(email)) {
            return {
                data: null,
                error: new Error('Invalid email format')
            }
        }

        // Call RPC function that does normalized email matching
        const { data, error } = await supabase
            .rpc('find_guardian_by_email', {
                p_email: email,
                p_org_id: orgId
            })
            .single()

        if (error) {
            // No user found is not an error - just return no match
            if (error.code === 'PGRST116') {
                return {
                    data: {
                        exists: false,
                        user: null,
                        linkedAthletes: [],
                        suggestion: 'create_invite'
                    },
                    error: null
                }
            }
            throw error
        }

        if (!data) {
            return {
                data: {
                    exists: false,
                    user: null,
                    linkedAthletes: [],
                    suggestion: 'create_invite'
                },
                error: null
            }
        }

        type LinkedAthlete = { id: string; first_name: string; last_name: string; birthdate: string }

        // Parse linked_athletes JSONB
        const linkedAthletes = Array.isArray(data.linked_athletes)
            ? data.linked_athletes as LinkedAthlete[]
            : []

        return {
            data: {
                exists: true,
                user: {
                    id: data.user_id,
                    email: data.email,
                    display_name: data.display_name,
                    phone: data.phone
                },
                linkedAthletes,
                suggestion: 'link'
            },
            error: null
        }
    } catch (err) {
        console.error('Error finding guardian by email:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Check if guardian is already linked to an athlete
 */
export async function isGuardianLinkedToAthlete(
    athleteId: string,
    email: string,
    orgId: string
): Promise<{ isLinked: boolean; error: Error | null }> {
    try {
        const { data: match, error } = await findGuardianByEmail(email, orgId)

        if (error || !match || !match.exists) {
            return { isLinked: false, error }
        }

        // Check if this athlete is in the linked athletes list
        const isLinked = match.linkedAthletes.some(a => a.id === athleteId)

        return { isLinked, error: null }
    } catch (err) {
        return {
            isLinked: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Guardian Linking
// ============================================================================

/**
 * Link guardian to athlete (creates athlete_guardians or parent_invites)
 * Uses RPC for atomic operation with advisory locks
 */
export async function linkGuardianToAthlete(
    athleteId: string,
    email: string,
    orgId: string,
    relationshipType: RelationshipType = 'parent'
): Promise<{ data: AthleteGuardian | ParentInvite | null; error: Error | null }> {
    try {
        if (!email || !validateGuardianEmail(email)) {
            return {
                data: null,
                error: new Error('Invalid email format')
            }
        }

        const { data, error } = await supabase
            .rpc('link_guardian_to_athlete', {
                p_athlete_id: athleteId,
                p_email: email,
                p_org_id: orgId,
                p_relationship_type: relationshipType
            })

        if (error) throw error

        return { data, error: null }
    } catch (err) {
        console.error('Error linking guardian to athlete:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Remove guardian from athlete (soft delete)
 */
export async function removeGuardianFromAthlete(
    athleteId: string,
    userId: string,
    orgId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .rpc('remove_guardian_from_athlete', {
                p_athlete_id: athleteId,
                p_user_id: userId,
                p_org_id: orgId
            })

        if (error) throw error

        const success = typeof data === 'object' && data !== null && !Array.isArray(data) && 'success' in data && typeof (data as any).success === 'boolean' ? (data as any).success : false

        return { success: success || false, error: null }
    } catch (err) {
        console.error('Error removing guardian from athlete:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Get Guardian Relationships
// ============================================================================

/**
 * Get all guardians for an athlete
 */
export async function getAthleteGuardians(
    athleteId: string,
    orgId: string
): Promise<{ data: Guardian[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .rpc('get_athlete_guardians', {
                p_athlete_id: athleteId,
                p_org_id: orgId
            })

        if (error) throw error

        const guardians: Guardian[] = (data || []).map((g: any) => ({
            id: g.guardian_id,
            user_id: g.user_id,
            email: g.email,
            display_name: g.display_name,
            phone: g.phone,
            relationship_type: g.relationship_type || 'parent',
            status: g.status
        }))

        return { data: guardians, error: null }
    } catch (err) {
        console.error('Error getting athlete guardians:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get all athletes for a guardian (by user ID)
 */
export async function getGuardianAthletes(
    userId: string,
    orgId: string
): Promise<{ data: Athlete[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .rpc('get_guardian_athletes', {
                p_user_id: userId,
                p_org_id: orgId
            })

        if (error) throw error

        const athletes: Athlete[] = (data || []).map((a: any) => ({
            id: a.athlete_id,
            first_name: a.first_name,
            last_name: a.last_name,
            date_of_birth: a.birthdate,
            gender: a.gender,
            family_id: null,  // Families are derived
            jersey_number: null,
            medical_notes: null,
            allergies: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null
        }))

        return { data: athletes, error: null }
    } catch (err) {
        console.error('Error getting guardian athletes:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get pending invites for an athlete
 */
export async function getAthleteInvites(
    athleteId: string,
    orgId: string
): Promise<{ data: ParentInvite[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('parent_invites')
            .select('*')
            .eq('athlete_id', athleteId)
            .eq('org_id', orgId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error

        return { data: data ?? [], error: null }
    } catch (err) {
        console.error('Error getting athlete invites:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Cancel a pending invite
 */
export async function cancelInvite(
    inviteId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('parent_invites')
            .update({ status: 'cancelled' })
            .eq('id', inviteId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error cancelling invite:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Resend invite (extend expiration)
 */
export async function resendInvite(
    inviteId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)  // Extend by 30 days

        const { error } = await supabase
            .from('parent_invites')
            .update({
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', inviteId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error resending invite:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}
