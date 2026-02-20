import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/useI18n'
import { useTheme } from '@/hooks/useTheme'
import { getLink, RouteKeys } from '@/utils/routes'
import { normalizeDemoCode, type DemoAllowedRole } from '@/types/demoManagement'
import { validateDemoCode } from '@/data/services/demoCodeService'
import { getDemoOrg } from '@/data/services/demoOrgService'
import { AUTH_PAGE_HERO_IMAGES } from '@/utils/authImages'

// Global role enablement - can be controlled via config/feature flags
const GLOBALLY_ENABLED_ROLES: DemoAllowedRole[] = ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan']

const ROLE_LABELS: Record<DemoAllowedRole, string> = {
  org_admin: 'Org Admin',
  coach: 'Coach',
  parent: 'Guardian',
  athlete: 'Athlete',
  staff: 'Volunteer',
  fan: 'Fan',
}

export default function DemoEntry() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const [demoCode, setDemoCode] = useState('')
  const [selectedRole, setSelectedRole] = useState<DemoAllowedRole | ''>('')
  const [availableRoles, setAvailableRoles] = useState<DemoAllowedRole[]>([])
  const [demoOrgName, setDemoOrgName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
  const heroImage = AUTH_PAGE_HERO_IMAGES.login

  // Update logo version when theme changes to force reload
  useEffect(() => {
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  // Validate code and load available roles
  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!demoCode.trim()) {
      setError('Demo code is required.')
      return
    }

    setError(null)
    setValidatingCode(true)

    try {
      const normalizedCode = normalizeDemoCode(demoCode)
      console.log('[DemoEntry] Validating code:', normalizedCode)
      console.log('[DemoEntry] Environment check:', {
        USE_FAKE_DATA: import.meta.env.VITE_USE_FAKE_DATA,
        SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'set' : 'missing',
        SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing',
      })
      const validation = await validateDemoCode(normalizedCode)
      console.log('[DemoEntry] Validation result:', validation)

      if (!validation.valid) {
        let errorMsg = 'This demo code is invalid or not found.'
        if (validation.reason === 'expired') {
          errorMsg = 'This demo code has expired.'
        } else if (validation.reason === 'revoked') {
          errorMsg = 'This demo code is no longer active.'
        } else if (validation.reason === 'inactive_org') {
          errorMsg = 'This demo is not currently available.'
        }
        console.log('[DemoEntry] Validation failed:', validation.reason)
        setError(errorMsg)
        setAvailableRoles([])
        return
      }

      // Get demo org to check allowed_roles and display name
      const demoOrg = await getDemoOrg(validation.demoOrgId!)
      const orgAllowedRoles = demoOrg.allowed_roles ?? GLOBALLY_ENABLED_ROLES

      // Intersection of globally enabled and org's allowed roles
      const roles = GLOBALLY_ENABLED_ROLES.filter((role) => orgAllowedRoles.includes(role))
      setDemoOrgName(demoOrg.name || '')
      setAvailableRoles(roles)

      if (roles.length === 0) {
        setError('No roles are available for this demo.')
      }
    } catch (err) {
      console.error('[DemoEntry] Error validating code:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate demo code.'
      console.error('[DemoEntry] Error details:', {
        message: errorMessage,
        error: err,
        code: demoCode,
      })
      setError(errorMessage)
      setAvailableRoles([])
    } finally {
      setValidatingCode(false)
    }
  }

  // Submit code + role to enter demo
  const handleEnterDemo = async (e: FormEvent) => {
    e.preventDefault()
    if (!demoCode.trim() || !selectedRole) {
      setError('Please enter a demo code and select a role.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const normalizedCode = normalizeDemoCode(demoCode)

      // Validate code again
      const validation = await validateDemoCode(normalizedCode)
      if (!validation.valid) {
        setError('Demo code is invalid or expired. Please check and try again.')
        setLoading(false)
        return
      }

      // Get demo org to verify role is allowed
      const demoOrg = await getDemoOrg(validation.demoOrgId!)
      const orgAllowedRoles = demoOrg.allowed_roles ?? GLOBALLY_ENABLED_ROLES

      if (!orgAllowedRoles.includes(selectedRole)) {
        setError(`The role "${ROLE_LABELS[selectedRole]}" is not available for this demo.`)
        setLoading(false)
        return
      }

      // Call Edge Function to create demo session and sign in as shared demo user
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        setError('Configuration error: Supabase URL or key not found.')
        setLoading(false)
        return
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/demo-enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          code: normalizedCode,
          role: selectedRole,
        }),
      })

      const result: { success: boolean; redirect_url?: string; error?: string; message?: string } = await response.json()

      if (!result.success || !result.redirect_url) {
        setError(result.error || 'Failed to enter demo. Please try again.')
        setLoading(false)
        return
      }

      // Set a flag in sessionStorage to indicate this is a demo callback
      // This helps HostHomeRoute detect demo callbacks even if redirect URL doesn't preserve query params
      sessionStorage.setItem('demo_entry_initiated', 'true')

      // Redirect to the magic link which will sign the user in
      window.location.href = result.redirect_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter demo.')
      setLoading(false)
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

      {/* Left side - Hero Section (hidden on mobile) */}
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
            TRY THE DEMO
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed mb-6">
            Experience our platform with a realistic demo. Enter your demo code and select a role to explore the features.
          </p>
        </div>
      </div>

      {/* Right side - Demo Entry Form */}
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
              ENTER DEMO
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
              Enter your demo code and select a role to access the demo.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Demo Entry Form */}
          <form onSubmit={availableRoles.length > 0 ? handleEnterDemo : handleCodeSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="demo-code" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                DEMO CODE
              </label>
              <div className="mt-2">
                <input
                  id="demo-code"
                  name="demo-code"
                  type="text"
                  autoComplete="off"
                  tabIndex={0}
                  value={demoCode}
                  onChange={(e) => {
                    setDemoCode(e.target.value.toUpperCase())
                    setError(null)
                    if (availableRoles.length > 0) {
                      setAvailableRoles([])
                      setSelectedRole('')
                      setDemoOrgName('')
                    }
                  }}
                  placeholder="Enter your demo code"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px] uppercase"
                  disabled={loading || validatingCode}
                  autoFocus
                />
              </div>
            </div>

            {availableRoles.length > 0 && (
              <>
                <div className="mb-4">
                  <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('demoEntry.welcome', { orgName: demoOrgName })}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('demoEntry.whoToUseSiteAs')}
                  </p>
                </div>
                <div>
                <label 
                  htmlFor="demo-role" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  SIGN IN AS
                </label>
                <div className="mt-2">
                  <select
                    id="demo-role"
                    name="demo-role"
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as DemoAllowedRole)
                      setError(null)
                    }}
                    className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                    disabled={loading}
                    required
                    tabIndex={1}
                  >
                    <option value="">Select a role...</option>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || validatingCode || !demoCode.trim() || (availableRoles.length > 0 && !selectedRole)}
                tabIndex={2}
                className="bg-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {validatingCode
                  ? 'VALIDATING...'
                  : loading
                    ? 'ENTERING DEMO...'
                    : availableRoles.length > 0
                      ? 'ENTER DEMO'
                      : 'CONTINUE'}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                HAVE AN ACCOUNT?
              </p>
              <Link 
                to={getLink(RouteKeys.AUTH_LOGIN)}
                tabIndex={3}
                className="block text-center font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors"
              >
                LOG IN
              </Link>
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
