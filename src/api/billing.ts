import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { LicensePlan } from '../utils/licenseUtils'
import { t } from '../i18n'

interface CheckoutSessionParams {
  organizationId: string
  requestedPlan: LicensePlan
  successUrl: string
  cancelUrl: string
}

interface PortalSessionParams {
  organizationId: string
  returnUrl: string
}

export interface BillingEvent {
  id: string
  event_type: string | null
  stripe_event_id: string | null
  stripe_object_id: string | null
  processed_at: string | null
  created_at: string | null
}

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(t('billing.errorLoading'))
  }
}

export async function createCheckoutSession(params: CheckoutSessionParams) {
  ensureConfigured()

  const { organizationId, requestedPlan, successUrl, cancelUrl } = params
  if (!organizationId || !requestedPlan || !successUrl || !cancelUrl) {
    throw new Error(t('errors.missingOrganization'))
  }

  const { data, error } = await supabase.functions.invoke('billing-create-checkout-session', {
    body: {
      organization_id: organizationId,
      requested_plan: requestedPlan,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  })

  if (error) {
    throw new Error(error.message || t('billing.errorCreatingSession'))
  }

  return data as { checkout_session_url?: string; session_id?: string }
}

export async function createCustomerPortalSession(params: PortalSessionParams) {
  ensureConfigured()

  const { organizationId, returnUrl } = params
  if (!organizationId || !returnUrl) {
    throw new Error(t('errors.missingOrganization'))
  }

  const { data, error } = await supabase.functions.invoke('billing-customer-portal', {
    body: {
      organization_id: organizationId,
      return_url: returnUrl,
    },
  })

  if (error) {
    throw new Error(error.message || t('billing.errorCreatingPortal'))
  }

  return data as { portal_url?: string }
}

export async function getBillingHistory(organizationId: string): Promise<BillingEvent[]> {
  ensureConfigured()

  const { data, error } = await supabase
    .from('billing_events')
    .select('id, event_type, stripe_event_id, stripe_object_id, processed_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as BillingEvent[]
}
