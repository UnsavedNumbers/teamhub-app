import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      // Check for error in URL params
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      // Get the session from the URL hash (for OAuth callbacks)
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (data.session) {
        // Check for pending invite token
        const pendingInviteToken = sessionStorage.getItem('pending_invite_token')
        
        if (pendingInviteToken) {
          // Redirect to accept invite page
          navigate(`/portal/accept-invite?token=${pendingInviteToken}`)
          return
        }

        // Check for redirect param
        const redirectTo = searchParams.get('redirect')
        if (redirectTo) {
          navigate(redirectTo)
          return
        }

        // Default redirect to dashboard
        navigate('/portal/dashboard')
      } else {
        // No session, might be email confirmation
        // Supabase should handle this automatically
        navigate('/portal/login')
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                  error
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Authentication Error
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {error}
              </p>
              <a
                href="/portal/login"
                className="inline-flex justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Completing sign in...</p>
      </div>
    </div>
  )
}
