import { useLocation, Link } from 'react-router-dom'
import { getSetupOrganizationFlag } from '../utils/setupOrganization'

interface ConfirmEmailState {
  email?: string
  returnTo?: string
  setupOrganization?: boolean
}

export default function ConfirmEmail() {
  const location = useLocation()
  const state = location.state as ConfirmEmailState | null

  // Check for org setup intent from both state and localStorage
  const isOrgSetupFlow =
    state?.setupOrganization === true ||
    state?.returnTo === '/admin/onboarding' ||
    getSetupOrganizationFlag()

  const email = state?.email

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            TeamHub
          </h1>
        </div>

        {/* Card */}
        <div className="card">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>

          {email ? (
            <p className="text-slate-400 mb-4">
              We&apos;ve sent a confirmation link to{' '}
              <span className="font-semibold text-white">{email}</span>
            </p>
          ) : (
            <p className="text-slate-400 mb-4">
              We&apos;ve sent you a confirmation link. Please check your inbox and click the link to verify your account.
            </p>
          )}

          {/* Organization setup notice */}
          {isOrgSetupFlow && (
            <div className="mb-6 p-3 rounded-lg text-sm text-left"
              style={{ backgroundColor: 'rgba(19, 127, 236, 0.15)' }}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
                <div>
                  <p className="text-slate-200 font-medium mb-1">Organization Setup</p>
                  <p className="text-slate-400">
                    After confirming your email, you&apos;ll be redirected to complete your organization setup.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>

            <Link to="/portal/login" className="btn-primary inline-block">
              Back to Login
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-6 text-sm text-slate-500">
          Having trouble?{' '}
          <a href="mailto:support@teamhub.com" className="text-primary-400 hover:text-primary-300 transition-colors">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
