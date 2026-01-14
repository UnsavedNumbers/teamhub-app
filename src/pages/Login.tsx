import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  setSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'

type RoleType = 'parent' | 'coach' | 'admin'

export default function Login() {
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
      navigate('/portal/dashboard')
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
    // If successful, the page will redirect to Google OAuth
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

  return (
    <div className="flex min-h-screen font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Left side - Organization Setup Section (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        {/* Background Image */}
        <img
          alt="Peaceful empty sports stadium at sunset"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EioYyXup8hWypN337Pbn_TYldQzX6pJ4B-XzTwJNpPYzGkJM01_RX7voFn-WqPfzeKYEV3uehlCj6Ydm2kjcJgKhzjTJFk4ivzAGO71ShxUz2s0urAT6vdIuo1L6WOCPkjK_G3zgt7Ydml45W9KGChFKid43FWMrIDJEQ3Mo6QfpKjlwuFkFyCV5TwbqkBBH-M_0Uqg9OViXz-ry9d9HkTPPNWa7E6D153LVwiEQyYTbFEZdVULTK-loC4YTy2yXfn98L3Y0F-Q"
        />
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/30"></div>

        {/* Organization Setup Card Overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-16">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 shadow-2xl">
            {/* Icon */}
            <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-white">corporate_fare</span>
            </div>

            {/* Title & Description */}
            <h2 className="font-display text-3xl text-white tracking-wide mb-3">
              Create Your Organization
            </h2>
            <p className="text-lg text-slate-200/90 leading-relaxed mb-8">
              Start managing your youth sports organization with professional tools for registration, scheduling, payments, and communication.
            </p>

            {/* Features List */}
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-white/80">
                <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                <span>Unlimited teams and players</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/80">
                <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                <span>Integrated payments and invoicing</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/80">
                <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                <span>Event scheduling and attendance</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/80">
                <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                <span>Parent and coach portals</span>
              </li>
            </ul>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleSetupOrganization}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                backgroundColor: '#137fec',
                boxShadow: '0 15px 30px -10px rgba(19, 127, 236, 0.4)',
              }}
            >
              <span className="material-symbols-outlined">arrow_forward</span>
              Get Started Free
            </button>

            <p className="mt-4 text-center text-xs text-white/50">
              No credit card required. Setup in under 5 minutes.
            </p>
          </div>
        </div>

        {/* Bottom tagline (moved down) */}
        <div className="absolute bottom-10 left-16 right-16">
          <p className="text-sm text-slate-300 opacity-70">
            Trusted by youth sports organizations nationwide
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">sports_score</span>
            </div>
            <span className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">YOUTHSPORTS</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enter your credentials to access your portal.
            </p>
          </div>

          {/* Form */}
          <div className="mt-10">
            {/* Role Selector (UX only) */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                How are you signing in?
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {roleCards.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={`role-card ${selectedRole === role.id ? 'active' : 'inactive'}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <span className={`material-symbols-outlined mb-1 ${
                      selectedRole === role.id ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {role.icon}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      selectedRole === role.id 
                        ? 'text-slate-700 dark:text-slate-200' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                  >
                    Email Address
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <div className="text-sm">
                      <Link 
                        to="/portal/forgot-password" 
                        className="font-semibold text-primary hover:text-blue-500"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input pr-10"
                    />
                    <button 
                      type="button" 
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-slate-400 text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="ml-3 block text-sm leading-6 text-slate-700 dark:text-slate-400"
                  >
                    Remember me for 30 days
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Continue to Portal'}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 dark:text-slate-400">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="btn-google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Sign up link */}
              <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  New to YouthSports?{' '}
                  <Link to="/portal/signup" className="font-semibold leading-6 text-primary hover:text-blue-500">
                    Create an account
                  </Link>
                </p>
              </div>

              {/* Mobile-only: Organization Setup CTA */}
              <div className="mt-6 lg:hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                    Representing an organization?
                  </p>
                  <button
                    type="button"
                    onClick={handleSetupOrganization}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-white text-sm transition-colors"
                    style={{ backgroundColor: '#137fec' }}
                  >
                    <span className="material-symbols-outlined text-lg">corporate_fare</span>
                    Setup an Organization
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-10 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              © 2024 YouthSports Professional Sports Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
