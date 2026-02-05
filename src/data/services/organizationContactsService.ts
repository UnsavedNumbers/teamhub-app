import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { OrganizationContact, ContactCategory, OrganizationContactFormData } from '../../types/organizationContacts'
import {
    getFakeOrganizationContacts,
    upsertFakeDefaultContact,
    upsertFakeCategoryContact
} from '../fake/organizationContactsFakeService'
import { organizationContactSchema, defaultContactSchema } from '../../types/organizationContacts'
import { t } from '../../i18n'

function isRlsError(error: Error): boolean {
    return (
        (error as any)?.code === '42501' ||
        error.message.toLowerCase().includes('row-level security')
    )
}

export async function getOrganizationContacts(orgId: string): Promise<{ data: OrganizationContact[] | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            return getFakeOrganizationContacts(orgId)
        }

        if (!orgId) {
            return { data: null, error: new Error(t('common.error.notFound' as any)) }
        }

        const { data, error } = await supabase
            .from('organization_contacts')
            .select('*')
            .eq('org_id', orgId)

        if (error) throw error

        return { data: data as OrganizationContact[], error: null }
    } catch (err) {
        console.error('Error fetching organization contacts:', err)
        if (err instanceof Error && isRlsError(err)) {
            return { data: null, error: new Error(t('common.error.permissionDenied' as any)) }
        }
        return { data: null, error: err instanceof Error ? err : new Error(t('common.error.loadFailed' as any)) }
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

        if (!orgId) {
            return { data: null, error: new Error(t('common.error.notFound' as any)) }
        }

        const parsed = defaultContactSchema.parse({
            first_name: payload.first_name?.trim(),
            last_name: payload.last_name?.trim(),
            email: payload.email?.trim(),
            phone: payload.phone ?? null,
            is_custom: true,
        })

        const { data, error } = await supabase
            .from('organization_contacts')
            .upsert({
                org_id: orgId,
                category: 'default',
                is_custom: true,
                first_name: parsed.first_name,
                last_name: parsed.last_name,
                email: parsed.email,
                phone: parsed.phone ?? null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id, category' })
            .select()
            .single()

        if (error) throw error

        return { data: data as OrganizationContact, error: null }

    } catch (err) {
        console.error('Error updating default contact:', err)
        if (err instanceof Error && isRlsError(err)) {
            return { data: null, error: new Error(t('common.error.permissionDenied' as any)) }
        }
        return { data: null, error: err instanceof Error ? err : new Error(t('common.error.updateFailed' as any)) }
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

        if (!orgId) {
            return { data: null, error: new Error(t('common.error.notFound' as any)) }
        }

        const shouldValidate = payload.is_custom === true
        const parsed = shouldValidate
            ? organizationContactSchema.parse({
                first_name: payload.first_name?.trim(),
                last_name: payload.last_name?.trim(),
                email: payload.email?.trim(),
                phone: payload.phone ?? null,
                is_custom: payload.is_custom ?? false,
            })
            : {
                first_name: payload.first_name?.trim() ?? '',
                last_name: payload.last_name?.trim() ?? '',
                email: payload.email?.trim() ?? '',
                phone: payload.phone ?? null,
                is_custom: payload.is_custom ?? false,
            }

        const { data, error } = await supabase
            .from('organization_contacts')
            .upsert({
                org_id: orgId,
                category: category,
                is_custom: parsed.is_custom,
                first_name: parsed.first_name,
                last_name: parsed.last_name,
                email: parsed.email,
                phone: parsed.phone ?? null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id, category' })
            .select()
            .single()

        if (error) throw error

        return { data: data as OrganizationContact, error: null }

    } catch (err) {
        console.error(`Error updating contact for ${category}:`, err)
        if (err instanceof Error && isRlsError(err)) {
            return { data: null, error: new Error(t('common.error.permissionDenied' as any)) }
        }
        return { data: null, error: err instanceof Error ? err : new Error(t('common.error.updateFailed' as any)) }
    }
}
