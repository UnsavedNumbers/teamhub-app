import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { LicensePlan } from '../utils/licenseUtils'
import { t } from '../i18n'
import { USE_FAKE_DATA, DEMO_TRANSACTION_DELAY_MS } from '../data/config'
import { getFakeTicketOrdersWithRelations } from '../data/fake/ticketingFakeService'

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
  payload?: {
    data?: {
      object?: {
        amount_paid?: number
        amount_due?: number
        currency?: string
        hosted_invoice_url?: string
        invoice_pdf?: string
        status?: string
        description?: string
        lines?: {
          data?: Array<{
            description?: string
            amount?: number
          }>
        }
      }
    }
  }
  // Computed fields for easier access
  amount?: number
  currency?: string
  invoice_url?: string
  payment_status?: string
  description?: string
}

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(t('billing.errorLoading'))
  }
}

function buildFakeBillingHistory(organizationId: string): BillingEvent[] {
  const orders = getFakeTicketOrdersWithRelations(organizationId)
    .filter((order) => order.status === 'paid' || order.status === 'refunded' || order.status === 'pending_payment')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 24)

  return orders.map((order) => {
    const createdAt = order.processed_at ?? order.created_at
    const isRefund = order.status === 'refunded'
    const isFailed = order.status === 'pending_payment'
    const amountCents = order.total_cents || 0
    const description = isRefund
      ? `Refund issued for ${order.event?.title ?? 'ticket order'}`
      : `Ticket revenue for ${order.event?.title ?? 'organization event'}`
    const status = isRefund ? 'refunded' : isFailed ? 'failed' : 'paid'

    return {
      id: `demo-billing-${order.id}`,
      event_type: isRefund ? 'charge.refunded' : isFailed ? 'invoice.payment_failed' : 'invoice.payment_succeeded',
      stripe_event_id: `evt_demo_${order.id}`,
      stripe_object_id: order.stripe_payment_intent_id ?? `pi_demo_${order.id}`,
      processed_at: createdAt,
      created_at: createdAt,
      payload: {
        data: {
          object: {
            amount_paid: isFailed ? 0 : amountCents,
            amount_due: amountCents,
            currency: 'usd',
            hosted_invoice_url: '#',
            status,
            description,
          },
        },
      },
      amount: amountCents / 100,
      currency: 'USD',
      invoice_url: '#',
      payment_status: status,
      description,
    }
  })
}

export async function createCheckoutSession(params: CheckoutSessionParams) {
  if (!USE_FAKE_DATA) {
    ensureConfigured()
  }

  const { organizationId, requestedPlan, successUrl, cancelUrl } = params
  if (!organizationId || !requestedPlan || !successUrl || !cancelUrl) {
    throw new Error(t('errors.missingOrganization'))
  }

  if (USE_FAKE_DATA) {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
    return { checkout_session_url: successUrl, session_id: `demo_${organizationId}_${Date.now()}` }
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
  if (!USE_FAKE_DATA) {
    ensureConfigured()
  }

  const { organizationId, returnUrl } = params
  if (!organizationId || !returnUrl) {
    throw new Error(t('errors.missingOrganization'))
  }

  if (USE_FAKE_DATA) {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
    return { portal_url: returnUrl }
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
  if (USE_FAKE_DATA) {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
    return buildFakeBillingHistory(organizationId)
  }

  ensureConfigured()

  const { data, error } = await supabase
    .from('billing_events')
    .select('id, event_type, stripe_event_id, stripe_object_id, processed_at, created_at, payload')
    .eq('org_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  // Map raw events to include computed fields from payload
  return (data ?? [])
    .filter((event: any) => {
      // Filter out checkout.session.* events
      return !event.event_type?.startsWith('checkout.session')
    })
    .map((event: any) => {
      const stripeObject = event.payload?.data?.object

      // Extract amount (prefer amount_paid, fallback to amount_due, then amount)
      const amount = stripeObject?.amount_paid ?? stripeObject?.amount_due ?? stripeObject?.amount

      // Extract description - try multiple sources
      let description = stripeObject?.description

      // For invoices, try to get description from line items
      if (!description && stripeObject?.lines?.data?.length > 0) {
        const lineDescriptions = stripeObject.lines.data
          .map((line: any) => line.description)
          .filter(Boolean)
        if (lineDescriptions.length > 0) {
          description = lineDescriptions.join(', ')
        }
      }

      // For payment intents, try metadata or statement descriptor
      if (!description) {
        description = stripeObject?.metadata?.description ?? stripeObject?.statement_descriptor
      }

      return {
        ...event,
        amount: amount ? amount / 100 : undefined, // Convert from cents to dollars
        currency: stripeObject?.currency?.toUpperCase(),
        invoice_url: stripeObject?.hosted_invoice_url ?? stripeObject?.invoice_pdf,
        payment_status: stripeObject?.status,
        description,
      } as BillingEvent
    })
}
