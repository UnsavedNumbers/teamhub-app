/**
 * OrderContextPanel Component
 * 
 * Displays order context for multi-ticket orders.
 * Shows ticket counts and provides "Validate Next" button.
 */

import { Check } from 'lucide-react'

export interface OrderContext {
  order_id: string
  total_tickets: number
  active_count: number
  used_count: number
  refunded_count: number
  remaining_active: number
  next_ticket_id: string | null
  next_ticket_type: string | null
  tickets_by_type: Record<string, {
    total: number
    active: number
    used: number
    refunded: number
  }>
}

interface OrderContextPanelProps {
  context: OrderContext
  onValidateNext: () => void
}

/**
 * OrderContextPanel Component
 * 
 * Shows order summary and allows validating the next ticket in a multi-ticket order.
 */
export function OrderContextPanel({ context, onValidateNext }: OrderContextPanelProps) {
  if (!context || context.remaining_active === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Order Summary</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          #{context.order_id.slice(-8).toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <span className="text-3xl font-black text-green-600 dark:text-green-400">
            {context.used_count}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Validated</span>
        </div>
        <div className="text-center">
          <span className="text-3xl font-black text-[#137fec]">
            {context.remaining_active}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Remaining</span>
        </div>
        {context.refunded_count > 0 && (
          <div className="text-center">
            <span className="text-3xl font-black text-red-600 dark:text-red-400">
              {context.refunded_count}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Refunded</span>
          </div>
        )}
      </div>

      {/* Breakdown by ticket type */}
      {Object.keys(context.tickets_by_type).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(context.tickets_by_type).map(([type, counts]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{type}</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {counts.used}/{counts.total - counts.refunded}
                {counts.refunded > 0 && (
                  <span className="text-red-600 dark:text-red-400 ml-1">
                    ({counts.refunded} refunded)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Validate next button */}
      {context.next_ticket_id && (
        <button
          onClick={onValidateNext}
          className="w-full bg-[#137fec] text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Validate Next
          {context.next_ticket_type && (
            <span className="text-sm opacity-90">({context.next_ticket_type})</span>
          )}
        </button>
      )}
    </div>
  )
}
