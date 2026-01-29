/**
 * Organization Travel Contacts Service
 *
 * CRUD for organization_travel_contacts (category-based travel contacts at org level).
 * Plan create/edit only writes travel_plan_contacts; this service is for Org Settings only.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { UserContext } from '../fake/userContext'
import type {
  TravelContactCategoryOrg,
  TravelContactRecord,
  OrganizationTravelContactRow,
} from '../../types/travelContacts'
import { TRAVEL_CONTACT_CATEGORIES_ORG } from '../../types/travelContacts'

export type OrganizationTravelContactsMap = Partial<Record<TravelContactCategoryOrg, TravelContactRecord>>

const supabaseAny = supabase as any

// ============================================================================
// Get
// ============================================================================

/**
 * Get all organization travel contacts for the current org.
 */
export async function getOrganizationTravelContacts(
  context: UserContext
): Promise<{ data: OrganizationTravelContactsMap; error: Error | null }> {
  const orgId = context.orgId
  if (!orgId) {
    return { data: {}, error: new Error('Missing organization context') }
  }

  if (USE_FAKE_DATA) {
    const fallback: OrganizationTravelContactsMap = {}
    TRAVEL_CONTACT_CATEGORIES_ORG.forEach((cat) => {
      fallback[cat] = { first_name: '', last_name: '', email: '', phone: null }
    })
    return { data: fallback, error: null }
  }

  try {
    const { data, error } = await supabaseAny
      .from('organization_travel_contacts')
      .select('org_id, category, first_name, last_name, email, phone, updated_at')
      .eq('org_id', orgId)

    if (error) throw error

    const map: OrganizationTravelContactsMap = {}
    TRAVEL_CONTACT_CATEGORIES_ORG.forEach((cat) => {
      const row = (data as any as OrganizationTravelContactRow[] | null)?.find((r) => r.category === cat)
      if (row && row.email) {
        map[cat] = {
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone ?? undefined,
        }
      }
    })
    return { data: map, error: null }
  } catch (err) {
    return {
      data: {},
      error: err instanceof Error ? err : new Error('Failed to load organization travel contacts'),
    }
  }
}

// ============================================================================
// Upsert (per category)
// ============================================================================

/**
 * Upsert a single category contact for the org.
 */
export async function upsertOrganizationTravelContact(
  context: UserContext,
  category: TravelContactCategoryOrg,
  record: TravelContactRecord
): Promise<{ error: Error | null }> {
  const orgId = context.orgId
  if (!orgId) {
    return { error: new Error('Missing organization context') }
  }
  if (!record.email?.trim()) {
    return { error: new Error('Email is required') }
  }

  if (USE_FAKE_DATA) {
    return { error: null }
  }

  try {
    const { error } = await supabaseAny.from('organization_travel_contacts').upsert(
      {
        org_id: orgId,
        category,
        first_name: record.first_name?.trim() ?? '',
        last_name: record.last_name?.trim() ?? '',
        email: record.email.trim(),
        phone: record.phone?.trim() || null,
      },
      { onConflict: 'org_id,category' }
    )
    if (error) throw error
    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error('Failed to save organization travel contact'),
    }
  }
}

/**
 * Save all organization travel contacts (upsert each category that has email).
 */
export async function saveOrganizationTravelContacts(
  context: UserContext,
  map: OrganizationTravelContactsMap
): Promise<{ error: Error | null }> {
  for (const category of TRAVEL_CONTACT_CATEGORIES_ORG) {
    const record = map[category]
    if (!record) continue
    if (!record.email?.trim()) continue
    const { error } = await upsertOrganizationTravelContact(context, category, record)
    if (error) return { error }
  }
  return { error: null }
}
