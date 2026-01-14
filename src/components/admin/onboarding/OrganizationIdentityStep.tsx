import { useState, useCallback, useEffect } from 'react'
import { Control, FieldErrors, Controller } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'

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

// Debounce delay for slug validation (in ms)
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
  // Slug availability state
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugError, setSlugError] = useState<string | null>(null)

  /**
   * Check if slug is available in the database
   */
  const checkSlugAvailability = useCallback(async (slug: string) => {
    // Skip if empty or invalid format
    if (!slug || slug.length < 3) {
      setSlugStatus('idle')
      setSlugError(null)
      return
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(slug)) {
      setSlugStatus('invalid')
      setSlugError('Slug must contain only lowercase letters, numbers, and hyphens')
      return
    }

    // Check for leading/trailing hyphens or consecutive hyphens
    if (slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
      setSlugStatus('invalid')
      setSlugError('Slug cannot start or end with a hyphen, or have consecutive hyphens')
      return
    }

    setSlugStatus('checking')
    setSlugError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (queryError) {
        console.error('Error checking slug:', queryError)
        setSlugStatus('idle')
        return
      }

      if (data) {
        setSlugStatus('taken')
        setSlugError('This URL slug is already taken')
      } else {
        setSlugStatus('available')
        setSlugError(null)
      }
    } catch (err) {
      console.error('Error checking slug availability:', err)
      setSlugStatus('idle')
    }
  }, [])

  // Debounced slug checking
  useEffect(() => {
    if (!watchedSlug) {
      setSlugStatus('idle')
      setSlugError(null)
      return
    }

    const timeoutId = setTimeout(() => {
      checkSlugAvailability(watchedSlug)
    }, SLUG_CHECK_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [watchedSlug, checkSlugAvailability])

  // Determine if submit should be disabled
  const isSubmitDisabled = loading || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-white text-black overflow-x-hidden font-impact">
      {/* Left Side - Hero Image */}
      <div
        className="hidden lg:flex relative flex-col justify-between p-12"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(https://lh3.googleusercontent.com/aida-public/AB6AXuCFsn3wJg1-1q7X3u8Apw5Wr7B1EzW8rO5bVkM6Mkzy_j19gDNxV0Su-EFf98FRyT0G61exfr2cxwJoSHBqcx5VtmCy-07taKOKXPZ8r9n-2PAyCQbgCh-wSvCDBAVW9ExYX_J92ijdSzP-0Mz91LNIPkCbV2EbB754mkdjN4eBFSjRDP2E3w-Gn_gEqU7p0dloj-1CVystVtDRE7F40aEEtqFtmqlhPy1r-Rwxwb_fRJizcjcuzoKKwGtHSrEsjMjNe_Rr85PAW8s)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex items-center gap-3 text-white">
          <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
          </svg>
          <span className="text-xl font-black tracking-tighter uppercase">YouthSports</span>
        </div>
        <div className="max-w-md">
          <div className="text-white/40 font-bold uppercase tracking-widest text-xs mb-4">The Standard of Youth Sports</div>
          <h2 className="text-white text-4xl font-black uppercase italic tracking-tighter">Powering the next generation of athletes.</h2>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="bg-white flex flex-col justify-center px-12 lg:px-24 py-16 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <header className="mb-12">
            <h1 className="text-7xl lg:text-8xl uppercase mb-2 font-black" style={{ lineHeight: '0.9', letterSpacing: '-0.05em' }}>
              Organization Setup
            </h1>
            <p className="text-slate-500 font-medium text-lg">Define your identity. Set the standard.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-6">
              {/* Organization Name */}
              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Organization Name
                </label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Organization name is required' }}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full py-4 bg-transparent border-none px-0 text-xl font-bold placeholder:text-slate-300 focus:outline-none"
                      placeholder="e.g. NORTH SHORE ACADEMY"
                      type="text"
                      style={{ boxShadow: 'none' }}
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Type and Slug */}
              <div className="grid grid-cols-2 gap-8">
                {/* Organization Type */}
                <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                  <Controller
                    name="org_type"
                    control={control}
                    rules={{ required: 'Organization type is required' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold appearance-none cursor-pointer focus:outline-none"
                        style={{ boxShadow: 'none' }}
                      >
                        <option value="">Select</option>
                        <option value="club">CLUB</option>
                        <option value="school">SCHOOL</option>
                        <option value="academy">ACADEMY</option>
                        <option value="league">LEAGUE</option>
                        <option value="aau">AAU</option>
                      </select>
                    )}
                  />
                  {errors.org_type && (
                    <p className="text-xs text-red-600 mt-1">{errors.org_type.message}</p>
                  )}
                </div>

                {/* Slug */}
                <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Slug</label>
                  <Controller
                    name="slug"
                    control={control}
                    rules={{
                      required: 'Slug is required',
                      minLength: {
                        value: 3,
                        message: 'Slug must be at least 3 characters',
                      },
                      pattern: {
                        value: /^[a-z0-9-]+$/,
                        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
                      },
                    }}
                    render={({ field }) => (
                      <div className="flex items-center">
                        <span className="text-slate-400 font-bold text-sm">th.io/</span>
                        <input
                          {...field}
                          className="flex-1 py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none"
                          placeholder="your-name"
                          type="text"
                          onChange={(e) => {
                            // Auto-lowercase and remove invalid characters
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                            field.onChange(value)
                          }}
                          style={{ boxShadow: 'none' }}
                        />
                        {/* Status indicator */}
                        {slugStatus === 'checking' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-black ml-2"></div>
                        )}
                        {slugStatus === 'available' && (
                          <span className="material-symbols-outlined text-emerald-500 ml-2 text-lg">check_circle</span>
                        )}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                          <span className="material-symbols-outlined text-red-500 ml-2 text-lg">error</span>
                        )}
                      </div>
                    )}
                  />
                  {(errors.slug || slugError) && (
                    <p className="text-xs text-red-600 mt-1">{slugError || errors.slug?.message}</p>
                  )}
                  {slugStatus === 'available' && !errors.slug && (
                    <p className="text-xs text-emerald-600 mt-1">This slug is available!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-6 pt-4">
              {/* Primary Contact Email */}
              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Primary Contact Email
                </label>
                <Controller
                  name="contact_email"
                  control={control}
                  rules={{
                    required: 'Contact email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none"
                      placeholder="admin@organization.com"
                      type="email"
                      style={{ boxShadow: 'none' }}
                    />
                  )}
                />
                {errors.contact_email && (
                  <p className="text-xs text-red-600 mt-1">{errors.contact_email.message}</p>
                )}
              </div>

              {/* Office Location */}
              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Office Location
                </label>
                <Controller
                  name="office_location"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none"
                      placeholder="CITY, STATE"
                      type="text"
                      style={{ boxShadow: 'none' }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-black hover:bg-zinc-900 text-white font-black uppercase tracking-widest py-6 px-8 transition-all active:scale-[0.98] text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {loading ? 'Creating...' : 'Continue to License'}
              </button>
              <p className="mt-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Step 1 of 4 • Identity & Compliance
              </p>
            </div>
          </form>

          {/* Footer */}
          <footer className="mt-16 flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
            >
              Cancel Setup
            </button>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-slate-300 cursor-help hover:text-black transition-colors">help</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
