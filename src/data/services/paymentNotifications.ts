/**
 * Payment Notifications Service
 *
 * Handles notifications for payment-related events (completed, failed)
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import type { NotificationAction } from '../../types/notifications'
import { notifyUsers } from './notificationServiceCore'

interface PaymentNotificationInput {
  paymentId: string
  feeAssignmentId?: string | null
  userId: string
  orgId: string
  teamId?: string | null
  amountCents: number
  currency: string
  status: 'succeeded' | 'failed'
  errorMessage?: string | null
}

/**
 * Notify user about payment completion
 */
export async function notifyPaymentCompleted(input: PaymentNotificationInput): Promise<void> {
  console.groupCollapsed(`%cnotifyPaymentCompleted: ${input.paymentId}`, 'color: #666; font-weight: bold;');
  debug.flow('PaymentNotifications.notifyPaymentCompleted', 'Notifying payment completion', {
    paymentId: input.paymentId,
    userId: input.userId,
    amountCents: input.amountCents,
  })
  debug.perf.start('paymentNotifications.notifyPaymentCompleted')

  if (USE_FAKE_DATA) {
    debug.perf.end('paymentNotifications.notifyPaymentCompleted')
    console.groupEnd()
    return
  }

  try {
    // Get fee assignment details if available
    let feeDescription = 'Payment'
    let feeId: string | null = null

    if (input.feeAssignmentId) {
      const { data: feeAssignment } = await supabase
        .from('fee_assignments')
        .select(`
          id,
          fee:fees!fee_id(id, description, amount_cents)
        `)
        .eq('id', input.feeAssignmentId)
        .single()

      if (feeAssignment) {
        const fee = (feeAssignment.fee as any)
        feeDescription = fee?.description || 'Fee'
        feeId = fee?.id || null
      }
    }

    const amountDollars = (input.amountCents / 100).toFixed(2)
    const action: NotificationAction = 'fee_payment_completed'

    const result = await notifyUsers({
      userIds: [input.userId],
      orgId: input.orgId,
      teamId: input.teamId || null,
      action,
      roleContext: 'guardian',
      title: 'Payment Completed',
      body: `Your payment of $${amountDollars} for ${feeDescription} has been successfully processed.`,
      linkUrl: '/portal/payments',
      entityType: 'fee',
      entityId: feeId || input.feeAssignmentId || null,
      metadata: {
        payment_id: input.paymentId,
        fee_assignment_id: input.feeAssignmentId,
        amount_cents: input.amountCents,
        currency: input.currency,
      },
    })

    debug.perf.end('paymentNotifications.notifyPaymentCompleted')
    if (result.success) {
      debug.flow('PaymentNotifications.notifyPaymentCompleted', 'Notification sent', {
        paymentId: input.paymentId,
        inAppCount: result.inAppCount,
      })
    } else {
      debug.error('PaymentNotifications.notifyPaymentCompleted', 'Failed to send notification', {
        error: result.error,
        paymentId: input.paymentId,
      })
    }
    console.groupEnd()
  } catch (err) {
    debug.perf.end('paymentNotifications.notifyPaymentCompleted')
    debug.error('PaymentNotifications.notifyPaymentCompleted', 'Error sending notification', {
      error: err,
      paymentId: input.paymentId,
    })
    console.groupEnd()
    console.error('[PaymentNotifications] Error notifying payment completion:', err)
  }
}

/**
 * Notify user about payment failure
 */
export async function notifyPaymentFailed(input: PaymentNotificationInput): Promise<void> {
  console.groupCollapsed(`%cnotifyPaymentFailed: ${input.paymentId}`, 'color: #666; font-weight: bold;');
  debug.flow('PaymentNotifications.notifyPaymentFailed', 'Notifying payment failure', {
    paymentId: input.paymentId,
    userId: input.userId,
  })
  debug.perf.start('paymentNotifications.notifyPaymentFailed')

  if (USE_FAKE_DATA) {
    debug.perf.end('paymentNotifications.notifyPaymentFailed')
    console.groupEnd()
    return
  }

  try {
    // Get fee assignment details if available
    let feeDescription = 'Payment'
    let feeId: string | null = null

    if (input.feeAssignmentId) {
      const { data: feeAssignment } = await supabase
        .from('fee_assignments')
        .select(`
          id,
          fee:fees!fee_id(id, description, amount_cents)
        `)
        .eq('id', input.feeAssignmentId)
        .single()

      if (feeAssignment) {
        const fee = (feeAssignment.fee as any)
        feeDescription = fee?.description || 'Fee'
        feeId = fee?.id || null
      }
    }

    const amountDollars = (input.amountCents / 100).toFixed(2)
    const action: NotificationAction = 'fee_payment_failed'

    const result = await notifyUsers({
      userIds: [input.userId],
      orgId: input.orgId,
      teamId: input.teamId || null,
      action,
      roleContext: 'guardian',
      title: 'Payment Failed',
      body: `Your payment of $${amountDollars} for ${feeDescription} could not be processed.${input.errorMessage ? ` ${input.errorMessage}` : ''} Please try again or contact support.`,
      linkUrl: '/portal/payments',
      entityType: 'fee',
      entityId: feeId || input.feeAssignmentId || null,
      presentation: 'warning',
      metadata: {
        payment_id: input.paymentId,
        fee_assignment_id: input.feeAssignmentId,
        amount_cents: input.amountCents,
        currency: input.currency,
        error_message: input.errorMessage,
      },
    })

    debug.perf.end('paymentNotifications.notifyPaymentFailed')
    if (result.success) {
      debug.flow('PaymentNotifications.notifyPaymentFailed', 'Notification sent', {
        paymentId: input.paymentId,
        inAppCount: result.inAppCount,
      })
    } else {
      debug.error('PaymentNotifications.notifyPaymentFailed', 'Failed to send notification', {
        error: result.error,
        paymentId: input.paymentId,
      })
    }
    console.groupEnd()
  } catch (err) {
    debug.perf.end('paymentNotifications.notifyPaymentFailed')
    debug.error('PaymentNotifications.notifyPaymentFailed', 'Error sending notification', {
      error: err,
      paymentId: input.paymentId,
    })
    console.groupEnd()
    console.error('[PaymentNotifications] Error notifying payment failure:', err)
  }
}
