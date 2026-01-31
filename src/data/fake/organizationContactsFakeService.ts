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
                fakeContactsStore[orgId][cat] = {
                    id: uuidv4(),
                    org_id: orgId,
                    category: cat,
                    is_custom: false,
                    first_name: '',
                    last_name: '',
                    email: '',
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
