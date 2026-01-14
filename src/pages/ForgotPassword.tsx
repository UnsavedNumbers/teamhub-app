import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { resetPassword } = useAuth()

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
    <div className="flex min-h-screen font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Left side - Hero Image (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Empty sports stadium at dusk"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EioYyXup8hWypN337Pbn_TYldQzX6pJ4B-XzTwJNpPYzGkJM01_RX7voFn-WqPfzeKYEV3uehlCj6Ydm2kjcJgKhzjTJFk4ivzAGO71ShxUz2s0urAT6vdIuo1L6WOCPkjK_G3zgt7Ydml45W9KGChFKid43FWMrIDJEQ3Mo6QfpKjlwuFkFyCV5TwbqkBBH-M_0Uqg9OViXz-ry9d9HkTPPNWa7E6D153LVwiEQyYTbFEZdVULTK-loC4YTy2yXfn98L3Y0F-Q"
        />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <h2 className="font-display text-5xl text-white tracking-wider mb-4">
            Reset Your Password
          </h2>
          <p className="text-xl text-slate-200 max-w-lg leading-relaxed">
            Don't worry, it happens to the best of us. We'll help you get back into your account.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">sports_score</span>
            </div>
            <span className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">TEAMHUB</span>
          </div>

          {success ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                  mark_email_read
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Check your email
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                We've sent a password reset link to <strong className="text-slate-900 dark:text-white">{email}</strong>. 
                Please check your inbox and follow the instructions.
              </p>
              <div className="space-y-4">
                <Link
                  to="/portal/login"
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
                >
                  Back to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="text-sm text-primary hover:text-blue-500 font-semibold"
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Forgot your password?
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              {/* Form */}
              <div className="mt-10">
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label 
                      htmlFor="email" 
                      className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                    >
                      Email Address
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
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>

                {/* Back to sign in link */}
                <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Remember your password?{' '}
                    <Link to="/login" className="font-semibold leading-6 text-primary hover:text-blue-500">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-auto pt-10 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              © 2024 TeamHub Professional Sports Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
