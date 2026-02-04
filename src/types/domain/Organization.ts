/**
 * Domain Model: Organization
 * 
 * Clean domain model for organizations, separate from Supabase row types.
 * All nullability is handled at the boundary (service layer).
 */

export interface Organization {
  id: string
  name: string
  slug?: string | null
  orgType: string | null
  status: OrganizationStatus
  createdAt: string
  updatedAt: string

  // License information
  licenseStatus: string | null
  licensePlan: string | null
  licenseTrialEndsAt: string | null
  licenseCurrentPeriodEnd: string | null

  // Stripe integration
  payoutAccountId: string | null
  payoutsEnabled: boolean
  stripeConnected: boolean

  // Counts
  teamCount: number
  sportCount: number
  userCount: number

  // Contact information (if available)
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  place_id?: string | null
  latitude: number | null
  longitude: number | null
}

export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'expired'
