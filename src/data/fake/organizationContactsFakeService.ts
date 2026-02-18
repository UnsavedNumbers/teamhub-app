import type { OrganizationContact, ContactCategory, OrganizationContactFormData } from '../../types/organizationContacts'
import { CONTACT_CATEGORIES } from '../../types/organizationContacts'
// Simple UUID v4 generator for fake data
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// In-memory store
const fakeContactsStore: Record<string, Record<string, OrganizationContact>> = {}

const CATEGORY_CONTACT_PRESETS: Record<Exclude<ContactCategory, 'default'>, Omit<OrganizationContact, 'id' | 'org_id' | 'category' | 'updated_at'>> = {
    billing: {
        is_custom: true,
        first_name: 'Avery',
        last_name: 'Coleman',
        email: 'billing@riversideyouth.org',
        phone: '(555) 301-1101',
    },
    uniforms: {
        is_custom: true,
        first_name: 'Samantha',
        last_name: 'Brooks',
        email: 'uniforms@riversideyouth.org',
        phone: '(555) 301-1102',
    },
    scheduling: {
        is_custom: true,
        first_name: 'Noah',
        last_name: 'Bennett',
        email: 'scheduling@riversideyouth.org',
        phone: '(555) 301-1103',
    },
    travel: {
        is_custom: true,
        first_name: 'Lauren',
        last_name: 'Kim',
        email: 'travel@riversideyouth.org',
        phone: '(555) 301-1104',
    },
    registration: {
        is_custom: true,
        first_name: 'Mia',
        last_name: 'Hernandez',
        email: 'registration@riversideyouth.org',
        phone: '(555) 301-1105',
    },
    general: {
        is_custom: true,
        first_name: 'Jordan',
        last_name: 'Reed',
        email: 'support@riversideyouth.org',
        phone: '(555) 301-1100',
    },
}

const ensureOrgContacts = (orgId: string) => {
    if (!fakeContactsStore[orgId]) {
        const now = new Date().toISOString()
        fakeContactsStore[orgId] = {
            default: {
                id: uuidv4(),
                org_id: orgId,
                category: 'default',
                is_custom: true,
                first_name: 'Organization',
                last_name: 'Contact',
                email: 'contact@example.org',
                phone: '(555) 123-4567',
                updated_at: now,
            }
        }
        // Initialize other categories as empty/non-custom
        CONTACT_CATEGORIES.forEach(cat => {
            if (cat !== 'default') {
                const preset = CATEGORY_CONTACT_PRESETS[cat]
                fakeContactsStore[orgId][cat] = {
                    id: uuidv4(),
                    org_id: orgId,
                    category: cat,
                    is_custom: preset.is_custom,
                    first_name: preset.first_name,
                    last_name: preset.last_name,
                    email: preset.email,
                    phone: preset.phone ?? null,
                    updated_at: now,
                }
            }
        })
    }
    return fakeContactsStore[orgId]
}

export async function getFakeOrganizationContacts(orgId: string): Promise<{ data: OrganizationContact[]; error: null }> {
    const contacts = ensureOrgContacts(orgId)
    return { data: Object.values(contacts), error: null }
}

export async function upsertFakeDefaultContact(
    orgId: string,
    payload: OrganizationContactFormData
): Promise<{ data: OrganizationContact; error: null }> {
    const contacts = ensureOrgContacts(orgId)
    const now = new Date().toISOString()

    contacts['default'] = {
        ...contacts['default'],
        ...payload,
        is_custom: true, // Always true for default
        updated_at: now
    }

    return { data: contacts['default'], error: null }
}

export async function upsertFakeCategoryContact(
    orgId: string,
    category: ContactCategory,
    payload: OrganizationContactFormData
): Promise<{ data: OrganizationContact; error: null }> {
    const contacts = ensureOrgContacts(orgId)
    const now = new Date().toISOString()

    if (category === 'default') {
        return upsertFakeDefaultContact(orgId, payload)
    }

    contacts[category] = {
        ...contacts[category],
        ...payload,
        updated_at: now
    }

    return { data: contacts[category], error: null }
}
