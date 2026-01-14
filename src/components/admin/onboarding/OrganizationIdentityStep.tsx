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
    // Add overflow-x-hidden to prevent horizontal scrolling from decorative elements
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Banner Header - add overflow-hidden to constrain decorative circles */}
      <div
        className="h-48 w-full flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: '#137fec',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      >
        {/* Decorative circles - constrained within container */}
        <div
          className="absolute w-64 h-64 -top-32 -left-16 rounded-full border-2 border-white/10 pointer-events-none"
        ></div>
        <div
          className="absolute w-96 h-96 -bottom-48 -right-16 rounded-full border-2 border-white/10 pointer-events-none"
        ></div>
        
        <div className="z-10 text-center">
          <div className="flex items-center justify-center gap-3 text-white mb-2">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                fill="currentColor"
              ></path>
              <path
                clipRule="evenodd"
                d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
            <span className="text-2xl font-black tracking-tight">TeamHub</span>
          </div>
          <p className="text-white/80 font-medium">Professional Season Registration</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center -mt-12 px-6 pb-24 relative z-20">
        <div className="max-w-4xl w-full">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            {/* Organization Identity Section */}
            <div className="p-10 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: '#137fec' }}>
                  <span className="material-symbols-outlined">corporate_fare</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Organization Identity</h2>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={onSubmit} className="grid gap-8">
                {/* Organization Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Organization Name
                  </label>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Organization name is required' }}
                    render={({ field }) => (
                      <input
                        {...field}
                        className="text-2xl font-bold border-none bg-slate-50 dark:bg-slate-800/50 rounded-xl px-6 py-4 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="e.g. North Shore Youth Basketball"
                        type="text"
                      />
                    )}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                  )}
                </div>

                {/* Organization Type and Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Organization Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Organization Type
                    </label>
                    <Controller
                      name="org_type"
                      control={control}
                      rules={{ required: 'Organization type is required' }}
                      render={({ field }) => (
                        <div className="relative group">
                          <select
                            {...field}
                            className="w-full appearance-none bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-6 py-4 pr-10 font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Select Type</option>
                            <option value="school">School</option>
                            <option value="club">Club</option>
                            <option value="league">League</option>
                            <option value="academy">Academy</option>
                            <option value="aau">AAU</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <span className="material-symbols-outlined">expand_more</span>
                          </div>
                        </div>
                      )}
                    />
                    <div className="flex gap-4 mt-1 px-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="material-symbols-outlined text-sm">school</span> School
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="material-symbols-outlined text-sm">groups</span> Club
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="material-symbols-outlined text-sm">stars</span> Academy
                      </div>
                    </div>
                    {errors.org_type && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.org_type.message}</p>
                    )}
                  </div>

                  {/* Public Profile URL */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Public Profile URL
                    </label>
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
                        <div 
                          className={`flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-6 py-4 border-2 transition-all ${
                            slugStatus === 'taken' || slugStatus === 'invalid'
                              ? 'border-red-400 dark:border-red-500'
                              : slugStatus === 'available'
                              ? 'border-emerald-400 dark:border-emerald-500'
                              : 'border-transparent focus-within:border-primary/20'
                          }`}
                        >
                          <span className="text-slate-400 font-medium">youthsports.team/</span>
                          <input
                            {...field}
                            className="flex-1 bg-transparent border-none p-0 font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 text-primary focus:outline-none focus:ring-0"
                            placeholder="your-slug"
                            type="text"
                            onChange={(e) => {
                              // Auto-lowercase and remove invalid characters
                              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                              field.onChange(value)
                            }}
                          />
                          {/* Status indicator */}
                          {slugStatus === 'checking' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-primary ml-2"></div>
                          )}
                          {slugStatus === 'available' && (
                            <span className="material-symbols-outlined text-emerald-500 ml-2">check_circle</span>
                          )}
                          {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                            <span className="material-symbols-outlined text-red-500 ml-2">error</span>
                          )}
                        </div>
                      )}
                    />
                    {/* Live preview */}
                    <p className="text-xs text-slate-400 mt-1 italic px-1">
                      Live preview:{' '}
                      <span className="font-medium text-primary">
                        youthsports.team/{watchedSlug || 'your-slug'}
                      </span>
                    </p>
                    {/* Slug validation errors */}
                    {(errors.slug || slugError) && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {slugError || errors.slug?.message}
                      </p>
                    )}
                    {slugStatus === 'available' && !errors.slug && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        This slug is available!
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Contact Details Section */}
            <div className="p-10 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                  <span className="material-symbols-outlined">contact_mail</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Contact Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Office Location
                  </label>
                  <Controller
                    name="office_location"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Street Address"
                        type="text"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Support Email
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
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="hello@organization.com"
                        type="email"
                      />
                    )}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.contact_email.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex justify-between items-center px-4">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#137fec' }}></span>
              <span className="text-sm font-medium">Step 1 of 2: Identity Setup</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={onSubmit}
                disabled={isSubmitDisabled}
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{ 
                  backgroundColor: isSubmitDisabled ? '#94a3b8' : '#137fec',
                  boxShadow: isSubmitDisabled ? 'none' : '0 20px 25px -5px rgba(19, 127, 236, 0.3), 0 10px 10px -5px rgba(19, 127, 236, 0.2)'
                }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Creating...
                  </>
                ) : slugStatus === 'checking' ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Checking availability...
                  </>
                ) : (
                  <>
                    <span>Continue to license</span>
                    <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Help Button */}
      <button 
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition-colors group"
      >
        <span className="material-symbols-outlined">question_mark</span>
        <div className="absolute right-full mr-4 bg-slate-800 text-white text-xs py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
          Need help setting up your org?
        </div>
      </button>
    </div>
  )
}
