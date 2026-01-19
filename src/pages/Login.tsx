import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

import { getHostAppContext } from '../utils/host'
import {
  setSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'
import { getLoginRedirect } from '../utils/loginRedirect'
import { AUTH_HERO_IMAGES } from '../utils/authImages'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [heroImage, setHeroImage] = useState<string>('')

  const { signInWithEmail, user } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()

  // Clean up stale localStorage flags on mount
  useEffect(() => {
    cleanupStaleFlags()
  }, [])

  // Select random hero image on mount
  useEffect(() => {
    if (AUTH_HERO_IMAGES.length > 0) {
      const randomImage = AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
      setHeroImage(randomImage)
    }
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
      // Wait for profile to load to get organizations
      // We need to check roles to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user is platform admin
        const { data: adminData } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .single()
        
        if (adminData) {
          navigate('/platform-admin')
          return
        }

        // Fetch user's organizations to determine redirect
        try {
          const { data: orgData } = await supabase.rpc('get_user_organizations', {
            check_user_id: user.id
          })

          // Map to Organization format
          const organizations = (orgData || []).map((org: any) => ({
            id: org.organization_id,
            name: org.org_name,
            roles: org.roles || [],
          }))

          // Determine redirect based on roles
          const redirectTo = getLoginRedirect(false, organizations)
          navigate(redirectTo)
        } catch (err) {
          // Fallback to default redirect if org fetch fails
          console.error('Error fetching organizations:', err)
          const appContext = getHostAppContext()
          navigate(appContext === 'platform-admin' ? '/platform-admin' : '/portal/dashboard')
        }
      } else {
        // No user, should not happen but fallback
        navigate('/portal/dashboard')
      }
    }
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

      {/* Left side - Organization Setup Section (hidden on mobile) */}
      <div className="hidden lg:block relative w-0 flex-1">
        {heroImage && (
          <img
            alt="Youth sports"
            className="absolute inset-0 h-full w-full object-cover"
            src={heroImage}
          />
        )}
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-16 relative z-10">
          <div className="w-full max-w-md">
          {/* Title & Description */}
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6 font-impact">
            CREATE YOUR ORGANIZATION
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 mb-8">
            Start managing your youth sports organization with professional tools for registration, scheduling, payments, and communication.
          </p>

          {/* Features List */}
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-white">check_circle</span>
              <span className="text-sm text-white/80">Unlimited teams and players</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-white">check_circle</span>
              <span className="text-sm text-white/80">Integrated payments and invoicing</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-white">check_circle</span>
              <span className="text-sm text-white/80">Event scheduling and attendance</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-white">check_circle</span>
              <span className="text-sm text-white/80">Parent and coach portals</span>
            </li>
          </ul>

          {/* CTA Button */}
          <button
            type="button"
            onClick={handleSetupOrganization}
            className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full flex items-center justify-center gap-2 transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
            GET STARTED FREE
          </button>

          <p className="text-xs text-white/60 text-center mb-6">
            No credit card required. Setup in under 5 minutes.
          </p>

          {/* Bottom tagline */}
          <p className="text-sm text-white/60 text-center">
            Trusted by youth sports organizations nationwide
          </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-hidden">
        <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col min-h-0">
          {/* Logo */}
          <div className="mb-8 pt-4">
            <img 
              src={resolvedTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png'}
              alt="YouthSports" 
              className="h-24 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-2 font-impact">
              WELCOME BACK
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
              Enter your credentials to access your portal.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-6">
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white font-impact"
                >
                  PASSWORD
                </label>
                <Link 
                  to="/portal/forgot-password" 
                  className="text-xs font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors"
                >
                  FORGOT PASSWORD?
                </Link>
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
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#137fec] focus:ring-[#137fec]"
              />
              <label 
                htmlFor="remember-me" 
                className="ml-3 block text-sm text-slate-700 dark:text-slate-300"
              >
                REMEMBER ME FOR 30 DAYS
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SIGNING IN...' : 'CONTINUE'}
              </button>
            </div>
          </form>

          {/* Sign up link */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              NEW TO YOUTHSPORTS?{' '}
              <Link 
                to="/portal/signup" 
                className="font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors"
              >
                CREATE AN ACCOUNT
              </Link>
            </p>
          </div>

          {/* Mobile-only: Organization Setup CTA */}
          <div className="lg:hidden mt-6">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-6">
              <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
                REPRESENTING AN ORGANIZATION?
              </p>
              <button
                type="button"
                onClick={handleSetupOrganization}
                className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">corporate_fare</span>
                SETUP AN ORGANIZATION
              </button>
            </div>
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
