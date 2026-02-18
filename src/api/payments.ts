import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { t } from '../i18n'
import { DEMO_ORG_A_ID, DEMO_TRANSACTION_DELAY_MS, USE_FAKE_DATA } from '../data/config'
import { fakeFeeAssignments, fakePayments } from '../data/fake/fakePayments'

export interface ParentCheckoutParams {
  feeAssignmentIds: string[]
  discountCode?: string
  successUrl: string
  cancelUrl: string
}

export interface ParentPartialCheckoutParams {
  feeAssignmentId: string
  amountCents: number // Amount in cents (integer)
  totalFeeAmountCents: number // Total fee amount in cents (integer)
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

function getNextDemoPaymentId(): string {
  let maxId = 0
  for (const payment of fakePayments) {
    const match = /^pay-(\d+)$/.exec(payment.id)
    if (match) {
      maxId = Math.max(maxId, Number.parseInt(match[1], 10))
    }
  }

  return `pay-${String(maxId + 1).padStart(3, '0')}`
}

function applyDemoPayment(assignmentId: string, requestedAmountCents: number) {
  const assignment = fakeFeeAssignments.find((item) => item.id === assignmentId)
  if (!assignment) {
    throw new Error('Fee assignment not found')
  }

  if (assignment.status === 'waived') {
    throw new Error('Waived fees cannot be paid')
  }

  const remainingCents = Math.max(0, assignment.amount_due_cents - assignment.amount_paid_cents)
  if (remainingCents <= 0) {
    throw new Error('Fee is already paid')
  }

  if (!Number.isInteger(requestedAmountCents) || requestedAmountCents <= 0) {
    throw new Error('amountCents must be a positive integer')
  }

  if (requestedAmountCents > remainingCents) {
    throw new Error('Payment amount exceeds remaining balance')
  }

  const now = new Date().toISOString()
  assignment.amount_paid_cents += requestedAmountCents
  assignment.status = assignment.amount_paid_cents >= assignment.amount_due_cents ? 'paid' : 'partial'
  assignment.updated_at = now

  fakePayments.push({
    id: getNextDemoPaymentId(),
    org_id: DEMO_ORG_A_ID,
    fee_assignment_id: assignmentId,
    amount_cents: requestedAmountCents,
    currency: 'usd',
    status: 'succeeded',
    stripe_payment_intent_id: `pi_demo_${Date.now()}`,
    payment_method: 'card',
    paid_at: now,
    refunded_at: null,
    notes: 'Demo checkout payment',
    created_at: now,
    updated_at: now,
  })
}

export async function createParentCheckoutSession(params: ParentCheckoutParams): Promise<ParentCheckoutResponse> {
  const { feeAssignmentIds, discountCode, successUrl, cancelUrl } = params
  if (!feeAssignmentIds || feeAssignmentIds.length === 0) {
    throw new Error('No fees selected')
  }

  if (USE_FAKE_DATA) {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))

    for (const assignmentId of feeAssignmentIds) {
      const assignment = fakeFeeAssignments.find((item) => item.id === assignmentId)
      if (!assignment) {
        continue
      }

      const remaining = Math.max(0, assignment.amount_due_cents - assignment.amount_paid_cents)
      if (remaining > 0) {
        applyDemoPayment(assignmentId, remaining)
      }
    }

    return {
      checkout_session_url: successUrl,
      session_id: `demo_parent_${Date.now()}`,
    }
  }

  ensureConfigured()

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
 * @param params.amountCents - Payment amount in cents (must be positive integer)
 * @param params.totalFeeAmountCents - Total fee amount in cents; partial payment minimum is 10% of this value
 * @param params.successUrl - URL to redirect after successful payment
 * @param params.cancelUrl - URL to redirect if payment is canceled
 * @returns Checkout session URL and session ID
 */
export async function createParentPartialCheckoutSession(
  params: ParentPartialCheckoutParams
): Promise<ParentCheckoutResponse> {
  const { feeAssignmentId, amountCents, totalFeeAmountCents, successUrl, cancelUrl } = params

  // Validate amountCents is a positive integer
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error('amountCents must be a positive integer')
  }

  if (!Number.isInteger(totalFeeAmountCents) || totalFeeAmountCents < 1) {
    throw new Error('totalFeeAmountCents must be a positive integer')
  }

  const minimumPartialCents = Math.max(1, Math.ceil(totalFeeAmountCents * 0.1))
  if (amountCents < minimumPartialCents) {
    throw new Error(`Partial payment must be at least $${(minimumPartialCents / 100).toFixed(2)}`)
  }

  if (!feeAssignmentId) {
    throw new Error('feeAssignmentId is required')
  }

  if (!successUrl || !cancelUrl) {
    throw new Error('successUrl and cancelUrl are required')
  }

  if (USE_FAKE_DATA) {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
    applyDemoPayment(feeAssignmentId, amountCents)

    return {
      checkout_session_url: successUrl,
      session_id: `demo_parent_partial_${Date.now()}`,
    }
  }

  ensureConfigured()

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
