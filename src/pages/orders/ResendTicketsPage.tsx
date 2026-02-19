/**
 * Resend Tickets Page
 * 
 * Allows users to request a resend of their ticket email.
 */

import { useState } from 'react'
import { useT } from '@/i18n/useI18n'
import { resendTickets } from '@/data/services/ticketingService'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function ResendTicketsPage() {
  useDebugLifecycle('ResendTicketsPage')
  
  const t = useT()
  const [email, setEmail] = useState('')
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderId.trim() || !email.trim()) {
      return
    }

    setStatus('loading')
    setMessage('')

    const { data, error } = await resendTickets({
      order_id: orderId.trim(),
      email: email.trim(),
    })

    if (error || !data) {
      setStatus('error')
      setMessage(error?.message || t('ticketing.resend.error'))
    } else {
      setStatus('success')
      setMessage(data.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
          {t('ticketing.resend.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('ticketing.resend.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="order-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.resend.orderId')}
            </label>
            <input
              id="order-id"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t('ticketing.resend.orderIdPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
              disabled={status === 'loading'}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.resend.emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('ticketing.resend.emailPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
              disabled={status === 'loading'}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || !orderId.trim() || !email.trim()}
            className="w-full bg-[#137fec] text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('ticketing.resend.sending')}
              </span>
            ) : (
              t('ticketing.resend.resendTickets')
            )}
          </button>
        </form>

        {status === 'success' && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 dark:text-green-200 font-semibold">
                {t('ticketing.resend.success')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {message}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-semibold">
                {t('ticketing.resend.error')}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
