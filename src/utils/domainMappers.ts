/**
 * Domain Model Mappers
 * 
 * Maps Supabase row types to clean domain models.
 * Handles nullability at the boundary.
 * 
 * All UI components should use domain models, not Supabase row types.
 */

import type { SupabaseExtended as Database, SupabaseExtended, Json } from '../lib/supabase.extended.types'
import type { Event, EventLocation, RSVPConfig, RecurringPattern } from '../types/domain/Event'
import type { Organization } from '../types/domain/Organization'
import type { User, UserOrganization } from '../types/domain/User'
import type { LicenseTier, FeatureEntitlement, TierFeatureAssignment, LicenseMetrics } from '../types/domain/License'
import type { FeatureFlag, FeatureFlagOverride, FeatureFlagAuditLog, RpcResponse } from '../types/domain/FeatureFlag'

// Re-export domain models for convenience
export type { Event, Organization, User, LicenseTier, FeatureEntitlement, FeatureFlag } from '../types/domain'

// ============================================================================
// Event Mappers
// ============================================================================

type EventRow = Database['public']['Tables']['events']['Row'] & {
  team?: { id: string; name: string; org_id: string } | null
  season?: { id: string; name: string } | null
  event_location?: Database['public']['Tables']['event_locations']['Row'] | null
  recurring_pattern?: Database['public']['Tables']['recurring_event_patterns']['Row'][] | null
}

export function mapEvent(row: EventRow): Event {
  const location = row.event_location ? mapEventLocation(row.event_location) : null
  const recurringPattern = row.recurring_pattern && row.recurring_pattern.length > 0
    ? mapRecurringPattern(row.recurring_pattern[0])
    : null

  // Map RSVP config - handle both old and new schema
  const rsvpConfig: RSVPConfig = {
    enabled: row.rsvp_enabled ?? false,
    type: row.rsvp_enabled && row.rsvp_type
      ? row.rsvp_type as 'general' | 'athlete'
      : null
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type as Event['type'],
    startTime: row.start_time,
    endTime: row.end_time ?? new Date().toISOString(),
    arrivalTime: row.arrival_time,
    isCancelled: row.is_cancelled ?? false,
    cancelledAt: row.cancelled_at,
    cancelledByUserId: row.cancelled_by_user_id,
    cancellationReason: row.cancellation_reason,
    createdByUserId: row.created_by_user_id ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    teamId: row.team_id ?? '',
    teamName: row.team?.name ?? '',
    seasonId: row.season_id,
    seasonName: row.season?.name ?? null,
    organizationId: row.team?.org_id ?? '',
    location,
    rsvpConfig,
    recurringPattern,
    description: row.description,
    notes: row.notes,
    requiresTravel: row.requires_travel ?? false,
    overnight: row.overnight ?? false,
    hotelName: row.hotel_name,
    hotelAddress: row.hotel_address,
    uniformNotes: row.uniform_notes,
    equipmentNotes: row.equipment_notes,
    weatherDependent: row.weather_dependent ?? false,
  }
}

export function mapEventLocation(row: Database['public']['Tables']['event_locations']['Row']): EventLocation {
  return {
    id: row.id,
    venueName: row.venue_name,
    address: row.address_line1 || null,
    city: row.city,
    state: row.state,
    zip: row.postal_code || null,
    country: row.country,
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    mapsUrl: row.maps_url || null,
    isVirtual: row.is_virtual ?? false,
    isTbd: row.is_tbd ?? false,
  }
}

function mapRecurringPattern(row: Database['public']['Tables']['recurring_event_patterns']['Row']): RecurringPattern {
  return {
    id: row.id,
    frequency: row.frequency as RecurringPattern['frequency'],
    interval: row.interval || 1,
    daysOfWeek: row.days_of_week as number[] | null,
    endDate: row.end_date,
    occurrenceCount: row.max_occurrences || null,
    exceptionDates: row.exception_dates ?? [],
  }
}

// ============================================================================
// Organization Mappers
// ============================================================================

type OrganizationRow = SupabaseExtended['public']['Views']['admin_organizations']['Row'] | 
  Database['public']['Tables']['organizations']['Row']

export function mapOrganization(row: OrganizationRow): Organization {
  // Handle both admin view and table row
  
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    orgType: 'org_type' in row ? row.org_type : null,
    status: ('status' in row && row.status) ? row.status as Organization['status'] : 'active',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    licenseStatus: 'license_status' in row ? row.license_status : null,
    licensePlan: 'license_plan' in row ? row.license_plan : null,
    licenseTrialEndsAt: 'license_trial_ends_at' in row ? row.license_trial_ends_at : null,
    licenseCurrentPeriodEnd: 'license_current_period_end' in row ? row.license_current_period_end : null,
    payoutAccountId: 'payout_account_id' in row ? row.payout_account_id : null,
    payoutsEnabled: 'payouts_enabled' in row ? (row.payouts_enabled ?? false) : false,
    stripeConnected: 'stripe_connected' in row ? (row.stripe_connected ?? false) : false,
    teamCount: 'team_count' in row ? (row.team_count ?? 0) : 0,
    sportCount: 'sport_count' in row ? (row.sport_count ?? 0) : 0,
    userCount: 'user_count' in row ? (row.user_count ?? 0) : 0,
    website: 'website' in row ? (row.website as string | null) : null,
    phone: 'phone' in row ? (row.phone as string | null) : null,
    email: 'email' in row ? (row.email as string | null) : null,
    address: 'address' in row ? (row.address as string | null) : null,
    city: 'city' in row ? (row.city as string | null) : null,
    state: 'state' in row ? (row.state as string | null) : null,
    zip: 'zip' in row ? (row.zip as string | null) : null,
    place_id: 'place_id' in row ? (row.place_id as string | null) : null,
    latitude: 'latitude' in row ? (row.latitude as number | null) : null,
    longitude: 'longitude' in row ? (row.longitude as number | null) : null,
  }
}

// ============================================================================
// User Mappers
// ============================================================================

type UserRow = SupabaseExtended['public']['Views']['admin_users']['Row'] | 
  Database['public']['Tables']['users']['Row']

export function mapUser(row: UserRow): User {
  // Handle organizations field - could be Json or array
  let organizations: UserOrganization[] = []
  if ('organizations' in row) {
    if (Array.isArray(row.organizations)) {
      organizations = row.organizations.map((org: any) => ({
        organizationId: org.org_id ?? org.id,
        orgName: org.org_name ?? org.name,
        role: org.role ?? '',
      }))
    } else if (typeof row.organizations === 'object' && row.organizations !== null) {
      // Handle Json type
      const orgs = row.organizations as Json
      if (Array.isArray(orgs)) {
        organizations = orgs.map((org: any) => ({
          organizationId: org.org_id ?? org.id,
          orgName: org.org_name ?? org.name,
          role: org.role ?? '',
        }))
      }
    }
  }

  // Bug 1 & 2 Prevention: Use existence checks and type guards before access
  // Bug 3 Prevention: Always trim() values to prevent whitespace-only strings
  const firstName = 'first_name' in row && row.first_name && typeof row.first_name === 'string' 
    ? row.first_name.trim() 
    : ''
  const lastName = 'last_name' in row && row.last_name && typeof row.last_name === 'string' 
    ? row.last_name.trim() 
    : ''
  const phone = 'phone' in row && row.phone && typeof row.phone === 'string' 
    ? row.phone.trim() 
    : ''
  
  // Derive displayName from first+last if display_name is null/empty (Issue 4 solution)
  const displayName = 'display_name' in row && row.display_name 
    ? row.display_name 
    : (firstName && lastName ? `${firstName} ${lastName}` : null)

  return {
    id: row.id ?? '',
    email: row.email ?? '',
    phone,
    firstName,
    lastName,
    displayName,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    lastSignInAt: 'last_sign_in_at' in row ? row.last_sign_in_at : null,
    emailConfirmed: 'email_confirmed' in row ? (row.email_confirmed ?? false) : false,
    isPlatformAdmin: 'is_platform_admin' in row ? (row.is_platform_admin ?? false) : false,
    organizations,
    roles: 'roles' in row ? (row.roles ?? []) : [],
  }
}

// ============================================================================
// License Mappers
// ============================================================================

export function mapLicenseTier(row: SupabaseExtended['public']['Tables']['license_tiers']['Row']): LicenseTier {
  return {
    id: row.id,
    tierKey: row.tier_key,
    tierName: row.tier_name ?? '',
    description: row.description ?? '',
    status: (row.status ?? 'active') as 'active' | 'archived',
    version: row.version ?? 1,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    stripePriceId: row.stripe_price_id,
    stripeVerifiedAt: row.stripe_verified_at,
    stripeProductName: row.stripe_product_name,
    stripeAmountCents: row.stripe_amount_cents,
    stripeInterval: row.stripe_interval,
    stripeCurrency: row.stripe_currency,
    stripeActive: row.stripe_active,
  }
}

export function mapFeatureEntitlement(row: SupabaseExtended['public']['Tables']['feature_entitlements']['Row']): FeatureEntitlement {
  return {
    id: row.id,
    featureKey: row.feature_key,
    displayName: row.display_name ?? '',
    category: row.category ?? '',
    featureType: (row.feature_type ?? 'module') as 'module' | 'permission' | 'limit' | 'visibility' | 'integration',
    description: row.description ?? '',
    rolloutStatus: (row.rollout_status ?? 'hidden') as 'live' | 'beta' | 'hidden',
    unavailableGateAction: (row.unavailable_gate_action as 'hide' | 'disable' | 'overlay' | 'modal' | 'paywall' | 'custom') ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    archivedAt: row.archived_at,
    isToggleable: (row as any).is_toggleable ?? true,
    isRemovable: (row as any).is_removable ?? true,
    lockReason: (row as any).lock_reason ?? null,
    isSystemFeature: (row as any).is_system_feature ?? false,
    platformAdminOnly: (row as any).platform_admin_only ?? false,
    parentFeatureKey: (row as any).parent_feature_key ?? null,
  }
}

export function mapTierFeatureAssignment(row: SupabaseExtended['public']['Tables']['tier_feature_assignments']['Row']): TierFeatureAssignment {
  return {
    id: row.id,
    licenseTierId: row.license_tier_id,
    featureEntitlementId: row.feature_entitlement_id,
    included: row.included ?? false,
    limitValue: row.limit_value,
    roleAdmin: row.role_admin ?? false,
    roleCoach: row.role_coach ?? false,
    roleParent: row.role_parent ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export function mapLicenseMetrics(row: any): LicenseMetrics {
  return {
    tiersMissingPriceId: row.tiers_missing_price_id ?? 0,
    featuresWithoutAssignment: row.features_without_assignment ?? 0,
    tiersWithArchivedFeatures: row.tiers_with_archived_features ?? 0,
  }
}

// ============================================================================
// Feature Flag Mappers
// ============================================================================

export function mapFeatureFlag(row: any): FeatureFlag {
  return {
    id: row.id,
    key: row.key,
    valueType: row.value_type,
    description: row.description,
    environment: row.environment,
    deletedAt: row.deleted_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    defaultValueBoolean: row.default_value_boolean,
    defaultValueInteger: row.default_value_integer,
    defaultValueDouble: row.default_value_double,
    orgOverrideCount: row.org_override_count,
    userOverrideCount: row.user_override_count,
  }
}

export function mapFeatureFlagOverride(row: any): FeatureFlagOverride {
  // Generate id from composite key
  const id = `${row.feature_flag_id}:${row.scope_id}:${row.environment}`
  
  return {
    id,
    overrideType: row.override_type,
    featureFlagId: row.feature_flag_id,
    featureKey: row.feature_key,
    scopeId: row.scope_id,
    scopeName: row.scope_name,
    environment: row.environment,
    valueBoolean: row.value_boolean,
    valueInteger: row.value_integer,
    valueDouble: row.value_double,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapFeatureFlagAuditLog(row: any): FeatureFlagAuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorName: row.actor_name,
    action: row.action,
    featureFlagId: row.feature_flag_id,
    featureKey: row.feature_key,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    oldValue: row.old_value as Record<string, unknown> | null,
    newValue: row.new_value as Record<string, unknown> | null,
    environment: row.environment,
    createdAt: row.created_at,
  }
}

export function mapRpcResponse(data: Json | null): RpcResponse {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid response format' }
  }

  const response = data as Record<string, unknown>
  return {
    success: response.success === true,
    error: typeof response.error === 'string' ? response.error : undefined,
    flagId: typeof response.flag_id === 'string' ? response.flag_id : undefined,
    action: typeof response.action === 'string' ? response.action : undefined,
  }
}
