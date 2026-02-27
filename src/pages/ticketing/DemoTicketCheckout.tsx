import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getLink, RouteKeys } from '@/utils/routes'

function resolveRedirectTarget(raw: string | null, fallbackPath: string): string {
  if (!raw || raw.trim().length === 0) return fallbackPath
  return raw.trim()
}

export default function DemoTicketCheckout() {
  const [searchParams] = useSearchParams()

  const successTarget = useMemo(
    () => resolveRedirectTarget(searchParams.get('success'), getLink(RouteKeys.PORTAL_TICKETS)),
    [searchParams],
  )
  const cancelTarget = useMemo(
    () => resolveRedirectTarget(searchParams.get('cancel'), getLink(RouteKeys.PORTAL_TICKETS)),
    [searchParams],
  )

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Demo Checkout</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Simulated Stripe page. Choose complete purchase or cancel.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => window.location.assign(successTarget)}
            className="w-full h-12 rounded-xl bg-[#137fec] text-white font-bold hover:bg-blue-600 transition-colors"
          >
            Complete Purchase
          </button>
          <button
            type="button"
            onClick={() => window.location.assign(cancelTarget)}
            className="w-full h-12 rounded-xl border border-gray-300 dark:border-gray-700 text-[#111418] dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
