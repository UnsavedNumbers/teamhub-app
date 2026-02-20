import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { captureEvent } from '../lib/analytics/analytics'

export default function PaymentCancel() {
  useDebugLifecycle('PaymentCancel')
  const navigate = useNavigate()
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true
      captureEvent('payment_failed', { reason: 'cancelled' })
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => navigate('/portal/payments'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Payments', path: '/portal/payments' },
          { label: 'Payment canceled' },
        ]}
      >
        <div className="max-w-2xl mx-auto">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
              <Icon name="cancel" size="text-4xl" className="text-slate-400" />
            </div>
            <PageTitle>Payment canceled</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              No fees were charged.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/portal/payments">
              <Button variant="primary">
                Return to payments
              </Button>
            </Link>
            <Link to="/portal/dashboard" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Go to dashboard
            </Link>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mt-6">
            Redirecting to payments
          </p>
        </div>
      </PortalLayout>
  )
}
