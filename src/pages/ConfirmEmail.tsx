import { Link } from 'react-router-dom'

export default function ConfirmEmail() {
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-slate-400 mb-6">
            We've sent you a confirmation link. Please check your inbox and click the link to verify your account.
          </p>

          <Link to="/portal/login" className="btn-primary inline-block">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
