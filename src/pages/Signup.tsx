import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import {
  getSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'
import { AUTH_HERO_IMAGES } from '../utils/authImages'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [heroImage, setHeroImage] = useState<string>('')

  const { signUp } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [logoVersion, setLogoVersion] = useState(0)

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

  // Update logo version when theme changes to force reload
  useEffect(() => {
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  // Select random hero image on mount
  useEffect(() => {
    if (AUTH_HERO_IMAGES.length > 0) {
      const randomImage = AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
      setHeroImage(randomImage)
    }
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

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' }
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (pwd.length < 8) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
    if (pwd.length < 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { label: 'Good', color: 'bg-[#137fec]', width: '75%' }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
    }
    return { label: 'Good', color: 'bg-[#137fec]', width: '75%' }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-white antialiased relative flex">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Left side - Hero Image (hidden on mobile) */}
      <div className="hidden lg:block relative w-0 flex-1">
        {heroImage && (
          <img
            alt="Youth sports"
            className="absolute inset-0 h-full w-full object-cover"
            src={heroImage}
          />
        )}
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <h2 className="text-5xl font-black tracking-tighter leading-none text-white mb-4 font-impact">
            {isOrgSetupFlow ? 'SETUP YOUR ORGANIZATION' : 'JOIN THE COMMUNITY'}
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed">
            {isOrgSetupFlow
              ? 'Create your account to get started with organization setup and team management.'
              : 'Create your account and start connecting with teams, coaches, and fellow parents.'}
          </p>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col">
          {/* Logo */}
          <div className="mb-8 pt-4">
            <img 
              key={resolvedTheme}
              src={`${resolvedTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png'}?theme=${resolvedTheme}&v=${logoVersion}`}
              alt="YouthSports" 
              className="h-24 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-2 font-impact">
              {isOrgSetupFlow ? 'CREATE YOUR ADMIN ACCOUNT' : 'CREATE YOUR ACCOUNT'}
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
              {isOrgSetupFlow
                ? 'First, create an account. Then you can setup your organization.'
                : 'Join YouthSports to manage your youth sports experience.'}
            </p>
          </div>

          {/* Organization Setup Banner (visible when in setup flow) */}
          {isOrgSetupFlow && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm bg-[#137fec]/10 border border-[#137fec]/20">
              <span className="material-symbols-outlined text-[#137fec]">corporate_fare</span>
              <span className="text-slate-700 dark:text-slate-200">
                You&apos;ll be redirected to organization setup after creating your account.
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name (optional) */}
            <div>
              <label 
                htmlFor="displayName" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                DISPLAY NAME <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
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
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#137fec] sm:text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                EMAIL ADDRESS
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
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#137fec] sm:text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                PASSWORD
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
                  className="block w-full rounded border-0 py-3 px-4 pr-12 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#137fec] sm:text-sm"
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
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
                  <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                    {passwordStrength.label} - Use 8+ characters with uppercase, numbers, and symbols
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                CONFIRM PASSWORD
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
                  className="block w-full rounded border-0 py-3 px-4 pr-12 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#137fec] sm:text-sm"
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
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
              <a href="#" className="font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors">Privacy Policy</a>
            </p>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading || (password !== confirmPassword && confirmPassword.length > 0)}
                className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CONTINUE'}
              </button>
            </div>
          </form>

          {/* Sign in link */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/portal/login" className="font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              © {new Date().getFullYear()} YOUTHSPORTS PROFESSIONAL SPORTS MANAGEMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
