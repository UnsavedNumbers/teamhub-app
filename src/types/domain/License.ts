/**
 * Domain Model: License
 * 
 * Clean domain model for license tiers and entitlements, separate from Supabase row types.
 * All nullability is handled at the boundary (service layer).
 */

export interface LicenseTier {
  id: string
  tierKey: string
  tierName: string
  description: string | null
  status: 'active' | 'archived'
  version: number | null
  createdAt: string
  updatedAt: string
  
  // Stripe integration
  stripePriceId: string
  stripeVerifiedAt: string | null
  stripeProductName: string | null
  stripeAmountCents: number | null
  stripeInterval: string | null
  stripeCurrency: string | null
  stripeActive: boolean | null
  
  // Counts (for admin views)
  includedFeaturesCount?: number
  orgsUsingCount?: number
}

export interface FeatureEntitlement {
  id: string
  featureKey: string
  displayName: string
  category: string
  featureType: 'module' | 'permission' | 'limit' | 'visibility' | 'integration'
  description: string | null
  rolloutStatus: 'live' | 'beta' | 'hidden'
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface TierFeatureAssignment {
  id: string
  licenseTierId: string
  featureEntitlementId: string
  included: boolean
  limitValue: number | null
  roleAdmin: boolean
  roleCoach: boolean
  roleParent: boolean
  createdAt: string
  updatedAt: string
}

export interface LicenseMetrics {
  tiersMissingPriceId: number
  featuresWithoutAssignment: number
  tiersWithArchivedFeatures: number
}
