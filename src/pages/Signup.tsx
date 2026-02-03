import { useState, FormEvent, useEffect, startTransition } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n/useI18n'
import {
  getSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'
import { AUTH_HERO_IMAGES } from '../utils/authImages'
import { mapAuthError } from '../utils/authErrorMapper'
import { supabase } from '../lib/supabase'
import { LocationAutocomplete } from '../components/common/LocationAutocomplete'
import type { StructuredAddress, HomeLocation } from '../types/location'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [homeAddressInput, setHomeAddressInput] = useState('')
  const [homeAddressDisplay, setHomeAddressDisplay] = useState('')
  const [selectedHomeLocation, setSelectedHomeLocation] = useState<HomeLocation | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [heroImage, setHeroImage] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [isFromInvite, setIsFromInvite] = useState(false)
  const [signupMode, setSignupMode] = useState<'fan' | 'parent'>(() =>
    locationState?.signupAs === 'fan' ? 'fan' : 'parent'
  )

  const { signUp } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const [logoVersion, setLogoVersion] = useState(0)

  // Check for setupOrganization flag from both location state and localStorage
  const locationState = location.state as {
    returnTo?: string
    setupOrganization?: boolean
    inviteEmail?: string
    athleteId?: string
    signupAs?: 'fan' | 'parent'
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

  // Handle invite details from location state or sessionStorage
  useEffect(() => {
    const fetchInviteDetails = async () => {
      // First, check location state (from navigation)
      if (locationState?.inviteEmail) {
        setEmail(locationState.inviteEmail)
        setInviteEmail(locationState.inviteEmail)
        setIsFromInvite(true)
        
        // Store athlete_id in sessionStorage if provided
        if (locationState.athleteId) {
          sessionStorage.setItem('pending_invite_athlete_id', locationState.athleteId)
        }
        return
      }
      
      // Fallback: Check if there's a pending invite token in sessionStorage
      // This handles cases where location.state is lost (page refresh, etc.)
      const pendingToken = sessionStorage.getItem('pending_invite_token') || localStorage.getItem('pending_invite_token')
      if (pendingToken) {
        // Mark as from invite immediately (even before fetching details)
        // This ensures the field is readonly while we fetch
        setIsFromInvite(true)
        
        try {
          console.log('[Signup] Fetching invite details for token:', pendingToken)
          const { data, error: rpcError } = await supabase
            .rpc('get_parent_invite_details', { p_token: pendingToken })

          console.log('[Signup] RPC response - data:', data, 'error:', rpcError)

          if (!rpcError && data && Array.isArray(data) && data.length > 0) {
            const inviteDetails = data[0] as { 
              valid: boolean
              email: string | null
              athlete_id: string | null
              org_id: string | null
              expired: boolean
              already_accepted: boolean
              message: string
            }

            console.log('[Signup] Invite details:', inviteDetails)

            if (inviteDetails.valid && inviteDetails.email && inviteDetails.athlete_id) {
              // Pre-fill email from invite
              setEmail(inviteDetails.email)
              setInviteEmail(inviteDetails.email)
              
              // Store athlete_id in sessionStorage
              sessionStorage.setItem('pending_invite_athlete_id', inviteDetails.athlete_id)
            } else {
              // Invalid invite - allow editing email
              console.warn('[Signup] Invalid invite details:', inviteDetails.message)
              setIsFromInvite(false)
              setInviteEmail(null)
            }
          } else {
            // Error fetching or invalid response - still mark as from invite
            // but don't pre-fill email (user can still see it's readonly)
            console.warn('[Signup] Could not fetch invite details - rpcError:', rpcError, 'data:', data)
          }
        } catch (err) {
          console.error('[Signup] Error fetching invite details:', err)
          // Keep isFromInvite true if token exists, but don't pre-fill email
        }
      }
    }

    fetchInviteDetails()
  }, [locationState])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation - Bug 3 prevention: trim and check length
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedPhone = phone.trim()

    if (trimmedFirstName.length === 0) {
      setError('First name is required')
      return
    }

    if (trimmedLastName.length === 0) {
      setError('Last name is required')
      return
    }

    if (trimmedPhone.length === 0) {
      setError('Phone number is required')
      return
    }

    // Phone validation - Bug 6 prevention
    // Note: Basic phone validation (non-empty check above is sufficient for now)

    // Home address is optional - use zip_code from selected location if available
    const trimmedZipcode = selectedHomeLocation?.zip_code || ''

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(
      email, 
      password, 
      trimmedFirstName, 
      trimmedLastName, 
      trimmedPhone, 
      trimmedZipcode,
      isOrgSetupFlow
    )
    
    if (error) {
      setError(mapAuthError(error, t))
      setLoading(false)
    } else {
      // Get athlete_id from sessionStorage if available (from invite flow)
      const athleteId = sessionStorage.getItem('pending_invite_athlete_id')
      
      // Navigate to email confirmation page with returnTo info
      navigate('/portal/confirm-email', {
        state: {
          email,
          returnTo,
          setupOrganization: isOrgSetupFlow,
          athleteId: athleteId || undefined,
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
      return { label: 'Good', color: 'bg-[var(--org-btn-primary-bg)]', width: '75%' }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
    }
    return { label: 'Good', color: 'bg-[var(--org-btn-primary-bg)]', width: '75%' }
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

          {/* Fan / Parent segment control (only when not in org setup or invite flow) */}
          {!isOrgSetupFlow && !isFromInvite && (
            <div className="mb-6">
              <p className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-3 font-impact">
                I AM A
              </p>
              <div
                role="group"
                aria-label="Sign up as Fan or Parent"
                className="inline-flex w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-1"
              >
                <button
                  type="button"
                  onClick={() => setSignupMode('fan')}
                  className={`flex-1 py-2.5 px-4 text-sm font-bold uppercase tracking-wide rounded-md transition-colors ${
                    signupMode === 'fan'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Fan
                </button>
                <button
                  type="button"
                  onClick={() => setSignupMode('parent')}
                  className={`flex-1 py-2.5 px-4 text-sm font-bold uppercase tracking-wide rounded-md transition-colors ${
                    signupMode === 'parent'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Parent
                </button>
              </div>
            </div>
          )}

          {/* Organization Setup Banner (visible when in setup flow) */}
          {isOrgSetupFlow && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm bg-[var(--org-btn-primary-bg)]/10 border border-[var(--org-btn-primary-bg, #137fec)]/20">
              <span className="material-symbols-outlined text-[var(--org-link-color)]">corporate_fare</span>
              <span className="text-slate-700 dark:text-slate-200">
                You&apos;ll be redirected to organization setup after creating your account.
              </span>
            </div>
          )}

          {/* Guardian Invite Banner (visible when coming from invite) */}
          {isFromInvite && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">mail</span>
              <span className="text-slate-700 dark:text-slate-200">
                {inviteEmail 
                  ? "You're signing up to accept a guardian invitation. Your email address is locked to this invite."
                  : "You're signing up to accept a guardian invitation. Loading invite details..."}
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
            {/* First Name */}
            <div>
              <label 
                htmlFor="firstName" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                FIRST NAME
              </label>
              <div className="mt-2">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  maxLength={100}
                  tabIndex={1}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label 
                htmlFor="lastName" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                LAST NAME
              </label>
              <div className="mt-2">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  maxLength={100}
                  tabIndex={2}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label 
                htmlFor="phone" 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                PHONE NUMBER
              </label>
              <div className="mt-2">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  tabIndex={3}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>
            </div>

            {/* Home Address */}
            <div>
              <label 
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                HOME ADDRESS <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(Optional)</span>
              </label>
              <div className="mt-2 flex flex-col gap-3">
                <div className="signup-location-autocomplete">
                  <LocationAutocomplete
                    value={homeAddressInput}
                    onInputChange={setHomeAddressInput}
                    onChange={(address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
                      startTransition(() => {
                        const homeLocation: HomeLocation = {
                          place_id: address.place_id,
                          formatted_address: address.formatted_address,
                          zip_code: address.postal_code || '',
                          coordinates: {
                            lat: address.latitude,
                            lng: address.longitude,
                          },
                          city: address.city || undefined,
                          state: address.state || undefined,
                          country: address.country || 'United States',
                        }
                        
                        const shortAddress = placeResult?.name && placeResult.name !== address.formatted_address
                          ? placeResult.name
                          : address.address_line1
                        
                        setSelectedHomeLocation(homeLocation)
                        setHomeAddressDisplay(address.formatted_address)
                        setHomeAddressInput(shortAddress)
                      })
                    }}
                    placeholder="Start typing your address..."
                    countryRestrictions={['us']}
                    types={['geocode', 'establishment']}
                  />
                </div>
                
                <div className="relative">
                  <input
                    value={homeAddressDisplay}
                    readOnly
                    className="block w-full rounded border-0 py-3 px-4 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 sm:text-sm text-base min-h-[44px]"
                    placeholder="No address selected"
                    style={{ paddingRight: homeAddressDisplay ? '2.5rem' : undefined }}
                  />
                  {homeAddressDisplay && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHomeLocation(null)
                        setHomeAddressDisplay('')
                        setHomeAddressInput('')
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Clear address"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </div>
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
                  readOnly={isFromInvite}
                  tabIndex={5}
                  value={email}
                  onChange={(e) => {
                    // Only allow changes if not from invite
                    if (!isFromInvite) {
                      setEmail(e.target.value)
                    }
                  }}
                  placeholder={isFromInvite ? "Loading invite email..." : "name@email.com"}
                  className={`block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm ${
                    isFromInvite ? 'bg-slate-50 dark:bg-slate-800 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              {isFromInvite && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {inviteEmail 
                    ? 'This email is required to accept your guardian invitation.'
                    : 'Loading invite details...'}
                </p>
              )}
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
                  tabIndex={6}
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
                  tabIndex={7}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded border-0 py-3 px-4 pr-12 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm"
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
              <a href="#" tabIndex={9} className="font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" tabIndex={10} className="font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors">Privacy Policy</a>
            </p>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading || (password !== confirmPassword && confirmPassword.length > 0)}
                tabIndex={8}
                className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CONTINUE'}
              </button>
            </div>
          </form>

          {/* Sign in link */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/portal/login" tabIndex={11} className="font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors">
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
