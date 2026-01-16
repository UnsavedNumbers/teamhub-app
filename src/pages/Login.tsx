import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlatformAdminTheme } from '../hooks/usePlatformAdminTheme'

import { getHostAppContext } from '../utils/host'
import {
  setSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'

type RoleType = 'parent' | 'coach' | 'admin'

export default function Login() {
  const { loaded: themeLoaded } = usePlatformAdminTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleType>('parent')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signInWithEmail, signInWithGoogle, user } = useAuth()
  const navigate = useNavigate()

  // Clean up stale localStorage flags on mount
  useEffect(() => {
    cleanupStaleFlags()
  }, [])

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signInWithEmail(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Check if user is platform admin directly
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: adminData } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .single()
        
        if (adminData) {
          navigate('/platform-admin')
          return
        }
      }

      const appContext = getHostAppContext()
      navigate(appContext === 'platform-admin' ? '/platform-admin' : '/portal/dashboard')
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setGoogleLoading(true)
    
    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // If successful, page will redirect to Google OAuth
  }

  /**
   * Handle clicking the "Setup an Organization" button.
   * If user is authenticated, redirect directly to onboarding.
   * Otherwise, store flag and redirect to signup.
   */
  function handleSetupOrganization() {
    if (user) {
      // User is already authenticated, go directly to onboarding
      navigate('/admin/onboarding')
    } else {
      // Store flag in localStorage for the signup/OAuth flow
      setSetupOrganizationFlag()
      navigate('/portal/signup', {
        state: {
          setupOrganization: true,
          returnTo: '/admin/onboarding',
        },
      })
    }
  }

  const roleCards = [
    { id: 'parent', icon: 'family_restroom', label: 'Parent' },
    { id: 'coach', icon: 'sports', label: 'Coach' },
    { id: 'admin', icon: 'admin_panel_settings', label: 'Admin' },
  ] as const

  if (!themeLoaded) {
    return <div className="pa-root pa-skeleton" style={{ height: '100vh' }} />
  }

  return (
    <div className="pa-root" style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--pa-surface-subtle)' }}>
      {/* Left side - Organization Setup Section (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block" style={{ backgroundColor: 'var(--pa-n900)' }}>
        {/* Organization Setup Card Overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-16">
          <div className="w-full max-w-md p-10" style={{ color: 'var(--pa-white)' }}>
            {/* Icon */}
            <div className="mb-6" style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: 'var(--pa-radius-m)',
              backgroundColor: 'var(--pa-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-n900)' }}>corporate_fare</span>
            </div>

            {/* Title & Description */}
            <h2 className="pa-h2 mb-6">
              CREATE YOUR ORGANIZATION
            </h2>
            <p className="pa-body-l mb-8" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Start managing your youth sports organization with professional tools for registration, scheduling, payments, and communication.
            </p>

            {/* Features List */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-white)' }}>check_circle</span>
                <span className="pa-body-m">Unlimited teams and players</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-white)' }}>check_circle</span>
                <span className="pa-body-m">Integrated payments and invoicing</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-white)' }}>check_circle</span>
                <span className="pa-body-m">Event scheduling and attendance</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-white)' }}>check_circle</span>
                <span className="pa-body-m">Parent and coach portals</span>
              </li>
            </ul>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleSetupOrganization}
              className="pa-btn pa-btn--primary"
              style={{ width: '100%' }}
            >
              <span className="material-symbols-outlined">arrow_forward</span>
              GET STARTED FREE
            </button>

            <p className="pa-caption mt-4" style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
              No credit card required. Setup in under 5 minutes.
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-10 left-16 right-16">
          <p className="pa-body-s" style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
            Trusted by youth sports organizations nationwide
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-24" style={{ backgroundColor: 'var(--pa-surface)' }}>
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: 'var(--pa-n900)',
              borderRadius: 'var(--pa-radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-white)' }}>sports_score</span>
            </div>
            <span className="pa-h1" style={{ margin: 0 }}>YOUTHSPORTS</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="pa-h3" style={{ marginBottom: 'var(--pa-space-2)' }}>
              WELCOME BACK
            </h2>
            <p className="pa-body-m" style={{ color: 'var(--pa-n500)' }}>
              Enter your credentials to access your portal.
            </p>
          </div>

          {/* Form */}
          <div style={{ marginTop: 'var(--pa-space-5)' }}>
            {/* Role Selector (UX only) */}
            <div>
              <p className="pa-label" style={{ marginBottom: 'var(--pa-space-4)' }}>
                HOW ARE YOU SIGNING IN?
              </p>
              <div className="pa-grid pa-grid-3" style={{ gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-5)' }}>
                {roleCards.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 'var(--pa-space-3)',
                      border: '2px solid',
                      borderRadius: 'var(--pa-radius-m)',
                      cursor: 'pointer',
                      transition: 'all var(--pa-motion-normal) var(--pa-ease-out)',
                      backgroundColor: selectedRole === role.id ? 'var(--pa-n50)' : 'var(--pa-surface)',
                      borderColor: selectedRole === role.id ? 'var(--pa-n700)' : 'var(--pa-n200)',
                    }}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <span className="material-symbols-outlined mb-1" style={{
                      color: selectedRole === role.id ? 'var(--pa-n700)' : 'var(--pa-n500)',
                      fontSize: '24px'
                    }}>
                      {role.icon}
                    </span>
                    <span className="pa-caption" style={{
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: selectedRole === role.id ? 'var(--pa-n700)' : 'var(--pa-n500)'
                    }}>
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="pa-card" style={{ 
                  marginBottom: 'var(--pa-space-4)', 
                  padding: 'var(--pa-space-3)',
                  backgroundColor: 'var(--pa-danger-bg)',
                  borderColor: 'var(--pa-danger)',
                  color: 'var(--pa-danger)'
                }}>
                  <span className="pa-body-s">{error}</span>
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="pa-form-group">
                <div className="pa-form-group">
                  <label 
                    htmlFor="email" 
                    className="pa-label"
                  >
                    EMAIL ADDRESS
                  </label>
                  <div style={{ marginTop: 'var(--pa-space-2)' }}>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="pa-input"
                    />
                  </div>
                </div>

                <div className="pa-form-group">
                  <div className="pa-flex pa-justify-between">
                    <label 
                      htmlFor="password" 
                      className="pa-label"
                    >
                      PASSWORD
                    </label>
                    <div className="pa-body-s">
                      <Link 
                        to="/portal/forgot-password" 
                        style={{ 
                          fontWeight: 600, 
                          color: 'var(--pa-n700)',
                          textDecoration: 'none'
                        }}
                      >
                        FORGOT PASSWORD?
                      </Link>
                    </div>
                  </div>
                  <div style={{ marginTop: 'var(--pa-space-2)', position: 'relative' }}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pa-input"
                      style={{ paddingRight: '40px' }}
                    />
                    <button 
                      type="button" 
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined" style={{ color: 'var(--pa-n500)', fontSize: '20px' }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pa-checkbox" style={{ marginBottom: 'var(--pa-space-4)' }}>
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="pa-checkbox-input"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="pa-body-m"
                    style={{ marginLeft: 'var(--pa-space-2)' }}
                  >
                    REMEMBER ME FOR 30 DAYS
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="pa-btn pa-btn--primary"
                    style={{ width: '100%' }}
                  >
                    {loading ? 'SIGNING IN...' : 'CONTINUE TO PORTAL'}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div style={{ 
                position: 'relative', 
                margin: 'var(--pa-space-5) 0',
                textAlign: 'center'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center'
                }}>
                  <div style={{ 
                    width: '100%', 
                    borderTop: `1px solid var(--pa-n200)` 
                  }}></div>
                </div>
                <div style={{ 
                  position: 'relative', 
                  display: 'inline-block',
                  padding: '0 var(--pa-space-4)',
                  backgroundColor: 'var(--pa-surface)'
                }}>
                  <span className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
                    OR CONTINUE WITH
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="pa-btn pa-btn--secondary"
                style={{ width: '100%' }}
              >
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
              </button>

              {/* Sign up link */}
              <div style={{ 
                marginTop: 'var(--pa-space-5)', 
                paddingTop: 'var(--pa-space-5)', 
                borderTop: `1px solid var(--pa-n100)` 
              }}>
                <p className="pa-body-s" style={{ textAlign: 'center', color: 'var(--pa-n500)' }}>
                  NEW TO YOUTHSPORTS?{' '}
                  <Link 
                    to="/portal/signup" 
                    style={{ 
                      fontWeight: 600, 
                      color: 'var(--pa-n700)',
                      textDecoration: 'none'
                    }}
                  >
                    CREATE AN ACCOUNT
                  </Link>
                </p>
              </div>

              {/* Mobile-only: Organization Setup CTA */}
              <div className="lg:hidden" style={{ marginTop: 'var(--pa-space-4)' }}>
                <div className="pa-card" style={{ padding: 'var(--pa-space-4)' }}>
                  <p className="pa-body-m" style={{ marginBottom: 'var(--pa-space-3)' }}>
                    REPRESENTING AN ORGANIZATION?
                  </p>
                  <button
                    type="button"
                    onClick={handleSetupOrganization}
                    className="pa-btn pa-btn--primary"
                    style={{ width: '100%' }}
                  >
                    <span className="material-symbols-outlined">corporate_fare</span>
                    SETUP AN ORGANIZATION
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 'var(--pa-space-5)', textAlign: 'center' }}>
            <p className="pa-caption">
              © 2024 YOUTHSPORTS PROFESSIONAL SPORTS MANAGEMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
