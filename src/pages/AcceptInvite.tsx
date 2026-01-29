import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import PortalLayout from '../components/portal/PortalLayout'
import { showSuccess, showError } from '../utils/toast'

// Minimal layout for unauthenticated users - no portal navigation
function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />
      
      {/* Simple header with logo */}
      <header className="py-6 px-6 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1200px] mx-auto flex items-center">
          <span className="text-xl font-bold text-primary-600">YouthSports Team Hub</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const hash = window.location.hash
  const hashParams = new URLSearchParams(
    hash.replace(/^#/, '')
  )
  
  // Debug logging
  console.log('[AcceptInvite] URL:', window.location.href)
  console.log('[AcceptInvite] searchParams token:', searchParams.get('token'))
  console.log('[AcceptInvite] searchParams invite_token:', searchParams.get('invite_token'))
  console.log('[AcceptInvite] hash:', hash)
  console.log('[AcceptInvite] hashParams token:', hashParams.get('token'))
  
  const token =
    searchParams.get('token') ||
    searchParams.get('invite_token') ||
    hashParams.get('token') ||
    hashParams.get('invite_token')
  const inviteType =
    searchParams.get('type') ||
    hashParams.get('type') ||
    'guardian'
    
  console.log('[AcceptInvite] Final token:', token)
  console.log('[AcceptInvite] Final inviteType:', inviteType)
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  
  // Refs to prevent issues
  const isMountedRef = useRef(true)
  const hasAttemptedAcceptRef = useRef(false)
  const isProcessingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Clear any pending timeouts to prevent memory leaks
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  // Helper function to navigate to signup with invite details
  const navigateToSignupWithInviteDetails = useCallback(async (inviteToken: string, inviteTypeValue: string) => {
    // Store token for persistence
    sessionStorage.setItem('pending_invite_token', inviteToken)
    localStorage.setItem('pending_invite_token', inviteToken)
    
    const acceptInviteUrl = `/portal/accept-invite?token=${encodeURIComponent(inviteToken)}&type=${encodeURIComponent(inviteTypeValue)}`
    
    // For guardian invites, fetch details to pre-fill email
    if (inviteTypeValue === 'guardian') {
      try {
        const { data, error } = await supabase
          .rpc('get_parent_invite_details', { p_token: inviteToken })

        if (!error && data && Array.isArray(data) && data.length > 0) {
          const inviteDetails = data[0] as { 
            valid: boolean
            email: string | null
            athlete_id: string | null
            org_id: string | null
            expired: boolean
            already_accepted: boolean
            message: string
          }

          if (inviteDetails.valid && inviteDetails.email && inviteDetails.athlete_id) {
            // Store athlete_id for persistence
            sessionStorage.setItem('pending_invite_athlete_id', inviteDetails.athlete_id)
            
            navigate('/portal/signup', { 
              state: { 
                returnTo: acceptInviteUrl,
                inviteEmail: inviteDetails.email,
                athleteId: inviteDetails.athlete_id
              },
              replace: true 
            })
            return
          }
        }
      } catch (err) {
        console.error('Error fetching invite details:', err)
        // Fall through to default navigation
      }
    }
    
    // Default navigation without pre-filled email
    navigate('/portal/signup', { 
      state: { 
        returnTo: acceptInviteUrl 
      },
      replace: true 
    })
  }, [navigate])

  // Restore token from storage if URL doesn't have it
  useEffect(() => {
    const inviteTokenParam = searchParams.get('invite_token') || hashParams.get('invite_token')
    if (!searchParams.get('token') && inviteTokenParam) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('token', inviteTokenParam)
      currentUrl.searchParams.delete('invite_token')
      if (inviteType) {
        currentUrl.searchParams.set('type', inviteType)
      }
      navigate(currentUrl.pathname + currentUrl.search, { replace: true })
      return
    }

    if (!token) {
      const storedToken = sessionStorage.getItem('pending_invite_token') || localStorage.getItem('pending_invite_token')
      if (storedToken) {
        // Reconstruct URL with token
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('token', storedToken)
        if (inviteType) {
          currentUrl.searchParams.set('type', inviteType)
        }
        navigate(currentUrl.pathname + currentUrl.search, { replace: true })
      } else if (!authLoading) {
        if (isMountedRef.current) {
          setError('Invalid invite code.')
        }
      }
    }
  }, [token, inviteType, navigate, authLoading, searchParams, hash])

  // Handle auth check and redirect (separate from auto-accept)
  useEffect(() => {
    if (authLoading || !token) return

    // If not logged in, redirect to signup with invite details
    if (!user && token) {
      navigateToSignupWithInviteDetails(token, inviteType)
    }
  }, [authLoading, user, token, inviteType, navigateToSignupWithInviteDetails])

  const handleAcceptInvite = useCallback(async () => {
    if (!token) {
      if (isMountedRef.current) {
        setError('Invalid invite code.')
      }
      return
    }

    if (!user) {
      // Should not happen due to useEffect, but handle gracefully
      navigateToSignupWithInviteDetails(token, inviteType)
      return
    }

    // Prevent concurrent calls
    if (isProcessingRef.current) {
      return
    }
    isProcessingRef.current = true

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
      setMessage(null)
    }

    try {
      // Call the appropriate RPC based on invite type
      if (inviteType === 'guardian') {
        const { data, error: rpcError } = await supabase
          .rpc('accept_parent_invite', {
            p_token: token
          })

        if (rpcError) {
          throw rpcError
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as { success: boolean; message?: string; organization_id?: string; athlete_id?: string; child_id?: string }
          if (result?.success) {
            if (isMountedRef.current) {
              setMessage('Successfully accepted invitation!')
            }
            showSuccess('You have been successfully linked as a guardian.')
            // Clear the pending token from both storages
            sessionStorage.removeItem('pending_invite_token')
            localStorage.removeItem('pending_invite_token')
            // Redirect to dashboard after a short delay
            timeoutRef.current = window.setTimeout(() => {
              if (isMountedRef.current) {
                navigate('/portal/dashboard', { replace: true })
              }
              timeoutRef.current = null
            }, 2000)
          } else {
            // Display specific error message from RPC
            throw new Error(result.message || 'Failed to accept invitation')
          }
        } else {
          throw new Error('Invalid response from server')
        }
      } else {
        // Handle other invite types (organization, etc.)
        const { data, error: rpcError } = await supabase
          .rpc('accept_organization_invite', {
            p_token: token
          })

        if (rpcError) {
          throw rpcError
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as { success: boolean; message?: string; org_id?: string; organization_name?: string; role?: string }
          if (result?.success) {
            if (isMountedRef.current) {
              setMessage('Successfully accepted invitation!')
            }
            showSuccess('You have been successfully added to the organization.')
            sessionStorage.removeItem('pending_invite_token')
            localStorage.removeItem('pending_invite_token')
            timeoutRef.current = window.setTimeout(() => {
              if (isMountedRef.current) {
                navigate('/portal/dashboard', { replace: true })
              }
              timeoutRef.current = null
            }, 2000)
          } else {
            // Display specific error message from RPC
            throw new Error(result.message || 'Failed to accept invitation')
          }
        } else {
          throw new Error('Invalid response from server')
        }
      }
    } catch (err: any) {
      console.error('Error accepting invite:', err)
      
      // Check for network errors
      const isNetworkError = err?.message?.includes('network') || 
                            err?.message?.includes('timeout') || 
                            err?.message?.includes('fetch') ||
                            err?.message?.includes('Failed to fetch')
      
      // Use specific error message from RPC if available
      let errorMessage = err?.message || 'Failed to accept invitation. Please try again.'
      
      // Sanitize error message to prevent XSS (basic sanitization)
      errorMessage = errorMessage
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
      
      if (isNetworkError) {
        errorMessage = 'Connection error. Please check your internet connection and try again.'
      }
      
      if (isMountedRef.current) {
        setError(errorMessage)
      }
      showError(errorMessage)
      
      // Don't clear token on error - allow user to try again
      // Only clear on specific errors (expired, already accepted)
      if (errorMessage.includes('expired') || errorMessage.includes('already accepted') || errorMessage.includes('already processed')) {
        sessionStorage.removeItem('pending_invite_token')
        localStorage.removeItem('pending_invite_token')
      }
      
      // Reset attempt flag so user can retry
      hasAttemptedAcceptRef.current = false
    } finally {
      isProcessingRef.current = false
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [token, inviteType, user, navigate, navigateToSignupWithInviteDetails])

  // Auto-accept invite when user becomes available (only once)
  useEffect(() => {
    if (authLoading || !user || !token || hasAttemptedAcceptRef.current || isProcessingRef.current) {
      return
    }

    // Only auto-accept once
    hasAttemptedAcceptRef.current = true
    handleAcceptInvite()
  }, [authLoading, user, token, handleAcceptInvite])

  // Use minimal layout for unauthenticated users, full portal layout for authenticated
  const Layout = user ? PortalLayout : MinimalLayout

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <MinimalLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Card className="max-w-md w-full p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
            <p>Loading...</p>
          </Card>
        </div>
      </MinimalLayout>
    )
  }

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-[50vh]">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
          
          {error ? (
            <div>
              <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
              {error.includes('Login required') || error.includes('Email mismatch') ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    You need to be logged in with the email address that received this invitation.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      sessionStorage.setItem('pending_invite_token', token || '')
                      const acceptInviteUrl = `/portal/accept-invite?token=${encodeURIComponent(token || '')}&type=${encodeURIComponent(inviteType)}`
                      navigate('/portal/signup', { 
                        state: { returnTo: acceptInviteUrl } 
                      })
                    }} 
                    className="w-full mb-2"
                  >
                    Create Account
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      sessionStorage.setItem('pending_invite_token', token || '')
                      const acceptInviteUrl = `/portal/accept-invite?token=${encodeURIComponent(token || '')}&type=${encodeURIComponent(inviteType)}`
                      navigate('/portal/login', { 
                        state: { returnTo: acceptInviteUrl } 
                      })
                    }} 
                    className="w-full"
                  >
                    Sign In
                  </Button>
                </div>
              ) : error.includes('Connection error') || error.includes('network') || error.includes('timeout') ? (
                <div className="space-y-2">
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      hasAttemptedAcceptRef.current = false
                      handleAcceptInvite()
                    }} 
                    className="w-full mb-2"
                    disabled={loading}
                  >
                    {loading ? 'Retrying...' : 'Retry'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/portal/dashboard')} 
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/portal/dashboard')} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          ) : message ? (
            <div>
              <p className="mb-4 text-green-600 dark:text-green-400">{message}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting to dashboard...</p>
            </div>
          ) : (
            <div>
              <p className="mb-6">Processing your invitation...</p>
              {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Please wait...</p>}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
