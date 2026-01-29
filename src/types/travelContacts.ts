/**
 * Travel contact categories and resolved contact types.
 * Single source of truth for category list (plan §10 issue 1).
 */

/** Categories available on travel plans (no 'default') */
export const TRAVEL_CONTACT_CATEGORIES = [
  'transportation',
  'lodging',
  'venue',
  'emergency',
  'general',
] as const

/** Categories at org level (includes 'default' as fallback) */
export const TRAVEL_CONTACT_CATEGORIES_ORG = [
  ...TRAVEL_CONTACT_CATEGORIES,
  'default',
] as const

export type TravelContactCategory = (typeof TRAVEL_CONTACT_CATEGORIES)[number]
export type TravelContactCategoryOrg = (typeof TRAVEL_CONTACT_CATEGORIES_ORG)[number]

export interface ResolvedContact {
  first_name: string
  last_name: string
  email: string
  phone: string | null
}

/** Resolved contacts for all five plan categories (from RPC or app resolution) */
export type ResolvedTravelContacts = Record<TravelContactCategory, ResolvedContact>

export interface TravelContactRecord {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
}

/** Plan-level contact row (is_custom = true uses this; false inherits from org) */
export interface TravelPlanContactRow {
  id: string
  travel_plan_id: string
  category: TravelContactCategory
  is_custom: boolean
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  updated_at: string
}

/** Org-level contact row */
export interface OrganizationTravelContactRow {
  org_id: string
  category: TravelContactCategoryOrg
  first_name: string
  last_name: string
  email: string
  phone: string | null
  updated_at: string
}
