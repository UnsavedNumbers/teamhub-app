import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  getSetupOrganizationFlag,
  setSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Check for setupOrganization flag from both location state and localStorage
  const locationState = location.state as {
    returnTo?: string
    setupOrganization?: boolean
  } | null

  // Determine if this is an organization setup flow
  const isOrgSetupFlow =
    locationState?.setupOrganization === true ||
    locationState?.returnTo === '/admin/onboarding' ||
    getSetupOrganizationFlag()

  // Determine where to redirect after signup
  const returnTo = isOrgSetupFlow
    ? '/admin/onboarding'
    : (locationState?.returnTo || '/portal/dashboard')

  // Clean up stale localStorage flags on mount
  useEffect(() => {
    cleanupStaleFlags()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, displayName || undefined, isOrgSetupFlow)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Navigate to email confirmation page with returnTo info
      navigate('/portal/confirm-email', {
        state: {
          email,
          returnTo,
          setupOrganization: isOrgSetupFlow,
        },
      })
    }
  }

  async function handleGoogleSignup() {
    setError(null)
    setGoogleLoading(true)

    // Store the setupOrganization flag in localStorage BEFORE OAuth redirect
    // This is critical because OAuth redirects lose navigation state
    if (isOrgSetupFlow) {
      setSetupOrganizationFlag()
    }

    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // If successful, the page will redirect to Google OAuth
    // The flag is persisted in localStorage and will be checked in AuthCallback
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' }
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (pwd.length < 8) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
    if (pwd.length < 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { label: 'Good', color: 'bg-blue-500', width: '75%' }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { label: 'Strong', color: 'bg-green-500', width: '100%' }
    }
    return { label: 'Good', color: 'bg-blue-500', width: '75%' }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="flex min-h-screen font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Left side - Hero Image (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Youth sports team celebrating together"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EioYyXup8hWypN337Pbn_TYldQzX6pJ4B-XzTwJNpPYzGkJM01_RX7voFn-WqPfzeKYEV3uehlCj6Ydm2kjcJgKhzjTJFk4ivzAGO71ShxUz2s0urAT6vdIuo1L6WOCPkjK_G3zgt7Ydml45W9KGChFKid43FWMrIDJEQ3Mo6QfpKjlwuFkFyCV5TwbqkBBH-M_0Uqg9OViXz-ry9d9HkTPPNWa7E6D153LVwiEQyYTbFEZdVULTK-loC4YTy2yXfn98L3Y0F-Q"
        />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <h2 className="font-display text-5xl text-white tracking-wider mb-4">
            {isOrgSetupFlow ? 'Setup Your Organization' : 'Join the Community'}
          </h2>
          <p className="text-xl text-slate-200 max-w-lg leading-relaxed">
            {isOrgSetupFlow
              ? 'Create your account to get started with organization setup and team management.'
              : 'Create your account and start connecting with teams, coaches, and fellow parents.'}
          </p>
        </div>
      </div>

      {/* Right side - Signup Form */}
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
              {isOrgSetupFlow ? 'Create your admin account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {isOrgSetupFlow
                ? 'First, create an account. Then you can setup your organization.'
                : 'Join YouthSports to manage your youth sports experience.'}
            </p>
          </div>

          {/* Organization Setup Banner (visible when in setup flow) */}
          {isOrgSetupFlow && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-3 text-sm"
              style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)' }}
            >
              <span className="material-symbols-outlined text-primary">corporate_fare</span>
              <span className="text-slate-700 dark:text-slate-200">
                You&apos;ll be redirected to organization setup after creating your account.
              </span>
            </div>
          )}

          {/* Form */}
          <div className="mt-8">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Display Name (optional) */}
              <div>
                <label 
                  htmlFor="displayName" 
                  className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                >
                  Display Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="mt-2">
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Smith"
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
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
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1 text-slate-500">
                      {passwordStrength.label} - Use 8+ characters with uppercase, numbers, and symbols
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input pr-10"
                  />
                  <button 
                    type="button" 
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-lg">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs mt-1 text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                By creating an account, you agree to our{' '}
                <a href="#" className="font-semibold text-primary hover:text-blue-500">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="font-semibold text-primary hover:text-blue-500">Privacy Policy</a>
              </p>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={loading || (password !== confirmPassword && confirmPassword.length > 0)}
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
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
                  or sign up with
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
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

            {/* Sign in link */}
            <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/portal/login" className="font-semibold leading-6 text-primary hover:text-blue-500">
                  Sign in
                </Link>
              </p>
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
