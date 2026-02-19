import { useState, useCallback, useEffect } from 'react'
import { Control, FieldErrors, Controller } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { AUTH_PAGE_HERO_IMAGES } from '../../../utils/authImages'

interface OrganizationFormData {
  name: string
  org_type: 'school' | 'club' | 'league' | 'academy' | 'aau' | ''
  slug: string
  contact_email: string
  office_location?: string
}

interface OrganizationIdentityStepProps {
  control: Control<OrganizationFormData>
  errors: FieldErrors<OrganizationFormData>
  watchedSlug: string
  onSubmit: () => void
  loading: boolean
  error: string | null
  onCancel: () => void
}

const SLUG_CHECK_DEBOUNCE_MS = 500

export default function OrganizationIdentityStep({
  control,
  errors,
  watchedSlug,
  onSubmit,
  loading,
  error,
  onCancel,
}: OrganizationIdentityStepProps) {
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugError, setSlugError] = useState<string | null>(null)
  const heroImage = AUTH_PAGE_HERO_IMAGES.organizationOnboarding

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus('idle'); setSlugError(null); return }
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(slug) || slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
      setSlugStatus('invalid'); setSlugError('Invalid slug format (lowercase, numbers, and hyphens only)'); return
    }

    setSlugStatus('checking'); setSlugError(null)
    try {
      const { data, error: queryError } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
      if (queryError) { setSlugStatus('idle'); return }
      if (data) { setSlugStatus('taken'); setSlugError('This URL slug is already taken') }
      else { setSlugStatus('available'); setSlugError(null) }
    } catch { setSlugStatus('idle') }
  }, [])

  useEffect(() => {
    if (!watchedSlug) { setSlugStatus('idle'); setSlugError(null); return }
    const timeoutId = setTimeout(() => checkSlugAvailability(watchedSlug), SLUG_CHECK_DEBOUNCE_MS)
    return () => clearTimeout(timeoutId)
  }, [watchedSlug, checkSlugAvailability])

  const isSubmitDisabled = loading || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'

  return (
    <div className="h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-white antialiased relative flex">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      <div className="hidden lg:block relative w-0 flex-1">
        {heroImage && (
          <img
            alt="Youth sports organization"
            className="absolute inset-0 h-full w-full object-cover"
            src={heroImage}
          />
        )}
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <h2 className="text-5xl font-black tracking-tighter leading-none text-white mb-4 font-impact">
            SETUP YOUR ORGANIZATION
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed">
            Define your identity. Set the standard. Create your organization profile to start managing your teams.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-2 font-impact">
              ORGANIZATION SETUP
            </h2>
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
              Define your identity. Set the standard.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                ORGANIZATION NAME
              </label>
              <div className="mt-2">
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <>
                      <input
                        {...field}
                        id="name"
                        type="text"
                        placeholder="e.g. North Shore Academy"
                        className="block w-full rounded border-0 py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                      />
                      {errors.name && (
                        <p className="text-xs mt-1 text-red-500 dark:text-red-400">{errors.name.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="org_type"
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                ORGANIZATION TYPE
              </label>
              <div className="mt-2">
                <Controller
                  name="org_type"
                  control={control}
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <>
                      <select
                        {...field}
                        id="org_type"
                        value={field.value || ''}
                        className="block w-full rounded border-0 py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                      >
                        <option value="">Select type...</option>
                        <option value="club">Club</option>
                        <option value="school">School</option>
                        <option value="academy">Academy</option>
                        <option value="league">League</option>
                        <option value="aau">AAU</option>
                      </select>
                      {errors.org_type && (
                        <p className="text-xs mt-1 text-red-500 dark:text-red-400">{errors.org_type.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                URL SLUG
              </label>
              <div className="mt-2">
                <Controller
                  name="slug"
                  control={control}
                  rules={{ required: 'Slug is required' }}
                  render={({ field }) => (
                    <>
                      <div className="flex items-stretch rounded shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--org-btn-primary-bg, #137fec)]">
                        <span className="flex items-center px-3 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 rounded-l">
                          youthsports.team/teams/
                        </span>
                        <input
                          {...field}
                          id="slug"
                          type="text"
                          placeholder="your-name"
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                            field.onChange(val)
                          }}
                          className="flex-1 block w-full rounded-r border-0 py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 sm:text-sm text-base min-h-[44px]"
                        />
                      </div>
                      {slugError && (
                        <p className="text-xs mt-1 text-red-500 dark:text-red-400">{slugError}</p>
                      )}
                      {errors.slug && !slugError && (
                        <p className="text-xs mt-1 text-red-500 dark:text-red-400">{errors.slug.message}</p>
                      )}
                      {slugStatus === 'checking' && (
                        <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Checking availability...</p>
                      )}
                      {slugStatus === 'available' && (
                        <p className="text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-bold">Available</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact_email"
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                PRIMARY CONTACT EMAIL
              </label>
              <div className="mt-2">
                <Controller
                  name="contact_email"
                  control={control}
                  rules={{ required: 'Email is required' }}
                  render={({ field }) => (
                    <>
                      <input
                        {...field}
                        id="contact_email"
                        type="email"
                        placeholder="admin@organization.com"
                        className="block w-full rounded border-0 py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                      />
                      {errors.contact_email && (
                        <p className="text-xs mt-1 text-red-500 dark:text-red-400">{errors.contact_email.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="office_location"
                className="block text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 font-impact"
              >
                OFFICE LOCATION <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(Optional)</span>
              </label>
              <div className="mt-2">
                <Controller
                  name="office_location"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      id="office_location"
                      type="text"
                      placeholder="City, State"
                      className="block w-full rounded border-0 py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--org-btn-primary-bg, #137fec)] sm:text-sm text-base min-h-[44px]"
                    />
                  )}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading ? 'CREATING ORGANIZATION...' : 'CONTINUE TO LICENSE'}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Step 1 of 2 - Identity and Compliance
            </p>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Need help?{' '}
              <button
                type="button"
                onClick={onCancel}
                className="font-bold text-[var(--org-link-color)] hover:text-[var(--org-link-color)]/80 transition-colors"
              >
                Cancel setup
              </button>
            </p>
          </div>

          <div className="mt-8 pt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              (c) {new Date().getFullYear()} YOUTHSPORTS PROFESSIONAL SPORTS MANAGEMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
