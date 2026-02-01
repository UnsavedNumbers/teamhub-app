/**
 * Admin Ticketing Orders List
 * 
 * Admin page to view ticket orders and sales
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import { formatCurrency } from '@/types/ticketing'
import PublicUrlBanner from '@/components/admin/PublicUrlBanner'
import { getErrorMessage } from '@/utils/errorUtils'
import { Button } from '@/components/platformAdmin'

export default function TicketingOrders() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const { data: ordersResponse } = useQuery({
    queryKey: ['ticket-orders', 'admin', orgId],
    queryFn: async () => {
      if (!orgId) return { data: [], error: null }
      
      const { data, error } = await supabase
        .from('ticket_orders')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return { data, error: null }
    },
    enabled: !!orgId,
  })

  const orders = ordersResponse?.data || []
  
  // Check if any order has Connect fields to determine if we should show those columns
  const hasConnectFields = orders.some((order: any) => order.platform_fee_cents !== null)

  return (
    <div className="pa-page-container">
      <div className="pa-page-header">
        <h1 className="pa-page-title">Ticket Orders</h1>
      </div>

      {/* Public URL Banner */}
      {currentOrganization?.id && (
        <PublicUrlBanner
          orgId={currentOrganization.id}
          title="Direct guests here"
          description="Guests purchase at your public ticket page. Confirmation emails include a link for them to view their tickets."
          path="tickets"
        />
      )}

      {isLoading ? (
        <div className="pa-empty-state">
          <div className="pa-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', margin: '0 auto' }} />
          <p className="pa-mt-4">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="pa-empty-state">
          <p className="pa-text-danger pa-mb-4">{getErrorMessage(error as any) || 'Failed to load orders'}</p>
          <Button onClick={() => refetch()} variant="primary">
            Retry
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="pa-empty-state">
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="pa-table-container">
          <table className="pa-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Purchaser</th>
                <th>Total</th>
                {hasConnectFields && (
                  <>
                    <th>Gross</th>
                    <th>Platform Fee</th>
                    <th>Net</th>
                  </>
                )}
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr 
                  key={order.id}
                  onClick={() => navigate(`/admin/ticketing/orders/${order.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</td>
                  <td>{order.purchaser_email}</td>
                  <td>{formatCurrency(order.total_cents)}</td>
                  {hasConnectFields && (
                    <>
                      <td>{order.platform_fee_cents !== null ? formatCurrency(order.total_cents) : '—'}</td>
                      <td>{order.platform_fee_cents !== null ? formatCurrency(order.platform_fee_cents) : '—'}</td>
                      <td>{order.org_revenue_cents !== null ? formatCurrency(order.org_revenue_cents) : '—'}</td>
                    </>
                  )}
                  <td>
                    <span className={`pa-badge pa-badge-${order.status === 'paid' ? 'success' : order.status === 'refunded' ? 'danger' : 'default'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
