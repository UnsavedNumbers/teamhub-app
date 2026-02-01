/**
 * Admin Ticket Order Detail Page
 * 
 * Admin page to view ticket order details and process refunds
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/contexts/OrganizationContext'
import { getTicketOrderByIdAdmin, processTicketOrderRefund } from '@/data/services/ticketingService'
import { formatCurrency } from '@/types/ticketing'
import { showSuccess, showError } from '@/utils/toast'
import { getErrorMessage } from '@/utils/errorUtils'
import {
  AdminPageHeader,
  Card,
  Button,
  Badge,
} from '@/components/platformAdmin'

export default function TicketingOrderDetail() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrganization?.id

  const { data: orderResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['ticket-order-admin', orderId],
    queryFn: () => getTicketOrderByIdAdmin(orderId!),
    enabled: !!orderId,
  })

  const order = orderResponse?.data || null

  // Verify order belongs to current org
  if (order && orgId && order.org_id !== orgId) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Order Not Found" />
        <Card>
          <p className="pa-text-danger">This order does not belong to your organization.</p>
          <Button onClick={() => navigate('/admin/ticketing/orders')} variant="primary">
            Back to Orders
          </Button>
        </Card>
      </div>
    )
  }

  const handleRefund = async () => {
    if (!orderId || !order) return

    if (!confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      return
    }

    try {
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
    }
  }

  // Validate orderId format
  if (orderId && !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Invalid Order ID" />
        <Card>
          <p className="pa-text-danger">The order ID format is invalid.</p>
          <Button onClick={() => navigate('/admin/ticketing/orders')} variant="primary">
            Back to Orders
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Loading Order..." />
        <Card>
          <div className="pa-text-center pa-py-8">
            <div className="pa-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', margin: '0 auto' }} />
            <p className="pa-mt-4">Loading order details...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Order Not Found" />
        <Card>
          <p className="pa-text-danger pa-mb-4">{getErrorMessage(error) || 'Order not found'}</p>
          <div className="pa-flex pa-gap-2">
            <Button onClick={() => refetch()} variant="secondary">
              Retry
            </Button>
            <Button onClick={() => navigate('/admin/ticketing/orders')} variant="primary">
              Back to Orders
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const event = (order as any).ticketed_events
  const orderItems = (order as any).ticket_order_items || []
  const canRefund = order.status === 'paid' && order.stripe_charge_id !== null

  return (
    <div className="pa-root">
      <AdminPageHeader title={`Order ${order.id.slice(-8).toUpperCase()}`} />
      
      <div className="pa-flex pa-gap-4 pa-mb-4">
        <Button variant="ghost" onClick={() => navigate('/admin/ticketing/orders')}>
          ← Back to Orders
        </Button>
      </div>

      <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 pa-gap-6">
        {/* Order Information */}
        <Card>
          <h3 className="pa-h3 pa-mb-4">Order Information</h3>
          <div className="pa-space-y-3">
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Order ID</p>
              <p className="pa-body-s pa-font-mono">{order.id}</p>
            </div>
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Status</p>
              <Badge variant={order.status === 'paid' ? 'success' : order.status === 'refunded' ? 'danger' : undefined}>
                {order.status}
              </Badge>
            </div>
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Purchaser</p>
              <p className="pa-body-s">{order.purchaser_email}</p>
              {order.purchaser_name && (
                <p className="pa-body-xs pa-text-slate-400">{order.purchaser_name}</p>
              )}
            </div>
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Created</p>
              <p className="pa-body-s">{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</p>
            </div>
            {order.processed_at && (
              <div>
                <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Processed</p>
                <p className="pa-body-s">{new Date(order.processed_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Event Information */}
        {event && (
          <Card>
            <h3 className="pa-h3 pa-mb-4">Event</h3>
            <div className="pa-space-y-3">
              <div>
                <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Title</p>
                <p className="pa-body-s pa-font-semibold">{event.title}</p>
              </div>
              {event.starts_at && (
                <div>
                  <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Date</p>
                  <p className="pa-body-s">{new Date(event.starts_at).toLocaleString()}</p>
                </div>
              )}
              {event.venue_name && (
                <div>
                  <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Venue</p>
                  <p className="pa-body-s">
                    {event.venue_name}
                    {event.venue_city && event.venue_state && (
                      <span className="pa-text-slate-400">, {event.venue_city}, {event.venue_state}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Financial Details */}
        <Card>
          <h3 className="pa-h3 pa-mb-4">Financial Details</h3>
          <div className="pa-space-y-3">
            <div className="pa-flex pa-justify-between pa-items-center pa-pb-3 pa-border-b pa-border-slate-200">
              <span className="pa-body-s pa-text-slate-600">Total</span>
              <span className="pa-body-s pa-font-semibold">{formatCurrency(order.total_cents)}</span>
            </div>
            {order.platform_fee_cents !== null && (
              <>
                <div className="pa-flex pa-justify-between pa-items-center pa-pb-3 pa-border-b pa-border-slate-200">
                  <span className="pa-body-s pa-text-slate-600">Gross</span>
                  <span className="pa-body-s">{formatCurrency(order.total_cents)}</span>
                </div>
                <div className="pa-flex pa-justify-between pa-items-center pa-pb-3 pa-border-b pa-border-slate-200">
                  <span className="pa-body-s pa-text-slate-600">Platform Fee</span>
                  <span className="pa-body-s pa-text-slate-500">-{formatCurrency(order.platform_fee_cents)}</span>
                </div>
                <div className="pa-flex pa-justify-between pa-items-center pa-pt-2">
                  <span className="pa-body-s pa-font-semibold pa-text-slate-700">Your Revenue</span>
                  <span className="pa-body-s pa-font-semibold pa-text-green-600">
                    {order.org_revenue_cents !== null ? formatCurrency(order.org_revenue_cents) : '—'}
                  </span>
                </div>
              </>
            )}
            {order.stripe_connect_account_id && (
              <div className="pa-mt-4 pa-pt-4 pa-border-t pa-border-slate-200">
                <p className="pa-body-xs pa-text-slate-500 pa-mb-1">Connect Account</p>
                <p className="pa-body-xs pa-font-mono">{order.stripe_connect_account_id.slice(-4)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Ticket Items */}
        <Card>
          <h3 className="pa-h3 pa-mb-4">Ticket Items</h3>
          {orderItems.length === 0 ? (
            <p className="pa-body-s pa-text-slate-500">No items found</p>
          ) : (
            <div className="pa-space-y-3">
              {orderItems.map((item: any) => (
                <div key={item.id} className="pa-pb-3 pa-border-b pa-border-slate-200 last:pa-border-0">
                  <div className="pa-flex pa-justify-between pa-items-start">
                    <div>
                      <p className="pa-body-s pa-font-semibold">{item.ticket_types?.name || 'Ticket'}</p>
                      {item.ticket_types?.description && (
                        <p className="pa-body-xs pa-text-slate-500">{item.ticket_types.description}</p>
                      )}
                      <p className="pa-body-xs pa-text-slate-400 pa-mt-1">Quantity: {item.quantity}</p>
                    </div>
                    <p className="pa-body-s pa-font-semibold">{formatCurrency(item.line_total_cents)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Refund Action */}
      {canRefund && (
        <Card className="pa-mt-6">
          <div className="pa-flex pa-items-center pa-justify-between">
            <div>
              <h3 className="pa-h3 pa-mb-2">Refund Order</h3>
              <p className="pa-body-xs pa-text-slate-500">
                Process a full refund for this order. The refund will be processed through Stripe and the order status will be updated automatically.
              </p>
            </div>
            <Button variant="danger" onClick={handleRefund} disabled={isRefunding}>
              {isRefunding ? 'Processing...' : 'Refund Order'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
