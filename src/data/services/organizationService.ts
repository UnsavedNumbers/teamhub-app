
import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { Organization, OrganizationStatus } from '../../types/domain/Organization'
import {
    getOrganizationDetails as getFakeOrganizationDetails,
    updateOrganizationDetails as updateFakeOrganizationDetails,
    uploadOrganizationLogo as uploadFakeOrganizationLogo,
    getOrganizationBySlug as getFakeOrganizationBySlug,
    updateOrganizationSlug as updateFakeOrganizationSlug,
    getOrganizationSlug as getFakeOrganizationSlug,
    checkOrganizationSlugAvailability as checkFakeOrganizationSlugAvailability,
} from '../fake/organizationFakeService'


export interface OrganizationUpdateDTO {
    name?: string
    website?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    place_id?: string | null
    latitude?: number | null
    longitude?: number | null
    logo_url?: string | null
    profile_visible_to_fans?: boolean | null
}

// Define explicit row type to handle stale database.types.ts
interface OrganizationRow {
    id: string
    name: string
    slug: string | null
    org_type?: string | null
    status?: string | null
    created_at: string
    updated_at: string
    website?: string | null
    phone?: string | null
    email?: string | null
    contact_email?: string | null // DB column name
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    place_id?: string | null
    latitude?: number | null
    longitude?: number | null
    logo_url?: string | null
    profile_visible_to_fans?: boolean
}

export async function getOrganizationDetails(orgId: string): Promise<{ data: Organization | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return getFakeOrganizationDetails(orgId)
        }

        if (!orgId) {
            return { data: null, error: new Error('Organization ID is required') }
        }

        const { data: rawData, error } = await supabase
            .from('organizations')
            .select(`
                *,
                license_status,
                license_plan,
                license_trial_ends_at,
                license_current_period_end,
                stripe_customer_id,
                payout_account_id
            `)
            .eq('id', orgId)
            .maybeSingle()

        if (error) throw error
        if (!rawData) return { data: null, error: null }

        // Cast to known type to bypass stale generated types
        const data = rawData as unknown as OrganizationRow

        const org: Organization = {
            id: data.id,
            name: data.name,
            slug: data.slug || null,
            orgType: data.org_type || null, // Assuming org_type exists from Context def, but might be missing in schema. Using fallback.
            status: (data.status || 'active') as OrganizationStatus, // Use status from DB (org_status enum: 'trial', 'active', 'suspended', 'inactive')
            createdAt: data.created_at,
            updatedAt: data.updated_at,

            // License & Stripe - nulls for now as they might be in other tables or not implemented
            licenseStatus: null,
            licensePlan: null,
            licenseTrialEndsAt: null,
            licenseCurrentPeriodEnd: null,
            payoutAccountId: null,
            payoutsEnabled: false,
            stripeConnected: false,

            // Counts - would need separate queries or value counts
            teamCount: 0,
            sportCount: 0,
            userCount: 0,

            // Profile
            website: data.website || null,
            phone: data.phone || null,
            email: (data.contact_email ?? data.email) || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zip: data.zip || null,
            place_id: data.place_id || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            logo_url: data.logo_url || null,
            profile_visible_to_fans: data.profile_visible_to_fans || null,
        }

        return { data: org, error: null }
    } catch (err) {
        console.error('[organizationService] Error fetching organization:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getOrganizationBySlug(slug: string): Promise<{ data: Organization | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return getFakeOrganizationBySlug(slug)
        }

        if (!slug) {
            return { data: null, error: new Error('Slug is required') }
        }

        const { data: rawData, error } = await supabase
            .from('organizations')
            .select(`
                *,
                license_status,
                license_plan,
                license_trial_ends_at,
                license_current_period_end,
                stripe_customer_id,
                payout_account_id
            `)
            .eq('slug', slug)
            .maybeSingle()

        if (error) throw error
        if (!rawData) return { data: null, error: null }

        // Cast to known type to bypass stale generated types
        const data = rawData as unknown as OrganizationRow

        const org: Organization = {
            id: data.id,
            name: data.name,
            slug: data.slug || null,
            orgType: data.org_type || null,
            status: (data.status || 'active') as OrganizationStatus,
            createdAt: data.created_at,
            updatedAt: data.updated_at,

            // License & Stripe
            licenseStatus: null,
            licensePlan: null,
            licenseTrialEndsAt: null,
            licenseCurrentPeriodEnd: null,
            payoutAccountId: null,
            payoutsEnabled: false,
            stripeConnected: false,

            // Counts
            teamCount: 0,
            sportCount: 0,
            userCount: 0,

            // Profile
            website: data.website || null,
            phone: data.phone || null,
            email: (data.contact_email ?? data.email) || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zip: data.zip || null,
            place_id: data.place_id || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            logo_url: data.logo_url || null,
            profile_visible_to_fans: data.profile_visible_to_fans || null,
        }

        return { data: org, error: null }
    } catch (err) {
        console.error('[organizationService] Error fetching organization by slug:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function updateOrganizationSlug(
    orgId: string,
    slug: string
): Promise<{ error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return updateFakeOrganizationSlug(orgId, slug)
        }

        if (!orgId) return { error: new Error('Organization ID is required') }
        if (!slug) return { error: new Error('Slug is required') }

        const { error } = await supabase.rpc('update_org_slug', {
            p_org_id: orgId,
            p_new_slug: slug,
        })

        if (error) throw error

        return { error: null }
    } catch (err) {
        console.error('[organizationService] Error updating organization slug:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getOrganizationSlug(
    orgId: string
): Promise<{ data: string | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return getFakeOrganizationSlug(orgId)
        }

        if (!orgId) {
            return { data: null, error: new Error('Organization ID is required') }
        }

        // Prefer secure RPC when available
        const { data, error } = await supabase.rpc('get_org_slug_by_id', {
            p_org_id: orgId,
        })

        if (!error) {
            return { data: data ?? null, error: null }
        }

        // Fallback to direct select (for environments without RPC)
        const { data: row, error: selectError } = await supabase
            .from('organizations')
            .select('slug')
            .eq('id', orgId)
            .maybeSingle()

        if (selectError) throw selectError

        return { data: row?.slug ?? null, error: null }
    } catch (err) {
        console.error('[organizationService] Error fetching organization slug:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function checkOrganizationSlugAvailability(
    slug: string,
    orgId?: string
): Promise<{ available: boolean; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return checkFakeOrganizationSlugAvailability(slug, orgId)
        }

        if (!slug) {
            return { available: false, error: new Error('Slug is required') }
        }

        const normalized = slug.toLowerCase().trim()
        const { data, error } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', normalized)
            .maybeSingle()

        if (error) throw error

        const available = !data || (orgId ? data.id === orgId : false)
        return { available, error: null }
    } catch (err) {
        console.error('[organizationService] Error checking slug availability:', err)
        return { available: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function updateOrganizationDetails(
    orgId: string,
    updates: OrganizationUpdateDTO
): Promise<{ data: Organization | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return updateFakeOrganizationDetails(orgId, updates)
        }

        if (!orgId) {
            return { data: null, error: new Error('Organization ID is required') }
        }

        if (updates.name !== undefined && updates.name.trim().length === 0) {
            return { data: null, error: new Error('Organization name is required') }
        }

        const { data: rawData, error } = await supabase
            .from('organizations')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', orgId)
            .select()
            .single()

        if (error) throw error
        if (!rawData) throw new Error('Organization not found after update')

        const data = rawData as unknown as OrganizationRow

        // Return the updated organization in domain format
        const org: Organization = {
            id: data.id,
            name: data.name,
            slug: data.slug || null,
            orgType: data.org_type || null,
            status: 'active',
            createdAt: data.created_at,
            updatedAt: data.updated_at,

            licenseStatus: null,
            licensePlan: null,
            licenseTrialEndsAt: null,
            licenseCurrentPeriodEnd: null,
            payoutAccountId: null,
            payoutsEnabled: false,
            stripeConnected: false,

            teamCount: 0,
            sportCount: 0,
            userCount: 0,

            website: data.website || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zip: data.zip || null,
            place_id: data.place_id || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            logo_url: data.logo_url || null,
            profile_visible_to_fans: data.profile_visible_to_fans || null,
        }

        return { data: org, error: null }
    } catch (err) {
        console.error('[organizationService] Error updating organization:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function uploadOrganizationLogo(
    orgId: string,
    file: File
): Promise<{ path: string | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return uploadFakeOrganizationLogo(orgId, file)
        }

        if (!orgId) {
            return { path: null, error: new Error('Organization ID is required') }
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `org-logos/${orgId}/logo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
            .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        // Get the full public URL for the logo
        const { data } = supabase.storage.from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET).getPublicUrl(filePath)
        return { path: data.publicUrl, error: null }
    } catch (err) {
        console.error('[organizationService] Error uploading logo:', err)
        return { path: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function uploadTicketBanner(
    orgId: string,
    eventId: string,
    file: File
): Promise<{ path: string | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return { path: `fake-banner-${eventId}.png`, error: null }
        }

        if (!orgId) return { path: null, error: new Error('Organization ID is required') }
        if (!eventId) return { path: null, error: new Error('Event ID is required') }

        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `banner-${Date.now()}.${fileExt}`
        const filePath = `event-banners/${orgId}/ticket-banners/${eventId}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
            .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET).getPublicUrl(filePath)
        return { path: data.publicUrl, error: null }
    } catch (err) {
        console.error('[organizationService] Error uploading ticket banner:', err)
        return { path: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
