import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { t } from '../i18n'

export interface ParentCheckoutParams {
  feeAssignmentIds: string[]
  discountCode?: string
  successUrl: string
  cancelUrl: string
}

export interface ParentPartialCheckoutParams {
  feeAssignmentId: string
  amountCents: number // Amount in cents (integer)
  successUrl: string
  cancelUrl: string
}

export interface ParentCheckoutResponse {
  checkout_session_url?: string
  session_id?: string
}

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(t('billing.errorLoading'))
  }
}

export async function createParentCheckoutSession(params: ParentCheckoutParams): Promise<ParentCheckoutResponse> {
  ensureConfigured()

  const { feeAssignmentIds, discountCode, successUrl, cancelUrl } = params
  if (!feeAssignmentIds || feeAssignmentIds.length === 0) {
    throw new Error('No fees selected')
  }

  const { data, error } = await supabase.functions.invoke('parent-create-checkout-session', {
    body: {
      fee_assignment_ids: feeAssignmentIds,
      discount_code: discountCode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  })

  if (error) {
    throw new Error(error.message || t('billing.errorCreatingSession'))
  }

  return (data as ParentCheckoutResponse) ?? {}
}

/**
 * Create a partial payment checkout session for a single fee assignment.
 * 
 * @param params - Partial checkout parameters
 * @param params.feeAssignmentId - Single fee assignment ID (required)
 * @param params.amountCents - Payment amount in cents (must be positive integer, <= remaining balance)
 * @param params.successUrl - URL to redirect after successful payment
 * @param params.cancelUrl - URL to redirect if payment is canceled
 * @returns Checkout session URL and session ID
 */
export async function createParentPartialCheckoutSession(
  params: ParentPartialCheckoutParams
): Promise<ParentCheckoutResponse> {
  ensureConfigured()

  const { feeAssignmentId, amountCents, successUrl, cancelUrl } = params

  // Validate amountCents is a positive integer
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error('amountCents must be a positive integer')
  }

  if (!feeAssignmentId) {
    throw new Error('feeAssignmentId is required')
  }

  if (!successUrl || !cancelUrl) {
    throw new Error('successUrl and cancelUrl are required')
  }

  const { data, error } = await supabase.functions.invoke('parent-create-checkout-session', {
    body: {
      fee_assignment_id: feeAssignmentId,
      amount_cents: amountCents,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  })

  if (error) {
    throw new Error(error.message || t('billing.errorCreatingSession'))
  }

  return (data as ParentCheckoutResponse) ?? {}
}
