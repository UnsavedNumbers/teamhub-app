/**
 * Admin Ticketing Orders List
 * 
 * Admin page to view ticket orders and sales
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/types/ticketing'
import type { TicketOrder } from '@/types/ticketing'

export default function TicketingOrders() {
  const { data: ordersResponse } = useQuery({
    queryKey: ['ticket-orders', 'admin'],
    queryFn: async () => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      
      if (!userData?.org_id) return { data: [], error: null }
      
      const { data, error } = await supabase
        .from('ticket_orders')
        .select('*')
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return { data, error: null }
    },
  })

  const orders = ordersResponse?.data || []

  return (
    <div className="pa-page-container">
      <div className="pa-page-header">
        <h1 className="pa-page-title">Ticket Orders</h1>
      </div>

      {orders.length === 0 ? (
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
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: TicketOrder) => (
                <tr key={order.id}>
                  <td className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</td>
                  <td>{order.purchaser_email}</td>
                  <td>{formatCurrency(order.total_cents)}</td>
                  <td>
                    <span className={`pa-badge pa-badge-${order.status === 'paid' ? 'success' : 'default'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
