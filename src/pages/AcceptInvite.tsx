import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface InviteDetails {
  valid: boolean
  organization_name: string | null
  role: 'parent' | 'coach' | 'org_admin' | null
  email: string | null
  expires_at: string | null
  expired: boolean
  already_accepted: boolean
  message: string
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc('get_invite_details', { p_token: token })
        
        if (error) {
          setError('Failed to load invite details')
          console.error('Error fetching invite:', error)
        } else if (data && data.length > 0) {
          setInviteDetails(data[0] as InviteDetails)
        } else {
          setInviteDetails({
            valid: false,
            organization_name: null,
            role: null,
            email: null,
            expires_at: null,
            expired: false,
            already_accepted: false,
            message: 'Invalid invite token',
          })
        }
      } catch (err) {
        setError('Failed to load invite details')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  // Store token for after auth if user not logged in
  useEffect(() => {
    if (token && !user && !authLoading) {
      sessionStorage.setItem('pending_invite_token', token)
    }
  }, [token, user, authLoading])

  async function handleAcceptInvite() {
    if (!token || !user) return

    setAccepting(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('accept_organization_invite', { p_token: token })
      
      if (error) {
        setError(error.message)
      } else if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          setSuccess(true)
          sessionStorage.removeItem('pending_invite_token')
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/portal/dashboard')
          }, 2000)
        } else {
          setError(result.message)
        }
      }
    } catch (err) {
      setError('Failed to accept invite')
      console.error('Error accepting invite:', err)
    } finally {
      setAccepting(false)
    }
  }

  const getRoleLabel = (role: string | null): string => {
    switch (role) {
      case 'parent': return 'Parent'
      case 'coach': return 'Coach'
      case 'org_admin': return 'Organization Admin'
      default: return 'Member'
    }
  }

  const getRoleIcon = (role: string | null): string => {
    switch (role) {
      case 'parent': return 'family_restroom'
      case 'coach': return 'sports'
      case 'org_admin': return 'admin_panel_settings'
      default: return 'person'
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading invite details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Left side - Hero Image (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Youth sports team"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EioYyXup8hWypN337Pbn_TYldQzX6pJ4B-XzTwJNpPYzGkJM01_RX7voFn-WqPfzeKYEV3uehlCj6Ydm2kjcJgKhzjTJFk4ivzAGO71ShxUz2s0urAT6vdIuo1L6WOCPkjK_G3zgt7Ydml45W9KGChFKid43FWMrIDJEQ3Mo6QfpKjlwuFkFyCV5TwbqkBBH-M_0Uqg9OViXz-ry9d9HkTPPNWa7E6D153LVwiEQyYTbFEZdVULTK-loC4YTy2yXfn98L3Y0F-Q"
        />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <h2 className="font-display text-5xl text-white tracking-wider mb-4">
            You're Invited!
          </h2>
          <p className="text-xl text-slate-200 max-w-lg leading-relaxed">
            Join your team on TeamHub and connect with coaches, parents, and athletes.
          </p>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">sports_score</span>
            </div>
            <span className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">TEAMHUB</span>
          </div>

          {/* No token */}
          {!token && (
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-3xl">
                  link_off
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                No Invite Found
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                This link doesn't contain a valid invite token. Please check your invite email and try again.
              </p>
              <Link
                to="/portal/login"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Invalid or expired invite */}
          {token && inviteDetails && !inviteDetails.valid && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                  {inviteDetails.expired ? 'schedule' : inviteDetails.already_accepted ? 'check_circle' : 'error'}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                {inviteDetails.expired ? 'Invite Expired' : inviteDetails.already_accepted ? 'Already Accepted' : 'Invalid Invite'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {inviteDetails.message}
              </p>
              <Link
                to="/portal/login"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Success state */}
          {success && inviteDetails && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                  celebration
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Welcome to {inviteDetails.organization_name}!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                You've successfully joined as a {getRoleLabel(inviteDetails.role)}. Redirecting you to the dashboard...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          )}

          {/* Valid invite - show accept UI */}
          {token && inviteDetails && inviteDetails.valid && !success && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  You've been invited!
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Accept this invitation to join the organization.
                </p>
              </div>

              {/* Invite Card */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-700">
                {/* Organization */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      sports_score
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {inviteDetails.organization_name}
                  </h3>
                </div>

                {/* Role */}
                <div className="flex items-center justify-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-xl mb-4">
                  <span className="material-symbols-outlined text-primary">
                    {getRoleIcon(inviteDetails.role)}
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Your Role
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {getRoleLabel(inviteDetails.role)}
                    </p>
                  </div>
                </div>

                {/* Expiration */}
                {inviteDetails.expires_at && (
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                    Expires: {new Date(inviteDetails.expires_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              {user ? (
                /* User is logged in - show accept button */
                <button
                  onClick={handleAcceptInvite}
                  disabled={accepting}
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accepting ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-2 text-lg">check</span>
                      Accept Invitation
                    </>
                  )}
                </button>
              ) : (
                /* User not logged in - show auth options */
                <div className="space-y-4">
                  <Link
                    to={`/login?redirect=/accept-invite?token=${token}`}
                    className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Sign in to Accept
                  </Link>
                  <Link
                    to={`/signup?redirect=/accept-invite?token=${token}`}
                    className="flex w-full justify-center rounded-md bg-slate-100 dark:bg-slate-700 px-3 py-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Create Account to Accept
                  </Link>
                </div>
              )}

              {/* Alternative for logged in users */}
              {user && (
                <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Signed in as <span className="font-medium text-slate-900 dark:text-white">{user.email}</span>
                </p>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-auto pt-10 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              © 2024 TeamHub Professional Sports Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
