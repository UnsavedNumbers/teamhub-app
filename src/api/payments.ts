import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { t } from '../i18n'

export interface ParentCheckoutParams {
  feeAssignmentIds: string[]
  discountCode?: string
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
