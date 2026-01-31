import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { OrganizationContact, ContactCategory, OrganizationContactFormData } from '../../types/organizationContacts'
import {
    getFakeOrganizationContacts,
    upsertFakeDefaultContact,
    upsertFakeCategoryContact
} from '../fake/organizationContactsFakeService'

const supabaseAny = supabase as any

export async function getOrganizationContacts(orgId: string): Promise<{ data: OrganizationContact[] | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return getFakeOrganizationContacts(orgId)
        }

        const { data, error } = await supabaseAny
            .from('organization_contacts')
            .select('*')
            .eq('org_id', orgId)

        if (error) throw error

        return { data: data as OrganizationContact[], error: null }
    } catch (err) {
        console.error('Error fetching organization contacts:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getContactForCategory(orgId: string, category: ContactCategory): Promise<{ data: OrganizationContact | null; error: Error | null }> {
    try {
        const { data: contacts, error } = await getOrganizationContacts(orgId)
        if (error) throw error
        if (!contacts) return { data: null, error: new Error('No contacts found') }

        const defaultContact = contacts.find(c => c.category === 'default')
        const categoryContact = contacts.find(c => c.category === category)

        // Check if category contact is valid and custom
        if (
            categoryContact &&
            categoryContact.is_custom &&
            categoryContact.first_name &&
            categoryContact.last_name &&
            categoryContact.email
        ) {
            return { data: categoryContact, error: null }
        }

        // Fallback to default
        if (defaultContact) {
            return { data: defaultContact, error: null }
        }

        // Only if backfill failed or something else is wrong
        return { data: null, error: new Error('Default contact missing') }
    } catch (err) {
        console.error(`Error resolving contact for category ${category}:`, err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function upsertDefaultContact(
    orgId: string,
    payload: OrganizationContactFormData
): Promise<{ data: OrganizationContact | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return upsertFakeDefaultContact(orgId, payload)
        }

        const { data, error } = await supabaseAny
            .from('organization_contacts')
            .upsert({
                org_id: orgId,
                category: 'default',
                is_custom: true,
                first_name: payload.first_name,
                last_name: payload.last_name,
                email: payload.email,
                phone: payload.phone,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id, category' })
            .select()
            .single()

        if (error) throw error

        return { data: data as OrganizationContact, error: null }

    } catch (err) {
        console.error('Error updating default contact:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function upsertCategoryContact(
    orgId: string,
    category: ContactCategory,
    payload: OrganizationContactFormData
): Promise<{ data: OrganizationContact | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return upsertFakeCategoryContact(orgId, category, payload)
        }

        const { data, error } = await supabaseAny
            .from('organization_contacts')
            .upsert({
                org_id: orgId,
                category: category,
                is_custom: payload.is_custom,
                first_name: payload.first_name,
                last_name: payload.last_name,
                email: payload.email,
                phone: payload.phone,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id, category' })
            .select()
            .single()

        if (error) throw error

        return { data: data as OrganizationContact, error: null }

    } catch (err) {
        console.error(`Error updating contact for ${category}:`, err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
