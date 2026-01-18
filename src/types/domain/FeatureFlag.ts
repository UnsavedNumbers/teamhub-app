/**
 * Domain Model: FeatureFlag
 * 
 * Clean domain model for feature flags, separate from Supabase row types.
 * All nullability is handled at the boundary (service layer).
 */

export interface FeatureFlag {
  id: string
  key: string
  valueType: 'boolean' | 'integer' | 'double'
  description: string | null
  environment: 'dev' | 'staging' | 'prod'
  deletedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
  
  // Default values (for admin views)
  defaultValueBoolean: boolean | null
  defaultValueInteger: number | null
  defaultValueDouble: number | null
  
  // Counts (for admin views)
  orgOverrideCount: number
  userOverrideCount: number
}

export interface FeatureFlagOverride {
  id: string
  overrideType: 'org' | 'user'
  featureFlagId: string
  featureKey: string
  scopeId: string
  scopeName: string
  environment: 'dev' | 'staging' | 'prod'
  valueBoolean: boolean | null
  valueInteger: number | null
  valueDouble: number | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface FeatureFlagAuditLog {
  id: string
  actorId: string | null
  actorEmail: string | null
  actorName: string | null
  action: string
  featureFlagId: string | null
  featureKey: string | null
  scopeType: string | null
  scopeId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  environment: 'dev' | 'staging' | 'prod'
  createdAt: string
}

export interface RpcResponse {
  success: boolean
  error?: string
  flagId?: string
  action?: string
}
