/**
 * Admin Ticket Order Detail Page
 *
 * Admin page to view ticket order details and process refunds
 * Design: /designs/tickets/order_detail
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/contexts/OrganizationContext'
import { getTicketOrderByIdAdmin, processTicketOrderRefund, manuallyCompleteTicketOrder } from '@/data/services/ticketingService'
import { formatCurrency } from '@/types/ticketing'
import { showSuccess, showError } from '@/utils/toast'
import { getErrorMessage } from '@/utils/errorUtils'
import { AdminPageHeader } from '@/components/platformAdmin'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import { t } from '@/i18n'
import '../../styles/orgAdmin.css'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function TicketingOrderDetail() {
  useDebugLifecycle('TicketingOrderDetail')
  
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrganization?.id
  const [isRefunding, setIsRefunding] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const { data: orderResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['ticket-order-admin', orderId],
    queryFn: () => getTicketOrderByIdAdmin(orderId!),
    enabled: !!orderId,
  })

  const order = orderResponse || null

  // Verify order belongs to current org
  if (order && orgId && order.org_id !== orgId) {
    return (
      <div className="oa-root">
        <AdminPageHeader title="Order Not Found" />
        <div className="oa-card">
          <p className="oa-text-danger">This order does not belong to your organization.</p>
          <OrgAdminButton onClick={() => navigate('/admin/ticketing/orders')} className="oa-mt-4">
            {t('ticketing.orderDetail.backToOrders')}
          </OrgAdminButton>
        </div>
      </div>
    )
  }

  const handleRefund = async () => {
    if (!orderId || !order) return

    if (!confirm(t('ticketing.orderDetail.refundConfirm'))) {
      return
    }

    try {
      setIsRefunding(true)
      const result = await processTicketOrderRefund(orderId)
      if (result.error) {
        throw result.error
      }

      showSuccess(result.data?.message || 'Refund processed successfully')

      // Invalidate and refetch order to get updated status
      await queryClient.invalidateQueries({ queryKey: ['ticket-order-admin', orderId] })

      // Poll once after a short delay to check if webhook has updated status
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['ticket-order-admin', orderId] })
      }, 2000)
    } catch (err) {
      showError(getErrorMessage(err) || 'Failed to process refund')
    } finally {
      setIsRefunding(false)
    }
  }

  const handleCompleteOrder = async () => {
    if (!orderId || !order) return

    if (!confirm(t('ticketing.orderDetail.stuckOrderWarning') + '. ' + t('ticketing.orderDetail.stuckOrderDescription') + ' Continue?')) {
      return
    }

    try {
      setIsCompleting(true)
      const result = await manuallyCompleteTicketOrder(orderId)
      if (result.error) {
        throw result.error
      }

      showSuccess(result.data?.message || 'Order completed successfully')

      // Invalidate and refetch order to get updated status
      await queryClient.invalidateQueries({ queryKey: ['ticket-order-admin', orderId] })
      await queryClient.refetchQueries({ queryKey: ['ticket-order-admin', orderId] })
    } catch (err) {
      showError(getErrorMessage(err) || 'Failed to complete order')
    } finally {
      setIsCompleting(false)
    }
  }

  // Validate orderId format
  if (orderId && !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return (
      <div className="oa-root">
        <AdminPageHeader title="Invalid Order ID" />
        <div className="oa-card">
          <p className="oa-text-danger">The order ID format is invalid.</p>
          <OrgAdminButton onClick={() => navigate('/admin/ticketing/orders')} className="oa-mt-4">
            {t('ticketing.orderDetail.backToOrders')}
          </OrgAdminButton>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="oa-root">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '100px' }} />
            ))}
          </div>
          <div className="oa-skeleton" style={{ height: '400px', borderRadius: '8px' }} />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="oa-root">
        <AdminPageHeader title="Order Not Found" />
        <div className="oa-card">
          <p className="oa-text-danger oa-mb-4">{getErrorMessage(error) || 'Order not found'}</p>
          <div className="oa-flex oa-gap-2">
            <OrgAdminButton onClick={() => refetch()} variant="secondary">
              {t('common.retry')}
            </OrgAdminButton>
            <OrgAdminButton onClick={() => navigate('/admin/ticketing/orders')}>
              {t('ticketing.orderDetail.backToOrders')}
            </OrgAdminButton>
          </div>
        </div>
      </div>
    )
  }

  const event = (order as any).ticketed_events
  const orderItems = (order as any).ticket_order_items || []
  const canRefund = order.status === 'paid' && order.stripe_charge_id !== null
  const isStuckOrder = order.status === 'pending_payment' && order.stripe_checkout_session_id !== null

  // Format processed date
  const processedDate = order.processed_at
    ? new Date(order.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // Format short order ID (last 8 chars)
  const shortOrderId = order.id.slice(-8).toUpperCase()

  // Get status text
  const getStatusText = () => {
    switch (order.status) {
      case 'paid': return t('ticketing.orderDetail.status.paid')
      case 'refunded': return t('ticketing.orderDetail.status.refunded')
      case 'pending_payment': return t('ticketing.orderDetail.status.pending')
      case 'cancelled': return t('ticketing.orderDetail.status.canceled')
      default: return order.status
    }
  }

  return (
    <div className="oa-root">
      <div className="oa-order-detail">

        {/* Back Navigation */}
        <div className="oa-mb-6">
          <OrgAdminButton
            variant="secondary"
            icon="arrow_back"
            onClick={() => navigate('/admin/ticketing/orders')}
          >
            {t('ticketing.orderDetail.backToOrders')}
          </OrgAdminButton>
        </div>

        {/* Stuck Order Warning */}
        {isStuckOrder && (
          <div className="oa-card oa-mb-6" style={{ background: 'var(--oa-warning-bg)' }}>
            <div className="oa-flex oa-items-start oa-gap-3">
              <span className="material-symbols-outlined" style={{ color: 'var(--oa-warning)', fontSize: '20px', flexShrink: 0 }}>
                warning
              </span>
              <div className="oa-flex oa-items-center oa-justify-between oa-w-full oa-gap-4">
                <div className="oa-body-m oa-font-medium">
                  <p className="oa-font-semibold oa-mb-1">{t('ticketing.orderDetail.stuckOrderDetected')}</p>
                  <p className="oa-body-s oa-text-slate-600">
                    {t('ticketing.orderDetail.stuckOrderDescription')}
                  </p>
                  <p className="oa-body-xs oa-text-orange-600 oa-mt-2 oa-font-semibold">
                    {t('ticketing.orderDetail.stuckOrderWarning')}
                  </p>
                </div>
                <button
                  onClick={handleCompleteOrder}
                  disabled={isCompleting}
                  className="oa-btn oa-btn--primary oa-shrink-0"
                >
                  {isCompleting ? t('ticketing.orderDetail.processing') : t('ticketing.orderDetail.completeOrder')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="oa-card oa-order-detail__card oa-mb-6">
          {/* Header */}
          <div className="oa-order-detail__header">
            <div className="oa-order-detail__header-left">
              <span className="oa-order-detail__label">{t('ticketing.orderDetail.orderConfirmation')}</span>
              <h1 className="oa-order-detail__order-id">{shortOrderId}</h1>
            </div>
            <div className="oa-order-detail__header-right">
              <div className={`oa-order-detail__status-badge oa-order-detail__status-badge--${order.status === 'paid' ? 'paid' : order.status === 'refunded' ? 'refunded' : 'pending'}`}>
                {getStatusText()}
              </div>
              {processedDate && (
                <p className="oa-order-detail__processed-date">
                  {t('ticketing.orderDetail.processed')} {processedDate}
                </p>
              )}
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="oa-order-detail__grid">
            {/* Left Column - Order Metadata */}
            <div className="oa-order-detail__column oa-order-detail__column--left">
              {/* Order Details Section */}
              <section className="oa-mb-10">
                <h3 className="oa-order-detail__section-title">{t('ticketing.orderDetail.orderDetails')}</h3>
                <div className="oa-order-detail__meta-item">
                  <span className="oa-order-detail__meta-label">{t('ticketing.orderDetail.purchaser')}</span>
                  <span className="oa-order-detail__meta-value">{order.purchaser_email}</span>
                  {order.purchaser_name && (
                    <span className="oa-order-detail__meta-sub">{order.purchaser_name}</span>
                  )}
                </div>
                {event && (
                  <div className="oa-order-detail__meta-item">
                    <span className="oa-order-detail__meta-label">{t('ticketing.orderDetail.event')}</span>
                    <span className="oa-order-detail__meta-value">{event.title}</span>
                    {event.starts_at && (
                      <span className="oa-order-detail__meta-sub">
                        {new Date(event.starts_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* Payment Summary Section */}
              <section>
                <h3 className="oa-order-detail__section-title">{t('ticketing.orderDetail.paymentSummary')}</h3>
                <div className="oa-order-detail__ledger">
                  <div className="oa-order-detail__ledger-row">
                    <span className="oa-order-detail__ledger-label">{t('ticketing.orderDetail.subtotal')}</span>
                    <span className="oa-order-detail__ledger-value">{formatCurrency(order.total_cents)}</span>
                  </div>
                  {order.platform_fee_cents !== null && (
                    <>
                      <div className="oa-order-detail__ledger-row">
                        <span className="oa-order-detail__ledger-label">{t('ticketing.orderDetail.platformFee')}</span>
                        <span className="oa-order-detail__ledger-value oa-order-detail__ledger-value--fee">
                          -{formatCurrency(order.platform_fee_cents)}
                        </span>
                      </div>
                      <div className="oa-order-detail__ledger-divider">
                        <div className="oa-order-detail__ledger-row">
                          <span className="oa-order-detail__ledger-net-label">{t('ticketing.orderDetail.netRevenue')}</span>
                          <span className="oa-order-detail__ledger-net-value">
                            {order.org_revenue_cents !== null ? formatCurrency(order.org_revenue_cents) : formatCurrency(order.total_cents - (order.platform_fee_cents || 0))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column - Ticket Items */}
            <div className="oa-order-detail__column oa-order-detail__column--right">
              <h3 className="oa-order-detail__section-title">{t('ticketing.orderDetail.ticketItems')}</h3>
              <div className="oa-order-detail__tickets">
                {orderItems.length === 0 ? (
                  <div className="oa-order-detail__empty">
                    <span className="material-symbols-outlined oa-order-detail__empty-icon">add_circle</span>
                    <p className="oa-order-detail__empty-text">{t('ticketing.orderDetail.noAdditionalItems')}</p>
                  </div>
                ) : (
                  orderItems.map((item: any) => (
                    <div key={item.id} className="oa-order-detail__ticket-card">
                      <div className="oa-order-detail__ticket-icon">
                        <span className="material-symbols-outlined">confirmation_number</span>
                      </div>
                      <div className="oa-order-detail__ticket-info">
                        <p className="oa-order-detail__ticket-type">{item.ticket_types?.name || 'Standard Entry'}</p>
                        <h4 className="oa-order-detail__ticket-name">{item.ticket_types?.description || 'General Admission'}</h4>
                        <p className="oa-order-detail__ticket-qty">
                          {t('ticketing.orderDetail.quantity')}: {item.quantity} {item.quantity > 1 ? t('ticketing.orderDetail.tickets') : t('ticketing.orderDetail.ticket')}
                        </p>
                      </div>
                      <div className="oa-order-detail__ticket-price">
                        {formatCurrency(item.line_total_cents)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="oa-order-detail__footer">
          <div className="oa-order-detail__footer-left">
            {order.stripe_connect_account_id && (
              <>
                <div className="oa-order-detail__stripe-indicator">
                  <span className="oa-order-detail__stripe-dot"></span>
                  <span className="oa-order-detail__stripe-text">
                    {t('ticketing.orderDetail.stripeConnect')}: {order.stripe_connect_account_id.slice(-4)}
                  </span>
                </div>
                <div className="oa-order-detail__divider"></div>
              </>
            )}
            <span className="oa-order-detail__ref">{t('ticketing.orderDetail.reference')}: {order.id.slice(0, 8)}</span>
          </div>
          <div className="oa-order-detail__actions">
            {canRefund && (
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="oa-btn oa-btn--danger"
              >
                {isRefunding ? t('ticketing.orderDetail.processing') : t('ticketing.orderDetail.refundOrder')}
              </button>
            )}
          </div>
        </div>

        {/* Refund Info */}
        {!canRefund && order.status !== 'pending_payment' && (
          <div className="oa-card" style={{ background: 'var(--oa-info-bg)' }}>
            <div className="oa-flex oa-items-start oa-gap-3">
              <span className="material-symbols-outlined" style={{ color: 'var(--oa-info)', fontSize: '20px', flexShrink: 0 }}>
                info
              </span>
              <div className="oa-body-m oa-font-medium">
                {order.status === 'refunded'
                  ? t('ticketing.orderDetail.refundedMessage')
                  : t('ticketing.orderDetail.cannotRefundMessage')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
