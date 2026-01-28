import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n/useI18n'

import { getHostAppContext } from '../utils/host'
import {
  setSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'
import { getLoginRedirect } from '../utils/loginRedirect'
import { AUTH_HERO_IMAGES } from '../utils/authImages'
import { mapAuthError } from '../utils/authErrorMapper'
import type { OrgMemberRole } from '../contexts/OrganizationContext'

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
  const { t } = useI18n()
  const [logoVersion, setLogoVersion] = useState(0)

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

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signInWithEmail(email, password)
    
    if (error) {
      const errorMessage = mapAuthError(error, t)
      
      // Check if it's an email confirmation issue
      if (error.message?.toLowerCase().includes('email') && 
          (error.message?.toLowerCase().includes('confirm') || error.message?.toLowerCase().includes('verif'))) {
        setError(`${errorMessage} Please check your email inbox for the confirmation link.`)
      } else if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password. If you just signed up, please check your email to confirm your account first.')
      } else {
        setError(errorMessage)
      }
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
          .maybeSingle()
        
        if (adminData) {
          navigate('/platform-admin')
          return
        }

        // Fetch user's organizations to determine redirect
        try {
          const { data: orgData, error: orgError } = await supabase.rpc('get_user_organizations', {
            check_user_id: user.id
          } as any)

          if (orgError) {
            console.error('Error fetching user organizations:', orgError)
            // Fallback to default redirect if org fetch fails
            const appContext = getHostAppContext()
            navigate(appContext === 'platform-admin' ? '/platform-admin' : '/portal/dashboard')
            return
          }

          // Map to Organization format with proper role validation
          const organizations = (orgData || []).map((org: any) => {
            // Normalize and validate roles array (same logic as useAuth.tsx)
            const roles = Array.isArray(org.roles)
              ? org.roles.filter(
                  (r: unknown): r is OrgMemberRole =>
                    r === 'parent' || r === 'coach' || r === 'org_admin'
                )
              : []
            
            return {
              id: org.org_id,
              name: org.org_name || '',
              roles,
              get role() { return this.roles[0] ?? 'parent' }
            }
          })

          // Determine redirect based on roles
          const redirectTo = getLoginRedirect(false, organizations)
          navigate(redirectTo)
        } catch (err) {
          // Fallback to default redirect if org fetch fails
          console.error('Exception fetching organizations:', err)
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
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <h2 className="text-5xl font-black tracking-tighter leading-none text-white mb-4 font-impact">
            CREATE YOUR ORGANIZATION
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed mb-6">
            Start managing your youth sports organization with professional tools for registration, scheduling, payments, and communication.
          </p>
          <button
            type="button"
            onClick={handleSetupOrganization}
            className="bg-white text-slate-900 px-8 py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-slate-100 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-xl">corporate_fare</span>
            GET STARTED
          </button>
        </div>
      </div>

      {/* Right side - Login Form */}
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
                  tabIndex={1}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm"
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
                  tabIndex={4}
                  className="text-xs font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors"
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
                  tabIndex={2}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded border-0 py-3 px-4 pr-12 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm"
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
                tabIndex={3}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[var(--org-link-color)] focus:ring-[var(--org-btn-primary-bg, #137fec)]"
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
                tabIndex={5}
                className="bg-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SIGNING IN...' : 'CONTINUE'}
              </button>
            </div>
          </form>

          {/* Sign up links */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                NEW PARENT TO YOUTHSPORTS?
              </p>
              <Link 
                to="/portal/signup" 
                tabIndex={6}
                className="block text-center font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors"
              >
                CREATE AN ACCOUNT
              </Link>
            </div>
            <div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                SETTING UP YOUR TEAM(S)?
              </p>
              <button
                type="button"
                onClick={handleSetupOrganization}
                tabIndex={7}
                className="w-full text-center font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors"
              >
                CREATE AN ORGANIZATION
              </button>
            </div>
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
                className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full flex items-center justify-center gap-2 hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300"
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
