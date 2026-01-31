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
      .select('payout_account_id, payouts_enabled, payout_onboarding_status, payout_descriptor')
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
): Promise<{ error: Error | null }> {
  try {
    if (!orgId) {
      return { error: new Error('Organization ID is required') }
    }

    const { error } = await supabase.rpc('sync_organization_connect_status' as any, {
      p_org_id: orgId,
    })

    if (error) {
      return { error: new Error(error.message || 'Failed to refresh status') }
    }

    return { error: null }
  } catch (err) {
    console.error('[paymentSettingsService] Error refreshing Connect status:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
