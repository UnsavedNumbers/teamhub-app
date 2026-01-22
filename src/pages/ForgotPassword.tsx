import { useState, FormEvent, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { AUTH_HERO_IMAGES } from '../utils/authImages'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [heroImage, setHeroImage] = useState<string>('')

  const { resetPassword } = useAuth()
  const { resolvedTheme } = useTheme()
  const [logoVersion, setLogoVersion] = useState(0)

  // Select random hero image on mount
  useEffect(() => {
    if (AUTH_HERO_IMAGES.length > 0) {
      const randomImage = AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
      setHeroImage(randomImage)
    }
  }, [])

  // Update logo version when theme changes to force reload
  useEffect(() => {
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPassword(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
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
            RESET YOUR PASSWORD
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed">
            Don&apos;t worry, it happens to the best of us. We&apos;ll help you get back into your account.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50 overflow-hidden">
        <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col min-h-0">
          {/* Logo */}
          <div className="mb-8 pt-4">
            <img 
              key={resolvedTheme}
              src={`${resolvedTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png'}?theme=${resolvedTheme}&v=${logoVersion}`}
              alt="YouthSports" 
              className="h-24 w-auto object-contain"
            />
          </div>

          {success ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">
                  mark_email_read
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-4 font-impact">
                CHECK YOUR EMAIL
              </h2>
              <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400 mb-8">
                We&apos;ve sent a password reset link to <strong className="text-slate-900 dark:text-white">{email}</strong>. 
                Please check your inbox and follow the instructions.
              </p>
              <div className="space-y-4">
                <Link
                  to="/portal/login"
                  className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide w-full flex items-center justify-center transition-colors"
                >
                  BACK TO SIGN IN
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="text-sm text-[#137fec] hover:text-[#137fec]/80 font-bold transition-colors"
                >
                  TRY A DIFFERENT EMAIL
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-2 font-impact">
                  FORGOT YOUR PASSWORD?
                </h2>
                <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400">
                  No worries! Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'SENDING...' : 'SEND RESET LINK'}
                  </button>
                </div>
              </form>

              {/* Back to sign in link */}
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Remember your password?{' '}
                  <Link to="/portal/login" className="font-bold text-[#137fec] hover:text-[#137fec]/80 transition-colors">
                    SIGN IN
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-auto pt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              © {new Date().getFullYear()} YOUTHSPORTS PROFESSIONAL SPORTS MANAGEMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
