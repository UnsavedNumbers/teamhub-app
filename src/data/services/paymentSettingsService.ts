import { supabase } from '@/lib/supabase'
import type { StripeConnectStatus, StripeConnectOnboardResponse } from '@/types/stripeConnect.types'
import { mapOrganizationToConnectStatus } from '@/types/stripeConnect.types'

/**
 * Initiates Stripe Connect onboarding for an organization
 */
export async function initiateStripeConnectOnboarding(
  orgId: string
): Promise<{ data: StripeConnectOnboardResponse | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { data: null, error: new Error('Organization ID is required') }
    }

    const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
      body: {
        organization_id: orgId,
      },
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to initiate onboarding') }
    }

    const response = data as StripeConnectOnboardResponse
    return { data: response, error: null }
  } catch (err) {
    console.error('[paymentSettingsService] Error initiating onboarding:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Gets the current Stripe Connect status for an organization
 */
export async function getStripeConnectStatus(
  orgId: string
): Promise<{ data: StripeConnectStatus | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { data: null, error: new Error('Organization ID is required') }
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        payout_account_id,
        payouts_enabled,
        payout_onboarding_status,
        payout_descriptor,
        stripe_payouts_enabled,
        stripe_payouts_disabled_reason,
        stripe_requirements_due,
        stripe_requirements_errors,
        stripe_requirements_deadline,
        stripe_status_updated_at
      `)
      .eq('id', orgId)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to fetch Connect status') }
    }

    if (!org) {
      return { data: null, error: new Error('Organization not found') }
    }

    const status = mapOrganizationToConnectStatus({
      payoutAccountId: org.payout_account_id,
      payoutsEnabled: org.payouts_enabled ?? false,
      payoutOnboardingStatus: org.payout_onboarding_status || 'pending',
      payoutDescriptor: org.payout_descriptor,
      stripePayoutsEnabled: org.stripe_payouts_enabled ?? org.payouts_enabled,
      stripePayoutsDisabledReason: org.stripe_payouts_disabled_reason,
      stripeRequirementsDue: org.stripe_requirements_due,
      stripeRequirementsErrors: org.stripe_requirements_errors,
      stripeRequirementsDeadline: org.stripe_requirements_deadline,
      stripeStatusUpdatedAt: org.stripe_status_updated_at,
    })

    return { data: status, error: null }
  } catch (err) {
    console.error('[paymentSettingsService] Error fetching Connect status:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Refreshes Stripe Connect status by syncing with Stripe API
 */
export async function refreshStripeConnectStatus(
  orgId: string
): Promise<{ error: Error | null; data?: StripeConnectStatus | null }> {
  try {
    if (!orgId) {
      return { error: new Error('Organization ID is required'), data: null }
    }

    const { data, error } = await supabase.functions.invoke('stripe-connect-refresh', {
      body: { organization_id: orgId },
    })

    if (error) {
      return { error: new Error(error.message || 'Failed to refresh status'), data: null }
    }

    const status = (data?.status ?? null) as StripeConnectStatus | null
    return { error: null, data: status }
  } catch (err) {
    console.error('[paymentSettingsService] Error refreshing Connect status:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error'), data: null }
  }
}

/**
 * Generates a short-lived Stripe remediation link (account_onboarding with currently_due fields)
 */
export async function createStripeRemediationLink(
  orgId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { url: null, error: new Error('Organization ID is required') }
    }

    const { data, error } = await supabase.functions.invoke('stripe-connect-remediation-link', {
      body: { organization_id: orgId },
    })

    if (error) {
      return { url: null, error: new Error(error.message || 'Failed to create remediation link') }
    }

    const url = (data as any)?.account_link_url as string | undefined
    return { url: url ?? null, error: null }
  } catch (err) {
    console.error('[paymentSettingsService] Error creating remediation link:', err)
    return { url: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
