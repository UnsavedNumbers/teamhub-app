import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  const { updatePassword, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a valid session from the reset link
    if (!session) {
      // User might need to wait for the session to be established from the URL hash
      const errorParams = new URLSearchParams(window.location.search)
      
      if (errorParams.get('error')) {
        setTokenValid(false)
        setError(errorParams.get('error_description') || 'Invalid or expired reset link')
      }
    }
  }, [session])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/portal/dashboard')
      }, 3000)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' }
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (pwd.length < 8) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
    if (pwd.length < 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { label: 'Good', color: 'bg-blue-500', width: '75%' }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { label: 'Strong', color: 'bg-green-500', width: '100%' }
    }
    return { label: 'Good', color: 'bg-blue-500', width: '75%' }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="flex min-h-screen font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Left side - Hero Image (hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Empty sports stadium"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EioYyXup8hWypN337Pbn_TYldQzX6pJ4B-XzTwJNpPYzGkJM01_RX7voFn-WqPfzeKYEV3uehlCj6Ydm2kjcJgKhzjTJFk4ivzAGO71ShxUz2s0urAT6vdIuo1L6WOCPkjK_G3zgt7Ydml45W9KGChFKid43FWMrIDJEQ3Mo6QfpKjlwuFkFyCV5TwbqkBBH-M_0Uqg9OViXz-ry9d9HkTPPNWa7E6D153LVwiEQyYTbFEZdVULTK-loC4YTy2yXfn98L3Y0F-Q"
        />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <h2 className="font-display text-5xl text-white tracking-wider mb-4">
            Secure Your Account
          </h2>
          <p className="text-xl text-slate-200 max-w-lg leading-relaxed">
            Choose a strong password to keep your Youth Sports account safe and secure.
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
            <span className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">YOUTH SPORTS</span>
          </div>

          {!tokenValid ? (
            /* Invalid Token State */
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                  error
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Link Expired
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {error || 'This password reset link has expired or is invalid. Please request a new one.'}
              </p>
              <Link
                to="/portal/forgot-password"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
              >
                Request New Link
              </Link>
            </div>
          ) : success ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                  check_circle
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Password Updated!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Your password has been successfully reset. You'll be redirected to the dashboard shortly.
              </p>
              <Link
                to="/portal/dashboard"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Set new password
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Your new password must be at least 8 characters long.
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
                  {/* New Password */}
                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                    >
                      New Password
                    </label>
                    <div className="mt-2 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="auth-input pr-10"
                      />
                      <button 
                        type="button" 
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
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
                        <p className="text-xs mt-1 text-slate-500">
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300"
                    >
                      Confirm New Password
                    </label>
                    <div className="mt-2 relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="auth-input pr-10"
                      />
                      <button 
                        type="button" 
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
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

                  <div>
                    <button
                      type="submit"
                      disabled={loading || (password !== confirmPassword && confirmPassword.length > 0)}
                      className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-auto pt-10 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              © 2024 Youth Sports Professional Sports Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
