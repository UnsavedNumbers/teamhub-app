import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function PaymentCancel() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/portal/payments'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-4">
        <h1 className="text-3xl font-bold">Payment canceled</h1>
        <p className="text-slate-300">Your payment was canceled. No fees were charged.</p>
        <div className="flex items-center gap-4">
          <Link to="/portal/payments" className="btn-primary">Return to payments</Link>
          <Link to="/portal/dashboard" className="text-slate-300 hover:text-white">Go to dashboard</Link>
        </div>
        <p className="text-xs text-slate-500">You will be redirected to your payments in a few seconds.</p>
      </div>
    </div>
  )
}
