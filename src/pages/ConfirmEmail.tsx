import { useLocation, Link } from 'react-router-dom'
import { getSetupOrganizationFlag } from '../utils/setupOrganization'

interface ConfirmEmailState {
  email?: string
  returnTo?: string
  setupOrganization?: boolean
}

export default function ConfirmEmail() {
  const location = useLocation()
  const state = location.state as ConfirmEmailState | null

  // Check for org setup intent from both state and localStorage
  const isOrgSetupFlow =
    state?.setupOrganization === true ||
    state?.returnTo === '/admin/onboarding' ||
    getSetupOrganizationFlag()

  const email = state?.email

  return (
    <div className="min-h-screen flex items-stretch bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-sans">
      {/* Main Content Area */}
      <main className="w-full lg:w-[45%] flex flex-col justify-between p-8 lg:p-16 xl:p-24 bg-background-light dark:bg-[#121212] z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#5468FF] rounded-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">sports_volleyball</span>
          </div>
          <span className="text-xl font-black tracking-tighter uppercase dark:text-white">TeamHub</span>
        </div>

        <div className="max-w-md">
          <div className="mb-8">
            {/* Verification Badge */}
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#5468FF]/10 text-[#5468FF] text-xs font-bold uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined text-sm">mail_outline</span>
              Verification Sent
            </span>

            {/* Main Heading */}
            <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black italic uppercase mb-6 dark:text-white" style={{ letterSpacing: '-0.05em', lineHeight: '0.9', fontStyle: 'italic' }}>
              Check your<br />Email
            </h1>

            {/* Description */}
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              {email ? (
                <>
                  We&apos;ve sent a confirmation link to{' '}
                  <span className="font-bold text-slate-900 dark:text-white underline decoration-[#5468FF]">{email}</span>.
                  {' '}Please click the link to verify your account.
                </>
              ) : (
                <>
                  We&apos;ve sent a confirmation link to your email. Please click the link to verify your account.
                </>
              )}
            </p>
          </div>

          {/* Organization Setup Info Box */}
          {isOrgSetupFlow && (
            <div className="border-l-4 border-[#5468FF] bg-slate-100 dark:bg-zinc-900/50 p-6 mb-10">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#5468FF]">info</span>
                <div>
                  <h3 className="font-bold uppercase text-sm tracking-wider mb-1 dark:text-white">Organization Setup</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    After confirming your email, you&apos;ll be redirected to complete your organization setup.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <Link
              to="/portal/login"
              className="inline-block bg-slate-900 dark:bg-white text-white dark:text-black text-center font-black py-5 px-8 uppercase tracking-widest hover:bg-[#5468FF] dark:hover:bg-[#5468FF] dark:hover:text-white transition-all duration-300"
            >
              Back to Login
            </Link>
            <p className="text-xs text-slate-500 dark:text-zinc-500 text-center uppercase tracking-tighter">
              Didn&apos;t receive the email? Check your spam folder or try again in 2 minutes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-12">
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            Having trouble?{' '}
            <a className="text-[#5468FF] font-bold hover:underline" href="mailto:support@teamhub.com">
              Contact support
            </a>
          </p>
        </footer>
      </main>

      {/* Right Side - Stadium Background */}
      <aside className="hidden lg:block lg:flex-1 relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img
            alt="High-contrast stadium lighting at night"
            className="w-full h-full object-cover opacity-60 grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8j09nXAAIZCs8TsFUfhqUdRGrd0Fy0kN5WmdAnGPtc12Z_xDAr-wYqjGF9aaH7JcNy82GO8qULydSUQf_dE1vH8iCLvVXA7Cflctjl9ZSWLwkqxMxsZ61DnpiZUs5UTbmothGuJO_j2sSsROKNZBu02qDUW28vdd_zw_npLegMOoEKk-phBo5pEIQdt8Lq7m56W-Qs_aStU0Y3hs_brlvXn-wFo6pger4H0uiVnunzzR9DnYMJ7N34csYoOZvgFzBcnIxP76gsz4"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0A0A0A 0%, transparent 100%)' }}></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
            <img
              alt="Jersey texture overlay"
              className="w-full h-full"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnGd6NKc8iWgiveXIvL8PIOXFqD6jVVWn3CbHCUOT2cbei2E_6xdoWI13EO00Y2dACrZgvltyjqzCIIwqk8v7cOEGMnDJpNwtEeEoYoBzss4lNXG7wv2z2ANkSMBJ35bHXuQei_jJM5gQPoTKkms0sH1lYDB3gRNoBhpGCWKCSx5TCV88eFkPb-TIHxYKP9u8QHveH75llffQi_72QN6HXSMidCnyrYfXze4MyLIDz-KVUbW2lEmOkXqYYQURp0YTlUnGXx190QXE"
            />
          </div>
        </div>
        <div className="absolute bottom-16 right-16 z-10 text-right">
          <div className="text-[#5468FF] text-9xl font-black italic opacity-20 select-none">TEAMHUB</div>
          <div className="text-white text-xl font-bold tracking-[0.5em] uppercase opacity-40 mt-[-2rem]">Performance Portal</div>
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5468FF]/20 rounded-full blur-[120px] animate-pulse"></div>
      </aside>
    </div>
  )
}
