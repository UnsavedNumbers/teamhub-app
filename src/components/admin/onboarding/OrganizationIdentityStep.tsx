import { useState, useCallback, useEffect } from 'react'
import { Control, FieldErrors, Controller } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { AUTH_HERO_IMAGES } from '../../../utils/authImages'

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
  const [heroImage, setHeroImage] = useState<string>('')
  const [imageError, setImageError] = useState(false)

  // Select random hero image on mount
  useEffect(() => {
    if (AUTH_HERO_IMAGES.length > 0) {
      const randomImage = AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
      setHeroImage(randomImage)
    }
  }, [])

  // Prevent horizontal scrolling
  useEffect(() => {
    const originalOverflowX = document.body.style.overflowX
    document.body.style.overflowX = 'hidden'
    return () => {
      document.body.style.overflowX = originalOverflowX
    }
  }, [])

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

  const heroBackgroundStyle = heroImage && !imageError
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-screen bg-white text-black overflow-x-hidden">
      {/* Left side - Hero Image */}
      <div
        className="relative flex flex-col justify-between p-12 hidden lg:block bg-slate-900"
        style={heroBackgroundStyle}
      >
        {/* Youth Sports Logo */}
        <div className="flex items-center gap-3 text-white">
          <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
          </svg>
          <span className="text-xl font-black tracking-tighter uppercase font-impact">Youth Sports</span>
        </div>

        {/* Tagline */}
        <div className="max-w-md">
          <div className="text-white/40 font-bold uppercase tracking-widest text-xs mb-4">The Standard of Youth Sports</div>
          <h2 className="text-white text-4xl font-black uppercase italic tracking-tighter font-impact">Powering the next generation of athletes.</h2>
        </div>

        {/* Hidden image for error handling */}
        {heroImage && !imageError && (
          <img
            src={heroImage}
            alt=""
            className="hidden"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Right side - Form */}
      <div className="bg-white flex flex-col justify-center px-12 lg:px-24 py-16 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <header className="mb-12">
            <h1 className="text-7xl lg:text-8xl uppercase mb-2 font-black leading-[0.9] tracking-[-0.05em] font-impact">
              Organization Setup
            </h1>
            <p className="text-slate-500 font-medium text-lg">Define your identity. Set the standard.</p>
          </header>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">
            <div className="space-y-6">
              {/* Organization Name */}
              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Organization Name
                      </label>
                      <input
                        {...field}
                        className="w-full py-4 bg-transparent border-none px-0 text-xl font-bold placeholder:text-slate-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
                        placeholder="e.g. NORTH SHORE ACADEMY"
                        type="text"
                      />
                      {errors.name && (
                        <div className="text-red-600 text-xs mt-1">{errors.name.message}</div>
                      )}
                    </>
                  )}
                />
              </div>

              {/* Type and Slug */}
              <div className="grid grid-cols-2 gap-8">
                <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                  <Controller
                    name="org_type"
                    control={control}
                    rules={{ required: 'Type is required' }}
                    render={({ field }) => (
                      <>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Type
                        </label>
                        <select
                          {...field}
                          value={field.value || ''}
                          className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold appearance-none cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
                        >
                          <option value="">Select...</option>
                          <option value="club">CLUB</option>
                          <option value="school">SCHOOL</option>
                          <option value="academy">ACADEMY</option>
                          <option value="league">LEAGUE</option>
                          <option value="aau">AAU</option>
                        </select>
                        {errors.org_type && (
                          <div className="text-red-600 text-xs mt-1">{errors.org_type.message}</div>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                  <Controller
                    name="slug"
                    control={control}
                    rules={{ required: 'Slug is required' }}
                    render={({ field }) => (
                      <>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Slug
                        </label>
                        <div className="flex items-center">
                          <span className="text-slate-400 font-bold text-sm">youthsports.team/teams/</span>
                          <input
                            {...field}
                            className="flex-1 py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
                            placeholder="your-name"
                            type="text"
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                              field.onChange(val)
                            }}
                          />
                        </div>
                        {slugError && (
                          <div className="text-red-600 text-xs mt-1">{slugError}</div>
                        )}
                        {errors.slug && !slugError && (
                          <div className="text-red-600 text-xs mt-1">{errors.slug.message}</div>
                        )}
                        {slugStatus === 'checking' && (
                          <div className="text-slate-400 text-xs mt-1">Checking...</div>
                        )}
                        {slugStatus === 'available' && (
                          <div className="text-green-600 text-xs mt-1 font-bold">AVAILABLE</div>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Contact Email and Office Location */}
            <div className="space-y-6 pt-4">
              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <Controller
                  name="contact_email"
                  control={control}
                  rules={{ required: 'Email is required' }}
                  render={({ field }) => (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Primary Contact Email
                      </label>
                      <input
                        {...field}
                        className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
                        placeholder="admin@organization.com"
                        type="email"
                      />
                      {errors.contact_email && (
                        <div className="text-red-600 text-xs mt-1">{errors.contact_email.message}</div>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="group border-b-2 border-slate-200 transition-colors focus-within:border-black">
                <Controller
                  name="office_location"
                  control={control}
                  render={({ field }) => (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Office Location
                      </label>
                      <input
                        {...field}
                        className="w-full py-4 bg-transparent border-none px-0 text-lg font-bold placeholder:text-slate-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
                        placeholder="CITY, STATE"
                        type="text"
                      />
                    </>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-black hover:bg-zinc-900 text-white font-black uppercase tracking-widest py-6 px-8 transition-all active:scale-[0.98] text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '20px' }}>
                      sync
                    </span>
                    Loading...
                  </>
                ) : (
                  'Continue to License'
                )}
              </button>
              <p className="mt-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Step 1 of 2 • Identity & Compliance
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
