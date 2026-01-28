
import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { Organization, OrganizationStatus } from '../../types/domain/Organization'
import {
    getOrganizationDetails as getFakeOrganizationDetails,
    updateOrganizationDetails as updateFakeOrganizationDetails,
    uploadOrganizationLogo as uploadFakeOrganizationLogo,
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
    logo_path?: string | null
}

// Define explicit row type to handle stale database.types.ts
interface OrganizationRow {
    id: string
    name: string
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
            .select('*')
            .eq('id', orgId)
            .single()

        if (error) throw error
        if (!rawData) return { data: null, error: null }

        // Cast to known type to bypass stale generated types
        const data = rawData as unknown as OrganizationRow

        const org: Organization = {
            id: data.id,
            name: data.name,
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
        }

        return { data: org, error: null }
    } catch (err) {
        console.error('[organizationService] Error fetching organization:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
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
        const filePath = `${orgId}/logo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('organization-assets')
            .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        return { path: filePath, error: null }
    } catch (err) {
        console.error('[organizationService] Error uploading logo:', err)
        return { path: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
