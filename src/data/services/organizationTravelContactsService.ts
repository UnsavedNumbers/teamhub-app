import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { t } from '../../i18n'
import type {
  TravelContactCategoryOrg,
  OrganizationTravelContactRow,
} from '../../types/travelContacts'
import { TRAVEL_CONTACT_CATEGORIES_ORG } from '../../types/travelContacts'

const fakeTravelContactsStore = new Map<
  string,
  Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>
>()

const DEMO_TRAVEL_CONTACT_PRESETS: Record<
  TravelContactCategoryOrg,
  { first_name: string; last_name: string; email: string; phone: string | null }
> = {
  transportation: {
    first_name: 'Megan',
    last_name: 'Tran',
    email: 'transportation@riversideyouth.org',
    phone: '(555) 210-1101',
  },
  lodging: {
    first_name: 'Diego',
    last_name: 'Navarro',
    email: 'lodging@riversideyouth.org',
    phone: '(555) 210-1102',
  },
  venue: {
    first_name: 'Priya',
    last_name: 'Patel',
    email: 'venue@riversideyouth.org',
    phone: '(555) 210-1103',
  },
  emergency: {
    first_name: 'Coach',
    last_name: 'Davis',
    email: 'emergency@riversideyouth.org',
    phone: '(555) 210-1199',
  },
  general: {
    first_name: 'Lauren',
    last_name: 'Kim',
    email: 'travel@riversideyouth.org',
    phone: '(555) 210-1104',
  },
  default: {
    first_name: 'Jordan',
    last_name: 'Reed',
    email: 'support@riversideyouth.org',
    phone: '(555) 210-1100',
  },
}

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

function ensureFakeContacts(
  orgId: string
): Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null> {
  const existing = fakeTravelContactsStore.get(orgId)
  if (existing) return existing

  const now = new Date().toISOString()
  const initial = TRAVEL_CONTACT_CATEGORIES_ORG.reduce((acc, cat) => {
    const preset = DEMO_TRAVEL_CONTACT_PRESETS[cat]
    acc[cat] = {
      org_id: orgId,
      category: cat,
      first_name: preset.first_name,
      last_name: preset.last_name,
      email: preset.email,
      phone: preset.phone,
      updated_at: now,
    }
    return acc
  }, {} as Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>)

  fakeTravelContactsStore.set(orgId, initial)
  return initial
}

function isRlsError(error: Error): boolean {
  return (
    (error as any)?.code === '42501' ||
    error.message.toLowerCase().includes('row-level security')
  )
}

/**
 * Get all organization travel contacts
 */
export async function getOrganizationTravelContacts(
  context: UserContext
): Promise<{ data: Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>; error: Error | null }> {
  console.groupCollapsed(`%cgetOrganizationTravelContacts: ${context?.orgId}`, 'color: #666; font-weight: bold;');
  debug.data('OrganizationTravelContactsService.getOrganizationTravelContacts', 'Request', { orgId: context?.orgId })
  debug.perf.start('organizationTravelContactsService.getOrganizationTravelContacts')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      if (!context?.orgId) {
        debug.perf.end('organizationTravelContactsService.getOrganizationTravelContacts')
        debug.error('OrganizationTravelContactsService.getOrganizationTravelContacts', 'orgId is required', { orgId: context?.orgId })
        console.groupEnd()
        return { data: {} as any, error: new Error(t('common.error.notFound' as any)) }
      }
      const result = ensureFakeContacts(context.orgId)
      debug.perf.end('organizationTravelContactsService.getOrganizationTravelContacts')
      debug.data('OrganizationTravelContactsService.getOrganizationTravelContacts', 'Response (fake)', { orgId: context.orgId })
      console.groupEnd()
      return { data: result, error: null }
    }

    if (!context?.orgId) {
      debug.perf.end('organizationTravelContactsService.getOrganizationTravelContacts')
      debug.error('OrganizationTravelContactsService.getOrganizationTravelContacts', 'orgId is required', { orgId: context?.orgId })
      console.groupEnd()
      return { data: {} as any, error: new Error(t('common.error.notFound' as any)) }
    }

    const { data, error } = await supabase
      .from('organization_travel_contacts')
      .select('*')
      .eq('org_id', context.orgId)

    if (error) throw error

    // Initialize with nulls
    const result = TRAVEL_CONTACT_CATEGORIES_ORG.reduce((acc, cat) => {
      acc[cat] = null
      return acc
    }, {} as Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>)

    // Fill with data
    data?.forEach((row: any) => {
      if (TRAVEL_CONTACT_CATEGORIES_ORG.includes(row.category)) {
        result[row.category as TravelContactCategoryOrg] = row as OrganizationTravelContactRow
      }
    })

    debug.perf.end('organizationTravelContactsService.getOrganizationTravelContacts')
    debug.data('OrganizationTravelContactsService.getOrganizationTravelContacts', 'Response', { orgId: context.orgId })
    console.groupEnd()
    return { data: result, error: null }
  } catch (err) {
    debug.perf.end('organizationTravelContactsService.getOrganizationTravelContacts')
    debug.error('OrganizationTravelContactsService.getOrganizationTravelContacts', 'Failed to get organization travel contacts', { error: err, orgId: context?.orgId })
    console.groupEnd()
    console.error('getOrganizationTravelContacts error:', err)
    if (err instanceof Error && isRlsError(err)) {
      return { data: {} as any, error: new Error(t('common.error.permissionDenied' as any)) }
    }
    return { data: {} as any, error: err instanceof Error ? err : new Error(t('common.error.loadFailed' as any)) }
  }
}

/**
 * Upsert an organization travel contact
 */
export async function upsertOrganizationTravelContact(
  context: UserContext,
  category: TravelContactCategoryOrg,
  contact: { first_name: string; last_name: string; email: string; phone?: string | null }
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    if (!context?.orgId) {
      return { error: new Error(t('common.error.notFound' as any)) }
    }
    const store = ensureFakeContacts(context.orgId)
    store[category] = {
      org_id: context.orgId,
      category,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone ?? null,
      updated_at: new Date().toISOString(),
    }
    fakeTravelContactsStore.set(context.orgId, store)
    return { error: null }
  }

  try {
    if (!context?.orgId) {
      return { error: new Error(t('common.error.notFound' as any)) }
    }

    const { error } = await supabase
      .from('organization_travel_contacts')
      .upsert({
        org_id: context.orgId,
        category,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id,category'
      })

    if (error) throw error

    debug.perf.end('organizationTravelContactsService.upsertOrganizationTravelContact')
    debug.flow('OrganizationTravelContactsService.upsertOrganizationTravelContact', 'Travel contact upserted successfully', { orgId: context.orgId, category })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('organizationTravelContactsService.upsertOrganizationTravelContact')
    debug.error('OrganizationTravelContactsService.upsertOrganizationTravelContact', 'Failed to upsert travel contact', { error: err, orgId: context?.orgId, category })
    console.groupEnd()
    console.error('upsertOrganizationTravelContact error:', err)
    if (err instanceof Error && isRlsError(err)) {
      return { error: new Error(t('common.error.permissionDenied' as any)) }
    }
    return { error: err instanceof Error ? err : new Error(t('common.error.updateFailed' as any)) }
  }
}
