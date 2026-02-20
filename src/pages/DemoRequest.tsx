import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n/useI18n'
import { AUTH_PAGE_HERO_IMAGES } from '../utils/authImages'
import { createDemoOrg } from '../data/services/demoOrgService'
import { addPOC } from '../data/services/demoOrgService'
import { sendDemoRequestWebhook, buildReviewUrl } from '../services/demoRequestWebhookService'
import { LocationAutocomplete } from '../components/common/LocationAutocomplete'
import type { StructuredAddress } from '../types/location'
import type { CreateDemoOrgInput, CreateDemoPOCInput, DemoOrganizationStatus } from '../types/demoManagement'
import { SPORT_CODES, SPORT_NAMES, type SportCode } from '../types/sports'

const STORAGE_KEY = 'ys_demo_request_pending'
const PENDING_STATUS_CHECK_INTERVAL = 60000 // 1 minute

// Common IANA timezones
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
]

const ORG_TYPE_OPTIONS = [
  { value: '', label: 'Select organization type...' },
  { value: 'School System', label: 'School System' },
  { value: 'Youth League', label: 'Youth League' },
  { value: 'Club', label: 'Club' },
  { value: 'Recreation Department', label: 'Recreation Department' },
  { value: 'Other', label: 'Other' },
]

interface PendingRequest {
  demoOrgId: string
  email: string
  submittedAt: string
}

export default function DemoRequest() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const [logoVersion, setLogoVersion] = useState(0)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [orgName, setOrgName] = useState('')
  const [location, setLocation] = useState<StructuredAddress | null>(null)
  const [timezone, setTimezone] = useState('America/New_York')
  const [orgType, setOrgType] = useState('')
  const [sportsSponsored, setSportsSponsored] = useState<SportCode[]>([])
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null)

  const heroImage = AUTH_PAGE_HERO_IMAGES.login

  // Check for pending request on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: PendingRequest = JSON.parse(stored)
        setPendingRequest(parsed)
        // Check if status has changed
        checkPendingStatus(parsed.demoOrgId)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Check pending status periodically
  useEffect(() => {
    if (!pendingRequest) return

    const interval = setInterval(() => {
      checkPendingStatus(pendingRequest.demoOrgId)
    }, PENDING_STATUS_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [pendingRequest])

  async function checkPendingStatus(demoOrgId: string): Promise<void> {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('demo_organizations')
        .select('status')
        .eq('id', demoOrgId)
        .maybeSingle()

      if (fetchError || !data) {
        // Org not found or error - clear pending
        localStorage.removeItem(STORAGE_KEY)
        setPendingRequest(null)
        return
      }

      if (data.status !== 'pending') {
        // Status changed - clear pending
        localStorage.removeItem(STORAGE_KEY)
        setPendingRequest(null)
      }
    } catch {
      // Ignore errors
    }
  }

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/portal/dashboard')
    }
  }, [user, navigate])

  // Update logo version when theme changes
  useEffect(() => {
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  const handleSportToggle = (sportCode: SportCode): void => {
    if (sportsSponsored.includes(sportCode)) {
      setSportsSponsored(sportsSponsored.filter(code => code !== sportCode))
    } else {
      setSportsSponsored([...sportsSponsored, sportCode])
    }
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    // Validation
    if (!firstName.trim()) {
      setError(t('contact.demoRequest.form.errors.firstNameRequired'))
      return
    }

    if (!lastName.trim()) {
      setError(t('contact.demoRequest.form.errors.lastNameRequired'))
      return
    }

    if (!email.trim()) {
      setError(t('contact.demoRequest.form.errors.emailRequired'))
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError(t('contact.demoRequest.form.errors.emailInvalid'))
      return
    }

    if (!orgName.trim()) {
      setError(t('contact.demoRequest.form.errors.orgNameRequired'))
      return
    }

    if (!timezone.trim()) {
      setError(t('contact.demoRequest.form.errors.timezoneRequired'))
      return
    }

    if (sportsSponsored.length === 0) {
      setError(t('contact.demoRequest.form.errors.sportsRequired'))
      return
    }

    setLoading(true)

    try {
      // Create demo organization with status='pending' and created_by=null
      const orgInput: CreateDemoOrgInput = {
        name: orgName.trim(),
        city: location?.city ?? null,
        state: location?.state ?? null,
        country: location?.country ?? 'US',
        timezone: timezone.trim(),
        org_type: orgType.trim() || null,
        sports_sponsored: sportsSponsored,
        notes: notes.trim() || null,
        status: 'pending' as DemoOrganizationStatus,
      }

      const demoOrg = await createDemoOrg(orgInput)

      // Create primary POC
      const pocInput: CreateDemoPOCInput = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        is_primary: true,
      }

      await addPOC(demoOrg.id, pocInput)

      // Send webhook
      const reviewUrl = buildReviewUrl(demoOrg.id)
      const webhookPayload = {
        type: 'demo_request' as const,
        demo_org_id: demoOrg.id,
        name: demoOrg.name,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        city: demoOrg.city,
        state: demoOrg.state,
        country: demoOrg.country,
        timezone: demoOrg.timezone,
        org_type: demoOrg.org_type,
        sports_sponsored: demoOrg.sports_sponsored,
        notes: demoOrg.notes,
        requested_at: demoOrg.created_at,
        review_url: reviewUrl,
        submitted_at: new Date().toISOString(),
      }

      const webhookResult = await sendDemoRequestWebhook(webhookPayload)
      if (!webhookResult.success) {
        console.warn('Failed to send demo request webhook:', webhookResult.error)
        // Don't fail the request if webhook fails
      }

      // Save pending request to localStorage
      const pending: PendingRequest = {
        demoOrgId: demoOrg.id,
        email: email.trim().toLowerCase(),
        submittedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
      setPendingRequest(pending)

      // Hide form and show success
      setSubmitted(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('contact.demoRequest.form.errors.submitFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Show pending message if request is pending
  if (pendingRequest) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-white antialiased relative flex">
        <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-y-auto items-center justify-center">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-8">
              <span className="material-symbols-outlined text-6xl text-blue-600 dark:text-blue-400 mb-4">
                hourglass_empty
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-4 font-impact">
              {t('contact.demoRequest.pending.title')}
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400 mb-6">
              {t('contact.demoRequest.pending.message')}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t('contact.demoRequest.pending.email', { email: pendingRequest.email })}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show success message after submission
  if (submitted) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-white antialiased relative flex">
        <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-y-auto items-center justify-center">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-8">
              <span className="material-symbols-outlined text-6xl text-green-600 dark:text-green-400 mb-4">
                check_circle
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-4 font-impact">
              {t('contact.demoRequest.success.title')}
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400 mb-6">
              {t('contact.demoRequest.success.message')}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t('contact.demoRequest.success.email', { email })}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-white antialiased relative flex">
      {/* Background Field Markings */}
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
            {t('contact.demoRequest.hero.title')}
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed">
            {t('contact.demoRequest.hero.subtitle')}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-12 xl:px-16 bg-white dark:bg-slate-900/50 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl flex flex-col pb-8">
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
              {t('contact.demoRequest.form.title')}
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
              {t('contact.demoRequest.form.subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white font-impact">
                {t('contact.demoRequest.form.sections.contact')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label 
                    htmlFor="firstName" 
                    className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                  >
                    {t('contact.demoRequest.form.fields.firstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                  />
                </div>

                <div>
                  <label 
                    htmlFor="lastName" 
                    className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                  >
                    {t('contact.demoRequest.form.fields.lastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.email')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>

              <div>
                <label 
                  htmlFor="phone" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.phone')}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white font-impact">
                {t('contact.demoRequest.form.sections.organization')}
              </h3>

              <div>
                <label 
                  htmlFor="orgName" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.orgName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                />
              </div>

              <div>
                <label 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.location')}
                </label>
                <LocationAutocomplete
                  value={location?.formatted_address ?? ''}
                  onChange={(address) => setLocation(address)}
                  placeholder={t('contact.demoRequest.form.fields.locationPlaceholder')}
                />
              </div>

              <div>
                <label 
                  htmlFor="timezone" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.timezone')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                >
                  {TIMEZONE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label 
                  htmlFor="orgType" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.orgType')}
                </label>
                <select
                  id="orgType"
                  name="orgType"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                >
                  {ORG_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact">
                  {t('contact.demoRequest.form.fields.sports')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 dark:border-slate-700 rounded p-3">
                  {SPORT_CODES.map(sportCode => (
                    <label key={sportCode} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={sportsSponsored.includes(sportCode)}
                        onChange={() => handleSportToggle(sportCode)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-900 dark:text-white">{SPORT_NAMES[sportCode]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label 
                  htmlFor="notes" 
                  className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
                >
                  {t('contact.demoRequest.form.fields.notes')}
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-8 py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] mt-6 rounded"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  {t('contact.demoRequest.form.submitting')}
                </>
              ) : (
                t('contact.demoRequest.form.submit')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
