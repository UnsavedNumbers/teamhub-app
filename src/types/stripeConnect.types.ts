/**
 * Stripe Connect Types
 * 
 * Types for Stripe Connect integration, separate from Organization domain type
 * to maintain separation of concerns and avoid type conflicts.
 */

export interface StripeConnectStatus {
  connected: boolean
  payoutAccountId: string | null
  payoutsEnabled: boolean
  onboardingStatus: 'pending' | 'completed' | 'restricted'
  payoutDescriptor: string | null
  dashboardUrl: string | null
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
}): StripeConnectStatus {
  return {
    connected: org.payoutAccountId !== null,
    payoutAccountId: org.payoutAccountId,
    payoutsEnabled: org.payoutsEnabled,
    onboardingStatus: org.payoutOnboardingStatus || 'pending',
    payoutDescriptor: org.payoutDescriptor || null,
    dashboardUrl: org.payoutAccountId 
      ? `https://dashboard.stripe.com/connect/accounts/${org.payoutAccountId}`
      : null,
  }
}
