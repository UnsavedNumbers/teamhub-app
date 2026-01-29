import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { UserContext } from '../fake/userContext'
import type {
  TravelContactCategoryOrg,
  OrganizationTravelContactRow,
} from '../../types/travelContacts'
import { TRAVEL_CONTACT_CATEGORIES_ORG } from '../../types/travelContacts'

/**
 * Get all organization travel contacts
 */
export async function getOrganizationTravelContacts(
  context: UserContext
): Promise<{ data: Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>; error: Error | null }> {
  if (USE_FAKE_DATA) {
    // Fake data stub - return empty map
    const result = TRAVEL_CONTACT_CATEGORIES_ORG.reduce((acc, cat) => {
      acc[cat] = null
      return acc
    }, {} as Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null>)
    return { data: result, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('organization_travel_contacts')
      .select('*')
      .eq('org_id', context.orgId!)

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

    return { data: result, error: null }
  } catch (err) {
    console.error('getOrganizationTravelContacts error:', err)
    return { data: {} as any, error: err instanceof Error ? err : new Error('Unknown error') }
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
    return { error: null }
  }

  try {
    const { error } = await supabase
      .from('organization_travel_contacts')
      .upsert({
        org_id: context.orgId!,
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

    return { error: null }
  } catch (err) {
    console.error('upsertOrganizationTravelContact error:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
