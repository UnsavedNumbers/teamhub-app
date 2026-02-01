/**
 * Stripe Connect Types
 * 
 * Types for Stripe Connect integration, separate from Organization domain type
 * to maintain separation of concerns and avoid type conflicts.
 */

export interface StripeRequirementError {
  code: string | null
  reason: string | null
  requirement: string | null
}

export interface StripeConnectStatus {
  connected: boolean
  payoutAccountId: string | null
  payoutsEnabled: boolean
  onboardingStatus: 'pending' | 'completed' | 'restricted'
  payoutDescriptor: string | null
  dashboardUrl: string | null
  disabledReason: string | null
  requirementsDue: string[]
  requirementsPending: string[]
  requirementsErrors: StripeRequirementError[]
  requirementsDeadline: string | null
  lastStatusUpdated: string | null
}

export interface StripeConnectOnboardResponse {
  account_link_url: string
  account_id: string
  link_expires_at?: string
  is_new_link?: boolean
}

/**
 * Maps Organization domain type to StripeConnectStatus
 * Used to avoid type conflicts while maintaining separation
 */
export function mapOrganizationToConnectStatus(org: {
  payoutAccountId: string | null
  payoutsEnabled: boolean
  payoutOnboardingStatus?: 'pending' | 'completed' | 'restricted' | null
  payoutDescriptor?: string | null
  stripePayoutsEnabled?: boolean | null
  stripePayoutsDisabledReason?: string | null
  stripeRequirementsDue?: unknown
  stripeRequirementsErrors?: unknown
  stripeRequirementsDeadline?: string | null
  stripeStatusUpdatedAt?: string | null
}): StripeConnectStatus {
  // Normalize requirements payload regardless of how it is stored
  const dueObject = (org.stripeRequirementsDue ?? {}) as Record<string, any>
  const normalizedDue = Array.isArray(dueObject)
    ? dueObject
    : Array.isArray(dueObject?.currently_due)
      ? dueObject.currently_due
      : []

  const pendingList = Array.isArray(dueObject?.pending_verification) ? dueObject.pending_verification : []
  const errorsArray = Array.isArray(org.stripeRequirementsErrors) ? org.stripeRequirementsErrors : []

  const requirementsErrors: StripeRequirementError[] = errorsArray.map((err: any) => ({
    code: err?.code ?? null,
    reason: err?.reason ?? null,
    requirement: err?.requirement ?? null,
  }))

  const onboardingStatus =
    org.payoutOnboardingStatus === 'complete'
      ? 'completed'
      : org.payoutOnboardingStatus || 'pending'

  return {
    connected: org.payoutAccountId !== null,
    payoutAccountId: org.payoutAccountId,
    payoutsEnabled: org.stripePayoutsEnabled ?? org.payoutsEnabled,
    onboardingStatus,
    payoutDescriptor: org.payoutDescriptor || null,
    dashboardUrl: org.payoutAccountId 
      ? `https://dashboard.stripe.com/connect/accounts/${org.payoutAccountId}`
      : null,
    disabledReason: org.stripePayoutsDisabledReason ?? null,
    requirementsDue: normalizedDue,
    requirementsPending: pendingList,
    requirementsErrors,
    requirementsDeadline: org.stripeRequirementsDeadline ?? null,
    lastStatusUpdated: org.stripeStatusUpdatedAt ?? null,
  }
}
