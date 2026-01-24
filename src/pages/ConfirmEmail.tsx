import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { getSetupOrganizationFlag } from '../utils/setupOrganization'
import { AUTH_HERO_IMAGES } from '../utils/authImages'

interface ConfirmEmailState {
  email?: string
  returnTo?: string
  setupOrganization?: boolean
}

export default function ConfirmEmail() {
  const location = useLocation()
  const state = location.state as ConfirmEmailState | null
  const { resolvedTheme } = useTheme()
  const [heroImage, setHeroImage] = useState<string>('')
  const [logoVersion] = useState(0)

  // Check for org setup intent from both state and localStorage
  const isOrgSetupFlow =
    state?.setupOrganization === true ||
    state?.returnTo === '/admin/onboarding' ||
    getSetupOrganizationFlag()

  const email = state?.email

  // Select random hero image on mount
  useEffect(() => {
    if (AUTH_HERO_IMAGES.length > 0) {
      const randomImage = AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
      setHeroImage(randomImage)
    }
  }, [])

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

      {/* Left side - Form Content */}
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

          <div className="flex-1 flex flex-col justify-center">
            {/* Verification Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#137fec]/10 text-[#137fec] text-[10px] font-black uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">mail_outline</span>
                VERIFICATION SENT
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white mb-4 font-impact">
              CHECK YOUR EMAIL
            </h1>

            {/* Description */}
            <p className="text-lg font-light tracking-wide text-slate-500 dark:text-slate-400 mb-8">
              {email ? (
                <>
                  We&apos;ve sent a confirmation link to{' '}
                  <strong className="text-slate-900 dark:text-white">{email}</strong>.
                  {' '}Please click the link to verify your account.
                </>
              ) : (
                <>
                  We&apos;ve sent a confirmation link to your email. Please click the link to verify your account.
                </>
              )}
            </p>

            {/* Organization Setup Info Box */}
            {isOrgSetupFlow && (
              <div className="mb-8 p-4 rounded-xl flex items-center gap-3 text-sm bg-[#137fec]/10 border border-[#137fec]/20">
                <span className="material-symbols-outlined text-[#137fec]">info</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-1 text-slate-900 dark:text-white font-impact">ORGANIZATION SETUP</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    After confirming your email, you&apos;ll be redirected to complete your organization setup.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <Link
                to="/portal/login"
                className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 font-black text-sm tracking-widest uppercase w-full flex items-center justify-center hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300"
              >
                BACK TO LOGIN
              </Link>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Didn&apos;t receive the email? Check your spam folder or try again in 2 minutes.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              © {new Date().getFullYear()} YOUTHSPORTS PROFESSIONAL SPORTS MANAGEMENT
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Hero Image */}
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
            VERIFY YOUR ACCOUNT
          </h2>
          <p className="text-lg font-light tracking-wide text-white/80 max-w-lg leading-relaxed">
            We&apos;ve sent you a confirmation email. Click the link to activate your account and get started.
          </p>
        </div>
      </div>
    </div>
  )
}
