import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useLoadingState } from '../../contexts/LoadingStateContext'

interface FullScreenLoaderProps {
  message?: string
}

export default function FullScreenLoader({ message }: FullScreenLoaderProps) {
  const { isLoading } = useLoadingState()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const hasErrorRef = useRef(false)

  // Client-side only rendering to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleImageError = useCallback(() => {
    if (hasErrorRef.current) return // Already handled
    hasErrorRef.current = true
    setShowFallback(true)
  }, [])

  if (!mounted || !isLoading) {
    return null
  }

  const logoSrc = resolvedTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png'

  return (
    <div
      className="fixed inset-0 bg-background-light dark:bg-background-dark flex items-center justify-center"
      style={{ zIndex: 'var(--z-loader)' }}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading, please wait'}
    >
      <div className="flex flex-col items-center">
        {/* Large square logo graphic */}
        <div className="w-40 h-40 mb-8 flex items-center justify-center">
          {showFallback ? (
            <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center animate-pulse">
              <span className="material-symbols-rounded text-4xl text-slate-400 dark:text-slate-500">
                sports
              </span>
            </div>
          ) : (
            <img
              src={logoSrc}
              alt="Loading"
              className="w-32 h-32 object-contain"
              onError={handleImageError}
            />
          )}
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-progress-bar" />
        </div>

        {/* Optional message */}
        {message && (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        )}
      </div>
    </div>
  )
}
