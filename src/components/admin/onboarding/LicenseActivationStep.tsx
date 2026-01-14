import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../../utils/errorUtils'

interface LicenseActivationStepProps {
  organizationId?: string
  onComplete: () => void
  onBack: () => void
}

export default function LicenseActivationStep({
  organizationId,
  onComplete,
  onBack,
}: LicenseActivationStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleActivateLicense = async () => {
    if (!organizationId) {
      setError('Organization not found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // TODO: Integrate with Stripe Checkout for payment
      // For now, we'll just mark the organization as having completed onboarding
      // In production, this would:
      // 1. Create a Stripe Checkout session
      // 2. Redirect to Stripe
      // 3. Handle webhook callback to activate license

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // For now, just complete onboarding
      // In production, this would be handled by a webhook after successful payment
      onComplete()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to activate license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-10 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4" style={{ color: '#137fec' }}>
          <div className="w-8 h-8">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                fill="currentColor"
              ></path>
              <path
                clipRule="evenodd"
                d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">YouthSports</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <nav className="flex items-center gap-9">
            <button
              onClick={() => navigate('/admin')}
              className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
              onMouseLeave={(e) => e.currentTarget.style.color = ''}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/admin/organization')}
              className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
              onMouseLeave={(e) => e.currentTarget.style.color = ''}
            >
              Org Settings
            </button>
            <span className="text-sm font-bold border-b-2 pb-1" style={{ color: '#137fec', borderColor: '#137fec' }}>
              License & Billing
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-16 px-6">
        <div className="max-w-[800px] w-full flex flex-col items-center gap-12">
          {/* Header Section */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-2" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: '#137fec' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#137fec' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#137fec' }}></span>
              </span>
              Season Ready 2024
            </div>
            <h1 className="text-slate-900 dark:text-white text-5xl font-black tracking-tight leading-none">
              Activate Your Organization
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xl font-medium max-w-xl mx-auto">
              One flat fee for full-scale professional management. No per-user complexity, just sports.
            </p>
          </div>

          {/* License Card */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row">
            {/* License Overview */}
            <div className="flex-1 p-10 border-r border-slate-100 dark:border-slate-800">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: '#137fec' }}>verified</span>
                License Overview
              </h3>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      Unlimited Parents & Players
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Scale your community without increasing costs.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Unlimited Teams</p>
                    <p className="text-sm text-slate-500 mt-1">Add as many divisions and teams as you need.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Unlimited Seasons</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Archive old data and start new ones effortlessly.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      Premium Infrastructure
                    </p>
                    <p className="text-sm text-slate-500 mt-1">99.9% uptime and enterprise-grade security.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Pricing Section */}
            <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-800/50 p-10 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Annual Billing
              </span>
              <div className="flex flex-col items-center mb-10">
                <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                  $499<span className="text-2xl font-bold text-slate-400">/yr</span>
                </div>
                <p className="text-slate-500 text-sm mt-3 font-medium">One flat fee per organization</p>
              </div>
              <div className="w-full space-y-4">
                <button
                  onClick={handleActivateLicense}
                  disabled={loading || !organizationId}
                  className="w-full py-4 rounded-lg text-white font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#137fec',
                    boxShadow: '0 10px 15px -3px rgba(19, 127, 236, 0.2)'
                  }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgba(19, 127, 236, 0.9)')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#137fec')}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Processing...
                    </span>
                  ) : (
                    'Activate license'
                  )}
                </button>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3 opacity-40 grayscale">
                    <svg className="h-4" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M22 10h-2V7h2V4h-4a4 4 0 00-4 4v2h-2v3h2v15h3V13h3z"></path>
                    </svg>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      SECURE PAYMENTS
                    </span>
                  </div>
                  <div className="flex justify-center gap-4 text-slate-400 opacity-60">
                    <span className="text-[10px] font-black italic">VISA</span>
                    <span className="text-[10px] font-black italic">MASTERCARD</span>
                    <span className="text-[10px] font-black italic">ACH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Features */}
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"></div>
            <div className="flex flex-wrap justify-center gap-12 items-center opacity-40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">account_balance</span>
                <span className="font-bold text-sm">Professional Grade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">gavel</span>
                <span className="font-bold text-sm">Fair Pricing Policy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">hub</span>
                <span className="font-bold text-sm">Scalable Infrastructure</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-10 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-slate-400">
        <div className="text-xs font-medium">© 2024 YouthSports Infrastructure. All rights reserved.</div>
        <div className="flex gap-6 text-xs font-bold uppercase tracking-widest">
          <button 
            className="transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >Privacy</button>
          <button 
            className="transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >Terms</button>
          <button 
            className="transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >Support</button>
        </div>
      </footer>

      {/* Back Button */}
      <div className="fixed bottom-8 left-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.color = '#137fec'}
          onMouseLeave={(e) => e.currentTarget.style.color = ''}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
    </div>
  )
}
